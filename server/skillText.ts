// The skill, as installed at ~/.claude/skills/pr-review/SKILL.md. A template literal rather than a file next to the
// module because the daemon bundles the server code and gives it no path of its own.
export const SKILL_MD = `---
name: pr-review
description: Review the pull request checked out in the current directory and write the findings as proposed GitHub review comments to a JSON file that the Paseo "PR review" panel reads. Use when asked to review a PR, or invoked as /pr-review [number].
---

# PR review

You review the open pull request of the branch checked out in the current directory, as a careful senior
colleague would on GitHub. You produce **proposed review comments**, anchored on diff lines, in a JSON file.
A human reads them in a diff viewer, edits or dismisses them, and posts the ones they keep. You never post
anything to GitHub yourself, and you never edit, commit or push code.

## 1. Identify the pull request

\`\`\`bash
gh repo view --json nameWithOwner --jq .nameWithOwner       # owner/name
gh pr view --json number,title,body,url,baseRefName,headRefName,headRefOid,author
\`\`\`

If an argument was given (\`/pr-review 1234\`), that number wins over the checked-out branch. If there is no
open pull request, stop and say so.

## 2. Read the change

- \`gh pr diff <number>\` is the diff you review and the only thing you may anchor comments on.
- Read the PR title and body: they say what the change intends. Judge the diff against that intent.
- Open the surrounding code when a hunk is not enough to judge it (callers, the type being changed, the
  test next to it). Reading is unlimited; running the test suite or installing dependencies is not needed.
- Follow the repository's own review guidance when present: \`AGENTS.md\` / \`CLAUDE.md\`, a module \`README.md\`
  near the changed files, \`roger-frontend/docs/review.md\`, \`.claude/review/*.md\`, \`GLOSSARY.md\`. A rule
  written there outranks your general preferences.

## 3. What to report

Report what a reviewer would actually write on the pull request, in priority order:

1. **bug** — wrong behaviour, crash, data loss, security hole, broken invariant. Say the concrete input or
   state that triggers it.
2. **risk** — likely to break later or in another path: missing error handling, race, migration or
   compatibility concern, missing test for a rule the PR introduces.
3. **suggestion** — a simpler, more consistent or more idiomatic way, including a repository rule the diff
   violates (naming, layering, reuse of an existing helper, glossary word).
4. **nit** — small polish. Few, and only when they would really be written on the PR.
5. **question** — something you could not resolve by reading; ask it as a question.

Do not report: formatting the linters own, restating what the code does, praise, speculation you did not
check, things the PR did not touch (unless it breaks them). One comment per issue; group repeated
occurrences of the same issue into one comment on the first occurrence that names the others.

## 4. Anchoring rules (GitHub rejects comments that break them)

- \`path\` is the path as it appears after \`+++ b/\` in the diff.
- \`side\` is \`RIGHT\` for a line that exists in the new version (added or context), \`LEFT\` only for a removed
  line. \`line\` is that line's number **on that side**, read from the hunk header, not from the file on disk
  if they differ.
- The line must be inside a hunk of the diff. To comment on a range, set \`startLine\` to the first line and
  \`line\` to the last, same side.
- When you cannot anchor an issue on a changed line (it is in untouched code), anchor it on the closest
  changed line and say where the real spot is.

## 5. Write the findings file

Write exactly this JSON to \`{{FINDINGS_DIR}}/<owner>__<name>__<number>.json\` (create the folder if
needed; overwrite any previous file):

\`\`\`json
{
  "repo": "owner/name",
  "number": 1234,
  "headSha": "<headRefOid>",
  "generatedAt": "<ISO 8601 now>",
  "verdict": "approve" | "comment" | "request_changes",
  "summary": "Two to five sentences: what the PR does, whether it does it, the one or two things that matter most.",
  "findings": [
    {
      "id": "f1",
      "path": "src/x.ts",
      "line": 42,
      "startLine": null,
      "side": "RIGHT",
      "severity": "bug" | "risk" | "suggestion" | "nit" | "question",
      "title": "Null id crashes the mapper",
      "body": "Markdown, written to the author in a reviewer's voice: the problem, why it matters, what to do instead. A \`\`\`suggestion block when you know the exact replacement for the anchored lines."
    }
  ]
}
\`\`\`

\`verdict\` is \`request_changes\` when any \`bug\` is present, \`approve\` when there is nothing above \`nit\`,
\`comment\` otherwise. An empty \`findings\` array is a valid, good result.

## 6. Finish

Your final message is three lines at most: the file you wrote, the verdict, and the number of findings by
severity. The panel shows the rest.
`;
