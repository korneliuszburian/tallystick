import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { CapturedProcess, ExecutionRequest, ShellDigest } from "./types.js";

const VERSION = "shell/v1";
export function sha256(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
export function commandPreview(request: ExecutionRequest): string {
  const text = [request.executable, ...request.argv].join(" ");
  return Buffer.byteLength(text, "utf8") <= 512 ? text : Buffer.from(text, "utf8").subarray(0, 509).toString("utf8") + "...";
}
export function argsHash(request: ExecutionRequest): string {
  return sha256(JSON.stringify({ executable: request.executable, argv: request.argv }));
}
export async function fileHash(cwd: string, path: string): Promise<string | "MISSING"> {
  try { return sha256(await readFile(isAbsolute(path) ? path : resolve(cwd, path))); }
  catch { return "MISSING"; }
}
export async function measureDependencies(request: ExecutionRequest): Promise<Readonly<Record<string, string | "MISSING">>> {
  const pairs = await Promise.all(request.dependencyPaths.map(async (path) => [path, await fileHash(request.cwd, path)] as const));
  return Object.fromEntries(pairs);
}
function handle(process: CapturedProcess, stream: "stdout" | "stderr", start: number, end: number) {
  const receipt = stream === "stdout" ? process.stdoutReceipt : process.stderrReceipt;
  return { event_id: process.rawEventId, blob_hash: receipt.hash, stream, byte_start: start, byte_end: end } as const;
}
export function shellDigest(process: CapturedProcess, before: Readonly<Record<string, string | "MISSING">>, after: Readonly<Record<string, string | "MISSING">>): ShellDigest {
  const stderrText = Buffer.from(process.stderr).toString("utf8");
  const stdoutText = Buffer.from(process.stdout).toString("utf8");
  const candidates: { text: string; stream: "stdout" | "stderr"; offset: number }[] = [];
  for (const [text, stream] of [[stderrText, "stderr"], [stdoutText, "stdout"]] as const) {
    let charOffset = 0;
    for (const line of text.split(/(?<=\n)/)) {
      const clean = line.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").trimEnd();
      if (/\b(error|fatal|failed|exception)\b/i.test(clean)) {
        candidates.push({ text: clean.slice(0, 512), stream, offset: Buffer.byteLength(text.slice(0, charOffset), "utf8") });
      }
      charOffset += line.length;
      if (candidates.length >= 8) break;
    }
  }
  const salient_errors = candidates.map((item) => {
    const bytes = Buffer.byteLength(item.text, "utf8");
    return { signature: sha256(item.text), code: null, excerpt: item.text, source: handle(process, item.stream, item.offset, item.offset + bytes) };
  });
  const warning_signatures = [...stderrText.matchAll(/^.*\bwarning\b.*$/gim)].slice(0, 8).map((match) => sha256(match[0]));
  const changed_artifacts = process.request.dependencyPaths.flatMap((path) => before[path] !== after[path]
    ? [{ path, before: before[path] ?? "MISSING", after: after[path] ?? "MISSING" }]
    : []);
  return {
    kind: "shell", adapter_version: VERSION, raw_event_id: process.rawEventId, receipt_id: process.rawEventId,
    capture_complete: process.stdoutReceipt.complete && process.stderrReceipt.complete,
    parser_status: "recognized", omitted_count: 0, truncated: false,
    command: commandPreview(process.request), normalized_args_hash: argsHash(process.request),
    exit_code: process.exitCode, termination_signal: process.signal, duration_ms: process.durationMs,
    stdout_bytes: process.stdoutReceipt.bytes, stderr_bytes: process.stderrReceipt.bytes,
    salient_errors, warning_signatures, changed_artifacts,
  };
}
