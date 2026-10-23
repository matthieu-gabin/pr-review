import type { PullRequest } from "../shared/review";
import { gh } from "./gh";

const FIELDS = "number,title,url,author,baseRefName,headRefName,headRefOid,headRepository,headRepositoryOwner,state";

/** The open pull request of the branch checked out in `directory`, or null when there is none. */
export async function currentPullRequest(directory: string): Promise<PullRequest | null> {
  let output: string;
  try {
    output = await gh(["pr", "view", "--json", FIELDS], { cwd: directory });
  } catch (error) {
    if (error instanceof Error && /no pull requests found|not a git repository|could not find/i.test(error.message)) return null;
    throw error;
  }
  const pr = JSON.parse(output);
  if (pr.state !== "OPEN") return null;
  // gh resolves the base repository ("owner/name" the review is posted on) from the git remote.
  const repo = (await gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], { cwd: directory })).trim();
  const [owner, name] = repo.split("/");
  return {
    owner,
    name,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    author: pr.author?.login ?? "ghost",
    baseRefName: pr.baseRefName,
    headRefName: pr.headRefName,
    headSha: pr.headRefOid,
  };
}

export async function pullRequestDiff(directory: string, number: number): Promise<string> {
  return gh(["pr", "diff", String(number), "--color=never"], { cwd: directory });
}

export interface ReviewComment {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  start_line?: number;
  start_side?: "LEFT" | "RIGHT";
  body: string;
}

/** Posts one pull request review carrying every comment at once, like the GitHub "Submit review" button. */
export async function postReview(input: {
  directory: string;
  pullRequest: PullRequest;
  event: "approve" | "comment" | "request_changes";
  body: string;
  comments: ReviewComment[];
}): Promise<{ url: string }> {
  const { owner, name, number, headSha } = input.pullRequest;
  const payload = {
    commit_id: headSha,
    event: { approve: "APPROVE", comment: "COMMENT", request_changes: "REQUEST_CHANGES" }[input.event],
    body: input.body,
    comments: input.comments,
  };
  const output = await gh(["api", "-X", "POST", `repos/${owner}/${name}/pulls/${number}/reviews`, "--input", "-"], {
    cwd: input.directory,
    input: JSON.stringify(payload),
  });
  return { url: JSON.parse(output).html_url };
}
