import type { DiffFile, DiffHunk, DiffLine } from "../shared/review";

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

/** Parses `git diff` / `gh pr diff` output into files, hunks and numbered lines. */
export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      file = { path: "", oldPath: null, status: "modified", binary: false, additions: 0, deletions: 0, hunks: [] };
      files.push(file);
      hunk = null;
      const [a, b] = pathsOf(raw);
      file.path = b;
      if (a !== b) file.oldPath = a;
      continue;
    }
    if (!file) continue;
    if (!hunk) {
      if (raw.startsWith("new file mode")) file.status = "added";
      else if (raw.startsWith("deleted file mode")) file.status = "deleted";
      else if (raw.startsWith("rename from ")) file.status = "renamed";
      else if (raw.startsWith("Binary files")) file.binary = true;
      else if (raw.startsWith("+++ ") && raw !== "+++ /dev/null") file.path = raw.slice(4).replace(/^b\//, "");
      else if (raw.startsWith("--- ") && raw !== "--- /dev/null" && file.status === "renamed") file.oldPath = raw.slice(4).replace(/^a\//, "");
    }
    const header = HUNK.exec(raw);
    if (header) {
      oldNo = Number(header[1]);
      newNo = Number(header[3]);
      hunk = { header: raw, lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    if (raw.startsWith("\\")) continue; // "\ No newline at end of file"
    const line = toLine(raw, oldNo, newNo);
    if (!line) continue;
    hunk.lines.push(line);
    if (line.kind !== "add") oldNo += 1;
    if (line.kind !== "del") newNo += 1;
    if (line.kind === "add") file.additions += 1;
    if (line.kind === "del") file.deletions += 1;
  }
  return files;
}

function toLine(raw: string, oldNo: number, newNo: number): DiffLine | null {
  const marker = raw[0];
  const text = raw.slice(1);
  if (marker === "+") return { kind: "add", text, oldNo: null, newNo };
  if (marker === "-") return { kind: "del", text, oldNo, newNo: null };
  if (marker === " " || raw === "") return { kind: "ctx", text, oldNo, newNo };
  return null;
}

/** "diff --git a/x b/y" → ["x", "y"]; paths with spaces are rare enough to split on " b/". */
function pathsOf(header: string): [string, string] {
  const rest = header.slice("diff --git ".length);
  const split = rest.indexOf(" b/");
  if (split === -1) return [rest, rest];
  return [rest.slice(2, split), rest.slice(split + 3)];
}

/** Whether GitHub accepts an inline comment there: the line must be part of a hunk on that side. */
export function isLineInDiff(files: DiffFile[], target: { path: string; side: "LEFT" | "RIGHT"; line: number }): boolean {
  const file = files.find((candidate) => candidate.path === target.path);
  if (!file) return false;
  return file.hunks.some((hunk) =>
    hunk.lines.some((line) => (target.side === "LEFT" ? line.kind !== "add" && line.oldNo === target.line : line.kind !== "del" && line.newNo === target.line)),
  );
}
