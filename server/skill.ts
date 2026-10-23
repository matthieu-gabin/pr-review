import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { FINDINGS_DIR } from "./findings";
import { SKILL_MD } from "./skillText";

const TARGET = join(homedir(), ".claude", "skills", "pr-review", "SKILL.md");

/** Keeps the user-level Claude Code skill equal to the plugin's copy, so `/pr-review` exists in every worktree. */
export async function installSkill(): Promise<void> {
  const wanted = SKILL_MD.replaceAll("{{FINDINGS_DIR}}", FINDINGS_DIR);
  const current = await readFile(TARGET, "utf8").catch(() => null);
  if (current === wanted) return;
  await mkdir(dirname(TARGET), { recursive: true });
  await writeFile(TARGET, wanted);
}
