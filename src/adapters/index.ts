import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { BlobReceipt, Json } from "../ledger/index.js";
import { compilerDigest } from "./compiler.js";
import { gitDiffDigest } from "./git-diff.js";
import { measureDependencies, shellDigest } from "./shell.js";
import { testRunnerDigest } from "./test-runner.js";
import type {
  AcquisitionAdapters, AcquisitionResult, AdapterOptions, CapturedProcess,
  ExecutionPermit, ExecutionRequest, TypedDigest,
} from "./types.js";

function bytes(value: Uint8Array): AsyncIterable<Uint8Array> {
  return (async function* () { yield value; })();
}

function boundedUnknown(process: CapturedProcess): { excerpt: string; source: { event_id: string; blob_hash: string; stream: "stdout" | "stderr"; byte_start: number; byte_end: number } } {
  const useStderr = process.stderrReceipt.bytes > 0;
  const raw = useStderr ? process.stderr : process.stdout;
  const receipt = useStderr ? process.stderrReceipt : process.stdoutReceipt;
  const stream = useStderr ? "stderr" as const : "stdout" as const;
  const length = Math.min(receipt.bytes, 512);
  return {
    excerpt: Buffer.from(raw).subarray(0, length).toString("utf8"),
    source: { event_id: process.rawEventId, blob_hash: receipt.hash, stream, byte_start: 0, byte_end: length },
  };
}

function enforceDigestLimit(digest: TypedDigest, limit: number, process: CapturedProcess): TypedDigest {
  let current: TypedDigest = digest.parser_status === "unknown" && digest.unknown_fragment === null
    ? { ...digest, unknown_fragment: boundedUnknown(process) }
    : digest;
  if (Buffer.byteLength(JSON.stringify(current), "utf8") <= limit) return current;

  const unknown = current.unknown_fragment;
  if (unknown !== null) {
    const shortened = { ...unknown, excerpt: Buffer.from(unknown.excerpt, "utf8").subarray(0, 128).toString("utf8") };
    current = { ...current, unknown_fragment: shortened, truncated: true, omitted_count: current.omitted_count + 1 } as TypedDigest;
  }

  if (current.kind === "shell") {
    current = { ...current, salient_errors: current.salient_errors.slice(0, 1), warning_signatures: current.warning_signatures.slice(0, 2), truncated: true, omitted_count: current.omitted_count + Math.max(0, current.salient_errors.length - 1) + Math.max(0, current.warning_signatures.length - 2) };
  } else if (current.kind === "test-runner") {
    current = { ...current, failed_tests: current.failed_tests.slice(0, 1), failure_signatures: current.failure_signatures.slice(0, 2), truncated: true, omitted_count: current.omitted_count + Math.max(0, current.failed_tests.length - 1) + Math.max(0, current.failure_signatures.length - 2) };
  } else if (current.kind === "compiler") {
    current = { ...current, diagnostics: current.diagnostics.slice(0, 1), affected_files: current.affected_files.slice(0, 2), truncated: true, omitted_count: current.omitted_count + Math.max(0, current.diagnostics.length - 1) + Math.max(0, current.affected_files.length - 2) };
  } else {
    current = { ...current, file_summaries: current.file_summaries.slice(0, 1), binary_files: current.binary_files.slice(0, 2), truncated: true, omitted_count: current.omitted_count + Math.max(0, current.file_summaries.length - 1) + Math.max(0, current.binary_files.length - 2) };
  }

  if (Buffer.byteLength(JSON.stringify(current), "utf8") > limit) throw new Error("digest exceeds configured byte limit");
  return current;
}

async function run(request: ExecutionRequest): Promise<{ exitCode: number | null; signal: string | null; durationMs: number; stdout: Uint8Array; stderr: Uint8Array }> {
  return await new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(request.executable, [...request.argv], {
      cwd: request.cwd,
      env: { ...process.env, ...request.environment },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, request.timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(Buffer.from(chunk)));
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        signal: timedOut ? "TIMEOUT" : signal,
        durationMs: Date.now() - started,
        stdout: new Uint8Array(Buffer.concat(stdout)),
        stderr: new Uint8Array(Buffer.concat(stderr)),
      });
    });
  });
}

export function createAdapters(options: AdapterOptions): AcquisitionAdapters {
  return {
    async execute(request: ExecutionRequest, permit: ExecutionPermit): Promise<AcquisitionResult> {
      options.verifyAndConsumePermit(request, permit);
      const before = request.kind === "shell" ? await measureDependencies(request) : {};
      const result = await run(request);
      const after = request.kind === "shell" ? await measureDependencies(request) : {};

      const stdoutReceipt = await options.ledger.archive(bytes(result.stdout));
      const stderrReceipt = await options.ledger.archive(bytes(result.stderr));
      const rawEventId = randomUUID();
      const stdoutStream = request.kind === "git-diff" ? "file" as const : "stdout" as const;
      const payload: Json = {
        requestId: request.requestId,
        reservationId: permit.reservationId,
        adapterKind: request.kind,
        exit_code: result.exitCode,
        termination_signal: result.signal,
      };
      options.ledger.append({
        eventId: rawEventId,
        sessionId: request.sessionId,
        correlationId: request.goalId,
        kind: "tool_output",
        sourceTimestamp: new Date().toISOString(),
        payload,
        blobs: [
          { hash: stdoutReceipt.hash, complete: stdoutReceipt.complete, stream: stdoutStream },
          { hash: stderrReceipt.hash, complete: stderrReceipt.complete, stream: "stderr" },
        ],
      });

      const processCapture: CapturedProcess = {
        request,
        exitCode: result.exitCode,
        signal: result.signal,
        durationMs: result.durationMs,
        stdout: result.stdout,
        stderr: result.stderr,
        rawEventId,
        stdoutReceipt,
        stderrReceipt,
      };
      let digest: TypedDigest;
      switch (request.kind) {
        case "shell": digest = shellDigest(processCapture, before, after); break;
        case "test-runner": digest = testRunnerDigest(processCapture); break;
        case "compiler": digest = compilerDigest(processCapture); break;
        case "git-diff": digest = gitDiffDigest(processCapture); break;
      }
      digest = enforceDigestLimit(digest, options.digestByteLimit, processCapture);
      if (options.ledger.getEvent(digest.receipt_id) === undefined) throw new Error("digest receipt is not resolvable");
      return { digest, rawEventId, rawBlobs: [stdoutReceipt, stderrReceipt] as readonly BlobReceipt[] };
    },
  };
}

export type {
  AcquisitionAdapters, AcquisitionResult, AdapterKind, CompilerDigest, DigestMeta,
  ExecutionPermit, ExecutionRequest, GitDiffDigest, ShellDigest, TestRunnerDigest,
  TypedDigest,
} from "./types.js";
