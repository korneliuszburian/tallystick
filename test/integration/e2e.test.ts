import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAdapters, type ExecutionRequest } from "../../src/adapters/index.js";
import { canonical, createFailureGate } from "../../src/guards/index.js";
import { createLedgerMiddleware } from "../../src/index.js";
import { openLedger, type EventLedger } from "../../src/ledger/index.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function root(prefix = "ledger-e2e-"): string { const value = mkdtempSync(join(tmpdir(), prefix)); roots.push(value); return value; }
function repoAt(base: string): string {
  const repo = join(base, "repo"); mkdirSync(repo); execFileSync("git", ["init", "-q", repo]);
  writeFileSync(join(repo, "state.txt"), "one\n"); return repo;
}
function middlewareAt(base: string, repo: string, raw = 64 * 1024 * 1024) {
  return createLedgerMiddleware({ repositoryRoot: repo, databasePath: join(base, "ledger.sqlite"), blobDirectory: join(base, "blobs"), digestByteLimit: 4096, maxRawBytesPerExecution: raw });
}
function request(repo: string, id: string, argv: string[]): ExecutionRequest {
  return { requestId: id, sessionId: "session", goalId: "goal", kind: "shell", executable: process.execPath, argv, cwd: repo, environment: {}, dependencyPaths: ["state.txt"], timeoutMs: 3000 };
}
function ledgerAt(base: string, raw = 64 * 1024 * 1024): EventLedger {
  return openLedger({ databasePath: join(base, "ledger.sqlite"), blobDirectory: join(base, "blobs"), projectId: "e2e", maxRawBytesPerExecution: raw });
}
function verifier(ledger: EventLedger, signingKey: string) {
  return (candidate: ExecutionRequest, permit: { reservationId: string; requestHash: string; preconditionEpoch: string; fencingToken: number; signature: string }) => {
    const { signature, ...unsigned } = permit;
    const expected = createHmac("sha256", signingKey).update(canonical({ schema: "execution-permit/v1", ...unsigned }), "utf8").digest();
    const actual = Buffer.from(signature, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("invalid permit");
    ledger.transactionImmediate(db => {
      const changed = db.prepare("UPDATE reservations SET status='started' WHERE id=? AND request_hash=? AND fencing_token=? AND status='reserved'")
        .run(permit.reservationId, permit.requestHash, permit.fencingToken);
      if (changed.changes !== 1) throw new Error("consumed permit");
      ledger.append({ eventId: `started-${candidate.requestId}`, sessionId: candidate.sessionId, correlationId: candidate.goalId, kind: "tool_started", sourceTimestamp: new Date().toISOString(), payload: { requestId: candidate.requestId, reservationId: permit.reservationId }, blobs: [] });
    });
  };
}

async function archive(ledger: EventLedger, value: Uint8Array, complete = true) {
  if (complete) return ledger.archive((async function* () { yield value; })());
  return ledger.archive((async function* () { yield value; throw new Error("capture interrupted"); })());
}

describe("R.5 middleware integration", () => {
  it("tool loop executes once, then blocks equivalent failures and returns a resolvable receipt", async () => {
    const base = root(); const repo = repoAt(base); const api = middlewareAt(base, repo);
    const failing = { kind: "shell" as const, executable: process.execPath, argv: ["-e", "process.stderr.write('KNOWN_FAILURE\\n');process.exit(7)"], cwd: repo, dependencyPaths: ["state.txt"], timeoutMs: 3000 };
    const first = await api.intercept({ ...failing, requestId: "one" });
    expect(first.decision).toBe("EXECUTED");
    if (first.decision !== "EXECUTED") throw new Error("expected execution");
    expect(first.receipt.execution_id).toBe(first.rawEventId);
    expect(first.receipt.capture_completeness).toBe(true);
    const second = await api.intercept({ ...failing, requestId: "two" });
    const third = await api.intercept({ ...failing, requestId: "three" });
    expect(second.decision).toBe("BLOCK"); expect(third.decision).toBe("BLOCK");
    if (third.decision !== "BLOCK") throw new Error("expected block");
    expect(third.previousFailureId).toBeTruthy();
    expect(api.executionCountForEquivalentRequest(failing)).toBe(1);
    await api.close();
  });

  it("two concurrent equivalent proposals cannot bypass reservation/failure gating", async () => {
    const base = root(); const repo = repoAt(base); const api = middlewareAt(base, repo);
    const failing = { kind: "shell" as const, executable: process.execPath, argv: ["-e", "setTimeout(()=>process.exit(9),80)"], cwd: repo, dependencyPaths: ["state.txt"], timeoutMs: 3000 };
    const [a, b] = await Promise.all([api.intercept({ ...failing, requestId: "a" }), api.intercept({ ...failing, requestId: "b" })]);
    expect([a.decision, b.decision].sort()).toEqual(["BLOCK", "EXECUTED"]);
    expect(api.executionCountForEquivalentRequest(failing)).toBe(1);
    await api.close();
  });

  it("stale memory and 100 KiB raw use fresh state and bounded context-facing digest", async () => {
    const base = root(); const repo = repoAt(base); const api = middlewareAt(base, repo);
    const e1 = await api.computeStateEpoch(); const memory = api.fileMemoryFromEpoch("state.txt", e1);
    expect(await api.revalidateMemory(memory, e1)).toBe("active");
    writeFileSync(join(repo, "state.txt"), "two\n"); const e2 = await api.computeStateEpoch();
    expect(e2.epoch_id).not.toBe(e1.epoch_id); expect(await api.revalidateMemory(memory, e2)).toBe("stale");
    const large = await api.intercept({ requestId: "large", kind: "shell", executable: process.execPath, argv: ["-e", "process.stdout.write('x'.repeat(100*1024))"], cwd: repo, dependencyPaths: [], timeoutMs: 3000 });
    expect(large.decision).toBe("EXECUTED"); if (large.decision !== "EXECUTED") throw new Error("expected execution");
    expect((await api.readRawStdout(large.rawEventId)).byteLength).toBe(100 * 1024);
    expect(Buffer.byteLength(JSON.stringify(large.digest), "utf8")).toBeLessThanOrEqual(4096);
    expect(JSON.stringify(large.digest)).not.toContain("x".repeat(100 * 1024));
    await api.close();
  });
});

describe("S.3 chaos and recovery boundaries", () => {
  it("child process death is captured as evidence, never a false success", async () => {
    const base = root(); const repo = repoAt(base); const ledger = ledgerAt(base); const key = randomBytes(32).toString("hex"); const gate = createFailureGate({ ledger, signingKey: key });
    const req = request(repo, "sigkill", ["-e", "process.kill(process.pid, 'SIGKILL')"]); const pre = gate.preflight({ request: req, preconditionEpoch: "epoch" });
    expect(pre.decision).toBe("ALLOW"); if (pre.decision !== "ALLOW") throw new Error("allow expected");
    const adapters = createAdapters({ ledger, digestByteLimit: 4096, verifyAndConsumePermit: verifier(ledger, key) }); const result = await adapters.execute(req, pre.permit);
    expect(result.digest.kind).toBe("shell"); if (result.digest.kind !== "shell") throw new Error("shell expected");
    expect(result.digest.termination_signal).toBe("SIGKILL"); expect(result.digest.exit_code).toBeNull();
    expect(ledger.getEvent(result.rawEventId)?.capture_status).toBe("complete"); ledger.close();
  });

  it("broker crash after spawn is UNKNOWN across reopen and cannot auto-retry", () => {
    const base = root(); const repo = repoAt(base); const key = randomBytes(32).toString("hex"); let ledger = ledgerAt(base); let gate = createFailureGate({ ledger, signingKey: key });
    const req = request(repo, "unknown-one", ["-e", "require('fs').writeFileSync('effect.txt','once')"]); const pre = gate.preflight({ request: req, preconditionEpoch: "epoch" });
    expect(pre.decision).toBe("ALLOW"); if (pre.decision !== "ALLOW") throw new Error("allow expected");
    verifier(ledger, key)(req, pre.permit);
    ledger.transactionImmediate(db => {
      db.prepare("UPDATE reservations SET status='unknown' WHERE id=? AND status='started'").run(pre.permit.reservationId);
      ledger.append({ eventId: "unknown-event", sessionId: req.sessionId, correlationId: req.goalId, kind: "execution_unknown", sourceTimestamp: new Date().toISOString(), payload: { actionKey: pre.permit.requestHash, reservationId: pre.permit.reservationId }, blobs: [] });
    });
    ledger.close(); ledger = ledgerAt(base); gate = createFailureGate({ ledger, signingKey: key });
    const retry = gate.preflight({ request: { ...req, requestId: "unknown-two" }, preconditionEpoch: "epoch" });
    expect(retry.decision).toBe("BLOCK"); if (retry.decision !== "BLOCK") throw new Error("block expected");
    expect(retry.reason).toContain("UNKNOWN"); expect(ledger.scan({ kind: "tool_output", limit: 100 }).length).toBe(0); ledger.close();
  });

  it("capture crash preserves partial bytes but creates no tool_output receipt", async () => {
    const base = root(); repoAt(base); const ledger = ledgerAt(base, 4096); const receipt = await archive(ledger, Buffer.from("partial"), false);
    expect(receipt.complete).toBe(false); expect(Buffer.from(await ledger.readBlob(receipt.hash)).toString()).toBe("partial");
    expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0); ledger.close();
  });

  it("blob-seal/commit crash leaves an orphan blob, never a success receipt", async () => {
    const base = root(); repoAt(base); const ledger = ledgerAt(base); const receipt = await archive(ledger, Buffer.from("sealed-but-uncommitted"));
    const orphan = ledger.transactionImmediate(db => db.prepare("SELECT COUNT(*) AS n FROM blobs b LEFT JOIN event_blobs eb ON eb.blob_hash=b.hash WHERE b.hash=? AND eb.blob_hash IS NULL").get(receipt.hash) as { n: number });
    expect(orphan.n).toBe(1); expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0); ledger.close();
  });

  it("missing blob invalidates source admission after reopen", async () => {
    const base = root(); const repo = repoAt(base); const api = middlewareAt(base, repo); const result = await api.intercept({ requestId: "missing", kind: "shell", executable: process.execPath, argv: ["-e", "process.stdout.write('evidence')"], cwd: repo, dependencyPaths: [], timeoutMs: 3000 });
    expect(result.decision).toBe("EXECUTED"); if (result.decision !== "EXECUTED") throw new Error("execution expected"); const eventId = result.rawEventId; await api.close();
    const ledger = ledgerAt(base); const event = ledger.getEvent(eventId); expect(event).toBeDefined(); const hash = event!.raw_blob_hashes[0]!; ledger.close(); unlinkSync(join(base, "blobs", hash));
    const reopened = middlewareAt(base, repo); await expect(reopened.readRawStdout(eventId)).rejects.toThrow(/missing blob/); await reopened.close();
  });

  it("disk-full style storage failure is fail-closed and emits no success receipt", async () => {
    if (process.platform === "win32") return;
    const base = root(); repoAt(base); const blocked = join(base, "blocked"); mkdirSync(blocked); chmodSync(blocked, 0o500);
    let ledger: EventLedger | undefined;
    try {
      ledger = openLedger({ databasePath: join(base, "disk.sqlite"), blobDirectory: blocked, projectId: "disk", maxRawBytesPerExecution: 4096 });
      await expect(archive(ledger, Buffer.from("cannot-persist"))).rejects.toThrow();
      expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0);
    } finally { ledger?.close(); chmodSync(blocked, 0o700); }
  });

  it("intent, spawn, capture, seal and commit boundary states contain zero fabricated receipt events", async () => {
    const base = root(); const repo = repoAt(base); const ledger = ledgerAt(base); const key = randomBytes(32).toString("hex"); const gate = createFailureGate({ ledger, signingKey: key });
    const req = request(repo, "boundary", ["-e", "process.exit(0)"]); const pre = gate.preflight({ request: req, preconditionEpoch: "epoch" });
    expect(pre.decision).toBe("ALLOW"); if (pre.decision !== "ALLOW") throw new Error("allow expected");
    ledger.append({ eventId: "intent", sessionId: req.sessionId, correlationId: req.goalId, kind: "tool_proposal", sourceTimestamp: new Date().toISOString(), payload: { requestId: req.requestId }, blobs: [] });
    expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0);
    verifier(ledger, key)(req, pre.permit); expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0);
    const partial = await archive(ledger, Buffer.from("capture"), false); expect(partial.complete).toBe(false); expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0);
    const sealed = await archive(ledger, Buffer.from("seal")); expect(sealed.complete).toBe(true); expect(ledger.scan({ kind: "tool_output", limit: 100 })).toHaveLength(0);
    ledger.append({ eventId: "raw-commit", sessionId: req.sessionId, correlationId: req.goalId, kind: "tool_output", sourceTimestamp: new Date().toISOString(), payload: { requestId: req.requestId, reservationId: pre.permit.reservationId }, blobs: [{ hash: sealed.hash, complete: true, stream: "stdout" }] });
    expect(ledger.getEvent("raw-commit")?.capture_status).toBe("complete");
    expect(ledger.scan({ kind: "execution_unknown", limit: 100 })).toHaveLength(0);
    // A committed raw event is evidence, not a fabricated separate receipt event.
    expect(ledger.scan({ kind: "tool_output", limit: 100 }).map(event => event.event_id)).toEqual(["raw-commit"]); ledger.close();
  });
});
