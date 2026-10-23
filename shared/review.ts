import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** Agent label that ties a review agent to its pull request: "owner/name#number". */
export const REVIEW_AGENT_LABEL = "pr-review";
export const REVIEW_AGENT_PROVIDER = "claude/claude-opus-5-5";
/** The skill's slash command; the skill itself finds the pull request from the checked-out branch. */
export const REVIEW_PROMPT = "/pr-review";

export const pullRequestSchema = z.object({
  owner: z.string(),
  name: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  author: z.string(),
  baseRefName: z.string(),
  headRefName: z.string(),
  headSha: z.string(),
});
export type PullRequest = z.infer<typeof pullRequestSchema>;

export const severitySchema = z.enum(["bug", "risk", "suggestion", "nit", "question"]);
export type Severity = z.infer<typeof severitySchema>;

/** One comment the skill proposes, anchored like a GitHub review comment. */
export const findingSchema = z.object({
  id: z.string(),
  path: z.string(),
  /** Last line of the range, on `side` of the diff, as GitHub numbers it. */
  line: z.number().int().positive(),
  startLine: z.number().int().positive().nullable().default(null),
  side: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
  severity: severitySchema.default("suggestion"),
  title: z.string(),
  body: z.string(),
  /** `open` until the reviewer dismisses it or posts it. */
  status: z.enum(["open", "dismissed", "posted"]).default("open"),
});
export type Finding = z.infer<typeof findingSchema>;

export const verdictSchema = z.enum(["approve", "comment", "request_changes"]);
export type Verdict = z.infer<typeof verdictSchema>;

/** What the skill writes, plus the reviewer's edits. */
export const reviewFileSchema = z.object({
  repo: z.string(),
  number: z.number().int().positive(),
  headSha: z.string().optional(),
  generatedAt: z.string().optional(),
  summary: z.string().default(""),
  verdict: verdictSchema.default("comment"),
  findings: z.array(findingSchema).default([]),
});
export type ReviewFile = z.infer<typeof reviewFileSchema>;

export const statusRpc = defineRpc({
  name: "review.status",
  input: z.object({ directory: z.string() }),
  output: z.object({
    pullRequest: pullRequestSchema.nullable(),
    review: reviewFileSchema.nullable(),
    findingsPath: z.string().nullable(),
  }),
});

const diffLineSchema = z.object({
  kind: z.enum(["add", "del", "ctx"]),
  text: z.string(),
  oldNo: z.number().nullable(),
  newNo: z.number().nullable(),
});
export type DiffLine = z.infer<typeof diffLineSchema>;

const diffHunkSchema = z.object({ header: z.string(), lines: z.array(diffLineSchema) });
export type DiffHunk = z.infer<typeof diffHunkSchema>;

const diffFileSchema = z.object({
  path: z.string(),
  oldPath: z.string().nullable(),
  status: z.enum(["added", "deleted", "modified", "renamed"]),
  binary: z.boolean(),
  additions: z.number(),
  deletions: z.number(),
  hunks: z.array(diffHunkSchema),
});
export type DiffFile = z.infer<typeof diffFileSchema>;

export const diffRpc = defineRpc({
  name: "review.diff",
  input: z.object({ directory: z.string(), number: z.number() }),
  output: z.object({ files: z.array(diffFileSchema) }),
});

export const saveRpc = defineRpc({
  name: "review.save",
  input: z.object({ directory: z.string(), review: reviewFileSchema }),
  output: z.object({}),
});

export const postRpc = defineRpc({
  name: "review.post",
  input: z.object({
    directory: z.string(),
    event: verdictSchema,
    body: z.string(),
    findingIds: z.array(z.string()),
  }),
  output: z.object({ url: z.string(), posted: z.number() }),
});

export const discardRpc = defineRpc({
  name: "review.discard",
  input: z.object({ directory: z.string() }),
  output: z.object({}),
});
