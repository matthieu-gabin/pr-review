import type { DiffFile, DiffLine, Finding } from "../shared/review";

/** One row of the virtualised list: the diff flattened so a finding can be scrolled to by index. */
export type Row =
  | { key: string; kind: "file"; file: DiffFile; open: boolean; findingCount: number }
  | { key: string; kind: "hunk"; header: string }
  | { key: string; kind: "line"; line: DiffLine }
  | { key: string; kind: "finding"; finding: Finding; detached: boolean }
  | { key: string; kind: "section"; title: string }
  | { key: string; kind: "path"; path: string };

export interface Rows {
  rows: Row[];
  /** Row index of every finding's card, in reading order. */
  findingRows: Map<string, number>;
}

export function buildRows(files: DiffFile[], findings: Finding[], collapsed: ReadonlySet<string>): Rows {
  const rows: Row[] = [];
  const findingRows = new Map<string, number>();
  for (const file of files) {
    const fileFindings = findings.filter((finding) => finding.path === file.path);
    const open = !collapsed.has(file.path);
    rows.push({ key: `file:${file.path}`, kind: "file", file, open, findingCount: fileFindings.length });
    if (!open) continue;
    file.hunks.forEach((hunk, hunkIndex) => {
      rows.push({ key: `hunk:${file.path}:${hunkIndex}`, kind: "hunk", header: hunk.header });
      hunk.lines.forEach((line, lineIndex) => {
        rows.push({ key: `line:${file.path}:${hunkIndex}:${lineIndex}`, kind: "line", line });
        for (const finding of fileFindings) {
          if (!isAnchoredOn(finding, line)) continue;
          findingRows.set(finding.id, rows.length);
          rows.push({ key: `finding:${finding.id}`, kind: "finding", finding, detached: false });
        }
      });
    });
  }
  const unanchored = findings.filter((finding) => !findingRows.has(finding.id) && !collapsed.has(finding.path));
  if (unanchored.length > 0) {
    rows.push({ key: "section:unanchored", kind: "section", title: "Not anchored on a diff line" });
    for (const finding of unanchored) {
      rows.push({ key: `path:${finding.id}`, kind: "path", path: finding.path });
      findingRows.set(finding.id, rows.length);
      rows.push({ key: `finding:${finding.id}`, kind: "finding", finding, detached: true });
    }
  }
  return { rows, findingRows };
}

function isAnchoredOn(finding: Finding, line: DiffLine): boolean {
  return finding.side === "LEFT" ? line.kind !== "add" && line.oldNo === finding.line : line.kind !== "del" && line.newNo === finding.line;
}

/** The findings a reviewer steps through with Prev / Next: the open ones, in the order their cards appear. */
export function navigableFindings(findings: Finding[], findingRows: Map<string, number>): Finding[] {
  return findings
    .filter((finding) => finding.status === "open" && findingRows.has(finding.id))
    .sort((a, b) => (findingRows.get(a.id) ?? 0) - (findingRows.get(b.id) ?? 0));
}
