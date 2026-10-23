# pr-review: Paseo plugin

A **Review** panel on every git workspace: the checked-out branch's pull request, its diff, and the comments the `/pr-review` Claude Code skill proposes (a Java-first review: Spring Boot, jOOQ, JUnit 5 + Mockito, Flyway, following the repository's `.claude/rules/backend-*.md` and its review guide; other files get bug-level attention only), shown under the lines they anchor on. Edit or dismiss them, set the verdict, and post them to GitHub as one review.

- **Run AI review** starts a Claude agent (`claude/claude-opus-5-5`, auto permission mode) in the workspace with the prompt `/pr-review <number>`; **Open agent** shows its transcript; **Review again** reruns it
- Findings: severity (bug, risk, suggestion, nit, question), title, body; **Edit**, **Dismiss** / **Restore**; the ones outside the diff are listed apart and posted in the review body
- Navigation: **‹ n / N ›** in the header steps through the open findings in diff order, and the findings index under the review body jumps to any of them; the current card is outlined. The diff is a virtualised list, so large pull requests stay responsive
- **Post review with N comments**: one GitHub review (Comment / Approve / Request changes) carrying the kept findings as inline comments, then opens it
- Findings file: `~/.cache/pr-review/findings/<owner>__<name>__<number>.json`, written by the skill, updated by the panel
- The skill: `server/skillText.ts` (a template literal, since the bundled server has no file path of its own), copied to `~/.claude/skills/pr-review/SKILL.md` each time the plugin loads (the copy wins; edit the plugin's file)
- A review agent started by another plugin (the review-queue plugin does this) carries the label `pr-review=<owner>/<name>#<number>`; this plugin opens its panel on that workspace when such an agent appears

## Requirements

- Paseo >= 0.12.0 with plugins enabled, Claude Code usable by Paseo
- Node.js and npm
- `gh` signed in (`gh auth status`) with access to the repository

## Install

```bash
cd ~/Documents/repository/pr-review
npm install
npm run typecheck
paseo plugin install "$PWD"
paseo plugin ls        # pr-review must be "running"
```

## Update / debug

- After editing: `paseo plugin reload pr-review`
- Logs: `paseo plugin logs pr-review`
