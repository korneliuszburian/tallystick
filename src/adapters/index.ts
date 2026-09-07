import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import type { BlobReceipt, EventLedger, Json } from "../ledger/index.js";
import { compilerDigest } from "./compiler.js";
import { gitDiffDigest } from "./git-diff.js";
import { measureDependencies, shellDigest } from "./shell.js";
import { testRunnerDigest } from "./test-runner.js";
import type {
  AcquisitionAdapters, AcquisitionResult, AdapterOptions, CapturedProcess,
  ExecutionPermit, ExecutionRequest, TypedDigest,
} from "./types.js";

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

function liveChunks(stream: Readable, onConsumerStop: () => void): AsyncIterable<Uint8Array> {
  return (async function* () {
    let ended = false;
    let errored = false;
    try {
      for await (const chunk of stream) yield new Uint8Array(Buffer.from(chunk));
      ended = true;
    } catch (error) {
      errored = true;
      throw error;
    } finally {
      // ledger.archive closes the iterator as soon as its configured raw cap is
      // reached. That close happens while the child is still running, so the
      // adapter can enforce ADR-017 without a second copy of the configured cap.
      if (!ended && !errored) onConsumerStop();
    }
  })();
}

async function runAndCapture(request: ExecutionRequest, ledger: EventLedger): Promise<{
  exitCode: number | null;
  signal: string | null;
  durationMs: number;
  stdoutReceipt: BlobReceipt;
  stderrReceipt: BlobReceipt;
  stdout: Uint8Array;
  stderr: Uint8Array;
}> {
  const started = Date.now();
  const child = spawn(request.executable, [...request.argv], {
    cwd: request.cwd,
    env: { ...process.env, ...request.environment },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (child.stdout === null || child.stderr === null) throw new Error("process capture streams are unavailable");

  let timedOut = false;
  let rawLimitExceeded = false;
  const stopForRawLimit = () => {
    if (rawLimitExceeded) return;
    rawLimitExceeded = true;
    child.kill("SIGTERM");
  };
  const timer = setTimeout(() => {
    if (rawLimitExceeded) return;
    timedOut = true;
    child.kill("SIGTERM");
  }, request.timeoutMs);

  const stdoutPromise = ledger.archive(liveChunks(child.stdout, stopForRawLimit));
  const stderrPromise = ledger.archive(liveChunks(child.stderr, stopForRawLimit));
  const closePromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });

  try {
    const [{ code, signal }, stdoutReceipt, stderrReceipt] = await Promise.all([
      closePromise,
      stdoutPromise,
      stderrPromise,
    ]);
    const [stdout, stderr] = await Promise.all([
      ledger.readBlob(stdoutReceipt.hash),
      ledger.readBlob(stderrReceipt.hash),
    ]);
    return {
      exitCode: code,
      signal: rawLimitExceeded ? "RAW_LIMIT_EXCEEDED" : timedOut ? "TIMEOUT" : signal,
      durationMs: Date.now() - started,
      stdoutReceipt,
      stderrReceipt,
      stdout,
      stderr,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createAdapters(options: AdapterOptions): AcquisitionAdapters {
  return {
    async execute(request: ExecutionRequest, permit: ExecutionPermit): Promise<AcquisitionResult> {
      options.verifyAndConsumePermit(request, permit);
      const before = request.kind === "shell" ? await measureDependencies(request) : {};
      const result = await runAndCapture(request, options.ledger);
      const after = request.kind === "shell" ? await measureDependencies(request) : {};

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
          { hash: result.stdoutReceipt.hash, complete: result.stdoutReceipt.complete, stream: stdoutStream },
          { hash: result.stderrReceipt.hash, complete: result.stderrReceipt.complete, stream: "stderr" },
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
        stdoutReceipt: result.stdoutReceipt,
        stderrReceipt: result.stderrReceipt,
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
      return { digest, rawEventId, rawBlobs: [result.stdoutReceipt, result.stderrReceipt] as readonly BlobReceipt[] };
    },
  };
}

export type {
  AcquisitionAdapters, AcquisitionResult, AdapterKind, CompilerDigest, DigestMeta,
  ExecutionPermit, ExecutionRequest, GitDiffDigest, ShellDigest, TestRunnerDigest,
  TypedDigest,
} from "./types.js";
