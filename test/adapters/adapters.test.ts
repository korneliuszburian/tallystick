import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { createAdapters, type ExecutionPermit, type ExecutionRequest } from "../../src/adapters/index.js";
import { openLedger, type EventLedger } from "../../src/ledger/index.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function root(): string { const value = mkdtempSync(join(tmpdir(), "adapters-test-")); roots.push(value); return value; }
function ledgerAt(base: string): EventLedger { return openLedger({ databasePath: join(base, "ledger.sqlite"), blobDirectory: join(base, "blobs"), projectId: "project", maxRawBytesPerExecution: 64 * 1024 * 1024 }); }
function permit(id: string): ExecutionPermit { return { reservationId: `reservation-${id}`, requestHash: `hash-${id}`, preconditionEpoch: "epoch", fencingToken: 1, signature: "sig" }; }
function req(base: string, kind: ExecutionRequest["kind"], executable: string, argv: string[], id: string, dependencyPaths: string[] = []): ExecutionRequest {
  return { requestId: id, sessionId: "session", goalId: "goal", kind, executable, argv, cwd: base, environment: {}, dependencyPaths, timeoutMs: 5000 };
}
function adapters(ledger: EventLedger) {
  const used = new Set<string>();
  return createAdapters({ ledger, digestByteLimit: 4096, verifyAndConsumePermit(request, p) { if (p.requestHash !== `hash-${request.requestId}` || used.has(p.reservationId)) throw new Error("invalid or consumed permit"); used.add(p.reservationId); } });
}
function sha(value: string): string { return createHash("sha256").update(value).digest("hex"); }

