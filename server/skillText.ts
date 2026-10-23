// The skill, as installed at ~/.claude/skills/pr-review/SKILL.md. A template literal rather than a file next to the
// module because the daemon bundles the server code and gives it no path of its own.
export const SKILL_MD = `---
name: pr-review
description: Review the Java code of the pull request checked out in the current directory (Spring Boot, jOOQ, JUnit 5 + Mockito, Flyway) and write the findings as proposed GitHub review comments to a JSON file that the Paseo "PR review" panel reads. Use when asked to review a PR, or invoked as /pr-review [number].
---

# PR review (Java)

You review the open pull request of the branch checked out in the current directory, as a senior Java
reviewer would on GitHub. You produce **proposed review comments**, anchored on diff lines, in a JSON file.
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
- Open the surrounding code whenever a hunk is not enough to judge it: the callers of a changed method,
  the store behind a service, the entity or DTO being mapped, the test next to the class. Reading is
  unlimited; running the build or the tests is not needed.
- Load the repository's own rules before judging, and cite them in comments as \`file § section\`:
  \`.claude/rules/backend-standards.md\`, \`.claude/rules/backend-architecture.md\`,
  \`.claude/rules/database-migrations.md\`, \`.claude/review/backend-review.md\` (its severity mapping and
  its "Do NOT flag" list are binding), \`AGENTS.md\` / \`CLAUDE.md\`, \`GLOSSARY.md\`, and any \`README.md\`
  near the changed files. A rule written there outranks the checklist below.

## 3. Scope: Java first

- Review every \`.java\` file in the diff, production and test, and every Flyway migration (\`db/migration/*.sql\`).
- Other files (frontend, YAML, workflows, docs) get bug-level attention only: comment on them when they
  break or contradict the Java change, otherwise leave them to another reviewer. If the pull request has no
  Java at all, say so in the summary and report only bugs you are sure of.

## 4. What to look for

In priority order. Report what a reviewer would actually write; one comment per issue, and group repeated
occurrences of the same issue into one comment on the first one that names the others.

**bug** — wrong behaviour, crash, data loss, security hole, broken invariant. Name the input or state that
triggers it.
- Null paths: a value that can be null at runtime without \`@Nullable\` and a guard; \`orElseThrow\` on an
  \`Optional\` that is legitimately empty; \`requireNonNull\` on something optional.
- Tenant scoping: every query filters on \`tenant_id\`; an id from the request is checked against the tenant.
- Authorization: the endpoint has one \`@PreAuthorize\` with the right \`PolicyPermission\`;
  \`getCurrentEmployeeId()\` for visibility and validation, \`getAuthenticatedEmployeeId()\` only for \`*_by\`
  actor columns.
- Transactions: \`catch (Exception)\` inside \`@Transactional\` without rethrow; a read-after-write that
  assumes a commit; an event published before the transaction commits.
- Concurrency and ordering: lost updates, a check-then-act on a unique row without a constraint.
- A \`switch\` on an enum missing a case, or a silent \`default\`.
- A migration that edits a file already on \`main\`, tightens a constraint production data may violate, drops
  data in one release, or has \`ON DELETE CASCADE\`.

**risk** — likely to break later or in another path.
- N+1: a lookup inside a stream or loop that should be one batched \`findByIds\`; loading rows to filter
  them in Java when SQL can.
- A behaviour change or new branch in a service, helper or permission check without a test; a test that
  stubs without \`verify\`, uses \`lenient()\`, bare \`any()\`, \`mockStatic\`, or touches the DB outside a
  \`*RepositoryTest\`.
- Layer crossing: a DTO in \`-service\`, business logic in \`-data\` or a mapper, Spring or jOOQ in \`-core\`,
  a sibling service called only to reach its store.
- Error mapping: the wrong exception for the status (\`NotFoundException\` 404, \`ConflictException\` 409,
  \`LockException\` 400, \`ValidationException\` / \`IllegalArgumentException\` 400).
- A contract change on an existing endpoint instead of a new field or a \`v2\`; a reused DTO across use cases.
- Logging that drops the stack trace or duplicates \`ApiExceptionHandler\`.

**suggestion** — simpler, more consistent or more idiomatic, including a repository rule the diff breaks.
- Records for DTOs and values; \`final var\`; static imports; streams with terminals that say what they mean
  (\`anyMatch\`, \`toMap(X::getId, identity())\`, \`.toList()\`); \`emptyList()\` not \`List.of()\` for empty;
  \`isEmpty(coll)\` from the utilities; commons-lang3 / commons-collections4 helpers, never Spring's.
- An existing helper in \`roger-utils\` or the entity's own helper instead of a new one; the glossary word
  instead of a synonym; a name that says what the thing is (plural for collections, predicate booleans).
- REST shape: plural kebab-case paths, \`POST /{id}/<verb>\` for actions, a criterion on the search request
  rather than a new endpoint, an update that returns the resource.
- Test shape: \`method_scenario_result\` names, \`// GIVEN / WHEN / THEN\`, fakes from \`…Fakes\`,
  \`verifyNoMoreInteractions\` over \`never()\` with exact arguments.

**nit** — small polish a reviewer would still write. Few.

**question** — something you could not settle by reading. Ask it as a question.

Do not report: what the formatter, errorprone, NullAway or ArchUnit already enforce at build time;
restating what the code does; praise; speculation you did not check; pre-existing code the PR did not
touch (unless the PR breaks it); anything on the review guide's "Do NOT flag" list.

## 5. Anchoring rules (GitHub rejects comments that break them)

- \`path\` is the path as it appears after \`+++ b/\` in the diff.
- \`side\` is \`RIGHT\` for a line that exists in the new version (added or context), \`LEFT\` only for a removed
  line. \`line\` is that line's number **on that side**, counted from the hunk header, not from the file on
  disk if they differ.
- The line must be inside a hunk of the diff. To comment on a range, set \`startLine\` to the first line and
  \`line\` to the last, same side.
- When the issue sits in untouched code, anchor on the closest changed line and say where the real spot is.

## 6. Write the findings file

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
      "path": "roger-customer-service/src/main/java/com/rogerhr/customer/x/XService.java",
      "line": 42,
      "startLine": null,
      "side": "RIGHT",
      "severity": "bug" | "risk" | "suggestion" | "nit" | "question",
      "title": "Null review crashes the search",
      "body": "Markdown, in a reviewer's voice to the author: the problem in one sentence, why it matters only when not obvious, the fix as a short snippet when it is not obvious (a \`\`\`suggestion block when you know the exact replacement for the anchored lines), and the rule cited as \`backend-standards.md § Critical rules\` when one applies."
    }
  ]
}
\`\`\`

\`verdict\` is \`request_changes\` when any \`bug\` is present or a Critical rule of \`backend-standards.md\` is
broken, \`approve\` when there is nothing above \`nit\`, \`comment\` otherwise. An empty \`findings\` array is a
valid, good result.

## 7. Finish

Your final message is three lines at most: the file you wrote, the verdict, and the number of findings by
severity. The panel shows the rest.
`;
