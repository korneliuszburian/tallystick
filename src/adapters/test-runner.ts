import type { CapturedProcess, TestRunnerDigest } from "./types.js";
import { commandPreview, sha256 } from "./shell.js";

type VitestJson = {
  numTotalTests?: number; numPassedTests?: number; numFailedTests?: number; numPendingTests?: number;
  testResults?: Array<{ name?: string; assertionResults?: Array<{ ancestorTitles?: string[]; title?: string; status?: string; failureMessages?: string[] }> }>;
};

export function testRunnerDigest(process: CapturedProcess): TestRunnerDigest {
  const stdout = Buffer.from(process.stdout).toString("utf8");
  let report: VitestJson | null = null;
  try { report = JSON.parse(stdout) as VitestJson; } catch { report = null; }
  const recognized = report !== null && typeof report.numTotalTests === "number";
  const totals = recognized ? {
    total: report!.numTotalTests ?? null,
    passed: report!.numPassedTests ?? null,
    failed: report!.numFailedTests ?? null,
    skipped: report!.numPendingTests ?? null,
  } : { total: null, passed: null, failed: null, skipped: null };
  let parser_status: TestRunnerDigest["parser_status"] = recognized ? "recognized" : "unknown";
  if (recognized && ((process.exitCode === 0 && (totals.failed ?? 0) > 0) || (process.exitCode !== 0 && totals.failed === 0))) parser_status = "partial";
  const failed_tests: TestRunnerDigest["failed_tests"][number][] = [];
  if (recognized) {
    for (const file of report!.testResults ?? []) {
      for (const assertion of file.assertionResults ?? []) {
        if (assertion.status !== "failed") continue;
        const name = [...(assertion.ancestorTitles ?? []), assertion.title ?? ""].filter(Boolean).join(" > ");
        const marker = assertion.failureMessages?.[0] ?? name;
        const idx = stdout.indexOf(assertion.title ?? name);
        const start = idx >= 0 ? Buffer.byteLength(stdout.slice(0, idx), "utf8") : 0;
        const end = idx >= 0 ? start + Buffer.byteLength(assertion.title ?? name, "utf8") : Math.min(process.stdoutReceipt.bytes, 256);
        failed_tests.push({
          test_id: sha256(`${file.name ?? ""}\0${name}`), file: file.name ?? "", name,
          signature: sha256(marker),
          source: { event_id: process.rawEventId, blob_hash: process.stdoutReceipt.hash, stream: "stdout", byte_start: start, byte_end: end },
        });
      }
    }
  }
  return {
    kind: "test-runner", adapter_version: "test-runner/vitest-json-v1", raw_event_id: process.rawEventId, receipt_id: process.rawEventId,
    capture_complete: process.stdoutReceipt.complete && process.stderrReceipt.complete, parser_status,
    omitted_count: 0, truncated: false, unknown_fragment: null, framework: "vitest", command: commandPreview(process.request), exit_code: process.exitCode,
    ...totals, failed_tests, failure_signatures: failed_tests.map((item) => item.signature), duration_ms: process.durationMs,
    tested_epoch: process.request.goalId,
    test_fingerprint: sha256(JSON.stringify({ executable: process.request.executable, argv: process.request.argv, cwd: process.request.cwd })),
  };
}