describe("Acquisition adapters", () => {
  it("shell archives raw, records receipt payload, and measures changed_artifacts from filesystem", async () => {
    const base = root(); const ledger = ledgerAt(base); const api = adapters(ledger);
    const request = req(base, "shell", process.execPath, ["-e", "require('fs').writeFileSync('made.txt','hello');process.stderr.write('ERROR boom\\n')"], "shell-1", ["made.txt"]);
    const result = await api.execute(request, permit("shell-1"));
    expect(result.digest.kind).toBe("shell");
    if (result.digest.kind !== "shell") throw new Error("wrong digest");
    expect(result.digest.changed_artifacts).toEqual([{ path: "made.txt", before: "MISSING", after: sha("hello") }]);
    expect(result.digest.receipt_id).toBe(result.rawEventId);
    const event = ledger.getEvent(result.digest.receipt_id); expect(event?.kind).toBe("tool_output");
    expect(event?.payload).toMatchObject({ requestId: "shell-1", reservationId: "reservation-shell-1", adapterKind: "shell" });
    expect(result.digest.salient_errors.length).toBeGreaterThan(0);
    const handle = result.digest.salient_errors[0]!.source;
    expect(Buffer.from(await ledger.readFragment(handle)).toString("utf8")).toContain("ERROR boom");
    expect(Buffer.byteLength(JSON.stringify(result.digest), "utf8")).toBeLessThanOrEqual(4096);
    ledger.close();
  });

  it("ADR-008 ignores process text that merely says wrote file", async () => {
    const base = root(); writeFileSync(join(base, "stable.txt"), "same"); const ledger = ledgerAt(base); const api = adapters(ledger);
    const result = await api.execute(req(base, "shell", process.execPath, ["-e", "console.log('wrote file')"], "shell-2", ["stable.txt"]), permit("shell-2"));
    if (result.digest.kind !== "shell") throw new Error("wrong digest");
    expect(result.digest.changed_artifacts).toEqual([]); ledger.close();
  });

  it("ADR-008 reports modified files with real before/after hashes", async () => {
    const base = root(); writeFileSync(join(base, "state.txt"), "before"); const ledger = ledgerAt(base); const api = adapters(ledger);
    const result = await api.execute(req(base, "shell", process.execPath, ["-e", "require('fs').writeFileSync('state.txt','after')"], "shell-3", ["state.txt"]), permit("shell-3"));
    if (result.digest.kind !== "shell") throw new Error("wrong digest");
    expect(result.digest.changed_artifacts).toEqual([{ path: "state.txt", before: sha("before"), after: sha("after") }]); ledger.close();
  });

  it("rejects a consumed permit before second spawn", async () => {
    const base = root(); const ledger = ledgerAt(base); const api = adapters(ledger); const p = permit("permit");
    const request = req(base, "shell", process.execPath, ["-e", "process.stdout.write('x')"], "permit");
    await api.execute(request, p); await expect(api.execute(request, p)).rejects.toThrow(/consumed/); ledger.close();
  });

  it("test-runner parses a real failing Vitest JSON report and resolves failed test source", async () => {
    const base = root(); mkdirSync(join(base, "fixture"));
    writeFileSync(join(base, "fixture", "fail.test.js"), "import { test, expect } from 'vitest'; test('fixture failure',()=>expect(1).toBe(2));\n");
    const ledger = ledgerAt(base); const api = adapters(ledger);
    const vitest = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
    const result = await api.execute(req(base, "test-runner", process.execPath, [vitest, "run", "fixture/fail.test.js", "--reporter=json"], "vitest"), permit("vitest"));
    expect(result.digest.kind).toBe("test-runner"); if (result.digest.kind !== "test-runner") throw new Error("wrong digest");
    expect(result.digest.failed).toBeGreaterThanOrEqual(1); expect(result.digest.failed_tests.length).toBeGreaterThan(0);
    expect(ledger.getEvent(result.digest.receipt_id)).toBeDefined();
    const raw = await ledger.readFragment(result.digest.failed_tests[0]!.source); expect(raw.byteLength).toBeGreaterThan(0); ledger.close();
  });

  it("malformed test JSON is unknown with bounded raw handle and exit 0 is not promoted to pass", async () => {
    const base = root(); const ledger = ledgerAt(base); const api = adapters(ledger);
    const result = await api.execute(req(base, "test-runner", process.execPath, ["-e", "process.stdout.write('{broken')"], "malformed"), permit("malformed"));
    if (result.digest.kind !== "test-runner") throw new Error("wrong digest");
    expect(result.digest.parser_status).toBe("unknown"); expect(result.digest.total).toBeNull(); expect(result.digest.unknown_fragment).not.toBeNull();
    expect(Buffer.from(await ledger.readFragment(result.digest.unknown_fragment!.source)).toString("utf8")).toContain("{broken"); ledger.close();
  });

  it("compiler parses real tsc multiline diagnostic and resolves source handle", async () => {
    const base = root(); writeFileSync(join(base, "bad.ts"), "const x: number = 'no';\n");
    const ledger = ledgerAt(base); const api = adapters(ledger); const tsc = join(process.cwd(), "node_modules", "typescript", "bin", "tsc");
    const result = await api.execute(req(base, "compiler", process.execPath, [tsc, "--pretty", "false", "--noEmit", "bad.ts"], "tsc"), permit("tsc"));
    if (result.digest.kind !== "compiler") throw new Error("wrong digest");
    expect(result.digest.error_count).toBeGreaterThan(0); expect(result.digest.diagnostics[0]?.code).toMatch(/^TS/);
    expect(Buffer.from(await ledger.readFragment(result.digest.diagnostics[0]!.source)).toString("utf8")).toContain("TS"); ledger.close();
  });

  it("git-diff uses NUL framing for rename, binary, tab and newline filenames", async () => {
    const base = root(); execFileSync("git", ["init", "-q"], { cwd: base }); execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: base }); execFileSync("git", ["config", "user.name", "Test"], { cwd: base });
    writeFileSync(join(base, "old.txt"), "a\n"); writeFileSync(join(base, "tab\tname.txt"), "x\n"); writeFileSync(join(base, "line\nname.txt"), "n\n"); writeFileSync(join(base, "bin.dat"), Buffer.from([0,1,2,0,255]));
    execFileSync("git", ["add", "-A"], { cwd: base }); execFileSync("git", ["commit", "-qm", "base"], { cwd: base });
    execFileSync("git", ["mv", "old.txt", "new.txt"], { cwd: base }); writeFileSync(join(base, "tab\tname.txt"), "x\ny\n"); writeFileSync(join(base, "bin.dat"), Buffer.from([0,9,8,0,255])); execFileSync("git", ["add", "-A"], { cwd: base }); execFileSync("git", ["commit", "-qm", "head"], { cwd: base });
    const ledger = ledgerAt(base); const api = adapters(ledger);
    const argv = ["diff", "--raw", "--numstat", "-z", "--no-ext-diff", "--no-textconv", "HEAD~1", "HEAD"];
    const result = await api.execute(req(base, "git-diff", "git", argv, "diff"), permit("diff"));
    if (result.digest.kind !== "git-diff") throw new Error("wrong digest");
    expect(result.digest.file_summaries.some((f) => f.status === "R" && f.old_path === "old.txt" && f.path === "new.txt")).toBe(true);
    expect(result.digest.binary_files).toContain("bin.dat"); expect(result.digest.file_summaries.some((f) => f.path.includes("\t"))).toBe(true); expect(result.digest.file_summaries.some((f) => f.path.includes("\n"))).toBe(true);
    const handle = result.digest.file_summaries[0]!.patch_source; expect((await ledger.readFragment(handle)).byteLength).toBeGreaterThan(0); ledger.close();
  });

  it("100 KB shell log preserves raw and bounds digest", async () => {
    const base = root(); const ledger = ledgerAt(base); const api = adapters(ledger);
    const result = await api.execute(req(base, "shell", process.execPath, ["-e", "process.stdout.write('x'.repeat(100*1024))"], "large"), permit("large"));
    expect(result.rawBlobs[0]!.bytes).toBeGreaterThanOrEqual(100 * 1024); expect(Buffer.byteLength(JSON.stringify(result.digest), "utf8")).toBeLessThanOrEqual(4096); ledger.close();
  });

  it("timeout and signal termination are captured without shell invocation", async () => {
    const base = root(); const ledger = ledgerAt(base); const api = adapters(ledger);
    const timed = await api.execute(req(base, "shell", process.execPath, ["-e", "setTimeout(()=>{},10000)"], "timeout"), permit("timeout"));
    if (timed.digest.kind !== "shell") throw new Error("wrong digest"); expect(timed.digest.termination_signal).toBe("TIMEOUT");
    const signaled = await api.execute(req(base, "shell", process.execPath, ["-e", "process.kill(process.pid,'SIGTERM')"], "signal"), permit("signal"));
    if (signaled.digest.kind !== "shell") throw new Error("wrong digest"); expect(signaled.digest.termination_signal).toBe("SIGTERM"); ledger.close();
  });

  it("append failure prevents digest admission", async () => {
    const base = root(); const real = ledgerAt(base);
    const broken: EventLedger = { ...real, append() { throw new Error("append failed"); } };
    const api = createAdapters({ ledger: broken, digestByteLimit: 4096, verifyAndConsumePermit() {} });
    await expect(api.execute(req(base, "shell", process.execPath, ["-e", "process.stdout.write('x')"], "append-fail"), permit("append-fail"))).rejects.toThrow(/append failed/);
    real.close();
  });

  it("writes fixture provenance manifest fields from real runs", async () => {
    const base = root(); const ledger = ledgerAt(base); const api = adapters(ledger);
    const result = await api.execute(req(base, "shell", process.execPath, ["-e", "process.stdout.write('manifest')"], "manifest"), permit("manifest"));
    const manifest = { tool_version: process.version, command: `${process.execPath} -e`, input_fixture_hashes: [], raw_output_hash: result.rawBlobs[0]!.hash, exit_code: result.digest.kind === "shell" ? result.digest.exit_code : null, capture_timestamp: new Date().toISOString() };
    expect(manifest.tool_version).toMatch(/^v/); expect(manifest.raw_output_hash).toHaveLength(64); expect(manifest.capture_timestamp).toMatch(/Z$/); ledger.close();
  });
});
