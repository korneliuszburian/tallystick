import type { CapturedProcess, GitDiffDigest } from "./types.js";

function refs(argv: readonly string[]): { base: string; head: string } {
  const values = argv.filter((value) => !value.startsWith("-"));
  return { base: values.at(-2) ?? "", head: values.at(-1) ?? "" };
}

export function gitDiffDigest(process: CapturedProcess): GitDiffDigest {
  const bytes = Buffer.from(process.stdout);
  const text = bytes.toString("utf8");
  const tokens = text.split("\0");
  const summaries: GitDiffDigest["file_summaries"][number][] = [];
  const stats = new Map<string, { additions: number | null; deletions: number | null }>();
  const binary = new Set<string>();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    const stat = token.match(/^(\d+|-)\t(\d+|-)\t(.*)$/s);
    if (stat) {
      const path = stat[3] || (tokens[index + 1] ?? "");
      if (stat[1] === "-" || stat[2] === "-") binary.add(path);
      stats.set(path, { additions: stat[1] === "-" ? null : Number(stat[1]), deletions: stat[2] === "-" ? null : Number(stat[2]) });
      continue;
    }
    const raw = token.match(/^:[0-7]{6}\s+[0-7]{6}\s+[0-9a-f]+\s+[0-9a-f]+\s+([AMDRCT])(\d+)?$/i);
    if (!raw) continue;
    const status = raw[1]! as "A" | "M" | "D" | "R" | "C" | "T";
    const first = tokens[index + 1] ?? "";
    const second = status === "R" || status === "C" ? tokens[index + 2] ?? "" : null;
    const path = second ?? first;
    const statValue = stats.get(path) ?? stats.get(first) ?? { additions: null, deletions: null };
    summaries.push({
      path, old_path: second === null ? null : first, status,
      additions: statValue.additions, deletions: statValue.deletions,
      patch_source: { event_id: process.rawEventId, blob_hash: process.stdoutReceipt.hash, stream: "file", byte_start: 0, byte_end: process.stdoutReceipt.bytes },
    });
  }

  if (summaries.length === 0) {
    for (const [path, value] of stats) {
      summaries.push({
        path, old_path: null, status: "M", additions: value.additions, deletions: value.deletions,
        patch_source: { event_id: process.rawEventId, blob_hash: process.stdoutReceipt.hash, stream: "file", byte_start: 0, byte_end: process.stdoutReceipt.bytes },
      });
    }
  }
  const { base, head } = refs(process.request.argv);
  return {
    kind: "git-diff", adapter_version: "git-diff/v1", raw_event_id: process.rawEventId, receipt_id: process.rawEventId,
    capture_complete: process.stdoutReceipt.complete && process.stderrReceipt.complete,
    parser_status: process.exitCode === 0 ? "recognized" : summaries.length > 0 ? "partial" : "unknown",
    omitted_count: 0, truncated: false, unknown_fragment: null, base, head,
    files_changed: summaries.length,
    additions: summaries.reduce((sum, item) => sum + (item.additions ?? 0), 0),
    deletions: summaries.reduce((sum, item) => sum + (item.deletions ?? 0), 0),
    file_summaries: summaries, binary_files: [...binary],
  };
}
