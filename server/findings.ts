import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { reviewFileSchema, type ReviewFile } from "../shared/review";

export const FINDINGS_DIR = join(homedir(), ".cache", "pr-review", "findings");

/** Where the skill writes and the panel reads: one file per pull request, whatever the worktree. */
export function findingsPath(repo: { owner: string; name: string; number: number }): string {
  return join(FINDINGS_DIR, `${repo.owner}__${repo.name}__${repo.number}.json`);
}

export async function readReview(path: string): Promise<ReviewFile | null> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return null;
  }
  // The skill may still be writing, or wrote something off-contract: show nothing rather than a crash.
  const parsed = reviewFileSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export async function writeReview(path: string, review: ReviewFile): Promise<void> {
  await mkdir(FINDINGS_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(review, null, 2));
}

export async function removeReview(path: string): Promise<void> {
  await rm(path, { force: true });
}
