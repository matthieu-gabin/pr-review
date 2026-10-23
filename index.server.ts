import type { PluginServerContext } from "@getpaseo/plugin/server";
import { isLineInDiff, parseUnifiedDiff } from "./server/diff";
import { findingsPath, readReview, removeReview, writeReview } from "./server/findings";
import { currentPullRequest, postReview, pullRequestDiff, type ReviewComment } from "./server/pullRequest";
import { installSkill } from "./server/skill";
import { diffRpc, discardRpc, postRpc, saveRpc, statusRpc, type Finding } from "./shared/review";

export default function contribute(server: PluginServerContext) {
  void installSkill().catch((error) => console.error("[pr-review] skill install failed", error));

  server.handle(statusRpc, async ({ directory }) => {
    const pullRequest = await currentPullRequest(directory);
    if (!pullRequest) return { pullRequest: null, review: null, findingsPath: null };
    const path = findingsPath(pullRequest);
    return { pullRequest, review: await readReview(path), findingsPath: path };
  });

  server.handle(diffRpc, async ({ directory, number }) => ({ files: parseUnifiedDiff(await pullRequestDiff(directory, number)) }));

  server.handle(saveRpc, async ({ directory, review }) => {
    const pullRequest = await currentPullRequest(directory);
    if (!pullRequest) throw new Error("No open pull request for this branch.");
    await writeReview(findingsPath(pullRequest), review);
    return {};
  });

  server.handle(discardRpc, async ({ directory }) => {
    const pullRequest = await currentPullRequest(directory);
    if (pullRequest) await removeReview(findingsPath(pullRequest));
    return {};
  });

  server.handle(postRpc, async ({ directory, event, body, findingIds }) => {
    const pullRequest = await currentPullRequest(directory);
    if (!pullRequest) throw new Error("No open pull request for this branch.");
    const path = findingsPath(pullRequest);
    const review = await readReview(path);
    const chosen = (review?.findings ?? []).filter((finding) => findingIds.includes(finding.id) && finding.status !== "posted");
    const files = parseUnifiedDiff(await pullRequestDiff(directory, pullRequest.number));
    // GitHub refuses an inline comment outside the diff, so those ride in the review body instead.
    const inline = chosen.filter((finding) => isLineInDiff(files, finding));
    const detached = chosen.filter((finding) => !inline.includes(finding));
    const { url } = await postReview({
      directory,
      pullRequest,
      event,
      body: [body.trim(), ...detached.map(detachedComment)].filter(Boolean).join("\n\n"),
      comments: inline.map(toComment),
    });
    if (review) {
      const postedIds = new Set(chosen.map((finding) => finding.id));
      await writeReview(path, { ...review, findings: review.findings.map((finding) => (postedIds.has(finding.id) ? { ...finding, status: "posted" } : finding)) });
    }
    return { url, posted: chosen.length };
  });

  return () => {};
}

function toComment(finding: Finding): ReviewComment {
  const range = finding.startLine !== null && finding.startLine < finding.line ? { start_line: finding.startLine, start_side: finding.side } : {};
  return { path: finding.path, line: finding.line, side: finding.side, body: finding.body, ...range };
}

function detachedComment(finding: Finding): string {
  return `**${finding.path}:${finding.line}** — ${finding.body}`;
}
