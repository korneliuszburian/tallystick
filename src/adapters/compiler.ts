import type { CapturedProcess, CompilerDigest } from "./types.js";
import { commandPreview } from "./shell.js";

function source(process: CapturedProcess, stream: "stdout" | "stderr", text: string, index: number, length: number) {
  const receipt = stream === "stdout" ? process.stdoutReceipt : process.stderrReceipt;
  return {
    event_id: process.rawEventId, blob_hash: receipt.hash, stream,
    byte_start: Buffer.byteLength(text.slice(0, index), "utf8"),
    byte_end: Buffer.byteLength(text.slice(0, index + length), "utf8"),
  } as const;
}

export function compilerDigest(process: CapturedProcess): CompilerDigest {
  const outputs = [
    { stream: "stdout" as const, text: Buffer.from(process.stdout).toString("utf8") },
    { stream: "stderr" as const, text: Buffer.from(process.stderr).toString("utf8") },
  ];
  const diagnostics: CompilerDigest["diagnostics"][number][] = [];
  const regex = /^(.*?)(?:\((\d+),(\d+)\))?:\s*(error|warning)\s+(TS\d+):\s*([\s\S]*?)(?=\n(?=.*?(?:\(\d+,\d+\))?:\s*(?:error|warning)\s+TS\d+:)|$)/gm;
  for (const output of outputs) {
    for (const match of output.text.matchAll(regex)) {
      const full = match[0]; const index = match.index ?? 0;
      diagnostics.push({
        severity: match[4] === "warning" ? "warning" : "error",
        code: match[5] ?? null,
        file: (match[1] ?? "").trim() || null,
        line: match[2] ? Number(match[2]) : null,
        column: match[3] ? Number(match[3]) : null,
        message: (match[6] ?? "").trim().replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ""),
        source: source(process, output.stream, output.text, index, full.length),
      });
    }
  }
  const recognized = diagnostics.length > 0 || process.exitCode === 0;
  const errorCount = recognized ? diagnostics.filter((item) => item.severity === "error").length : null;
  const warningCount = recognized ? diagnostics.filter((item) => item.severity === "warning").length : null;
  return {
    kind: "compiler", adapter_version: "compiler/tsc-v1", raw_event_id: process.rawEventId, receipt_id: process.rawEventId,
    capture_complete: process.stdoutReceipt.complete && process.stderrReceipt.complete,
    parser_status: recognized ? "recognized" : "unknown", omitted_count: 0, truncated: false, unknown_fragment: null,
    compiler: process.request.executable, command: commandPreview(process.request), exit_code: process.exitCode,
    error_count: errorCount, warning_count: warningCount, diagnostics,
    affected_files: [...new Set(diagnostics.flatMap((item) => item.file === null ? [] : [item.file]))],
    compiled_epoch: process.request.goalId,
  };
}
