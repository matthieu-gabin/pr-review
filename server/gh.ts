import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
// The daemon's PATH may not carry the shell's additions, so look where package managers put gh first.
const GH = [`/opt/homebrew/bin/gh`, `/usr/local/bin/gh`, `/usr/bin/gh`].find(existsSync) ?? "gh";

export async function gh(args: string[], options: { cwd: string; input?: string }): Promise<string> {
  try {
    const child = execFileAsync(GH, args, { cwd: options.cwd, maxBuffer: 64 * 1024 * 1024 });
    if (options.input !== undefined) child.child.stdin?.end(options.input);
    return (await child).stdout;
  } catch (error) {
    const stderr = typeof error === "object" && error && "stderr" in error ? String(error.stderr).trim() : "";
    const notFound = typeof error === "object" && error && "code" in error && error.code === "ENOENT";
    if (notFound) throw new Error("gh is not installed: install the GitHub CLI and run `gh auth login`.");
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
}
