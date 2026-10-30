# code-cleanup and branch-cleanup

Two guided, safe cleanup skills for [Claude Code](https://claude.com/claude-code), written for people who can follow commands but would rather not diagnose a broken build. They share the same safety rules and differ in scope.

## Which one to use

| | `code-cleanup` | `branch-cleanup` |
|---|---|---|
| Scope | A whole project or one folder | Only what one branch adds, plus whatever that diff left orphaned in older code |
| Where it works | A new cleanup branch cut from yours | The branch under review, with the cleanup commits on top |
| Use it when | Tidying a codebase, removing dead code, getting a repo ready to launch or show | Polishing a feature or delivery before opening or merging its pull request |
| Rest of the codebase | Fair game | Out of bounds: seen-but-not-touched lines go in the summary |
| Report | `.cleanup/report.md` with a plan, a baseline and a before-and-after table | A `## Cleanup` section to paste into the pull request description |
| Starting point | Baseline of every check, saved to a file | Asks whether the checks passed at HEAD; runs them once if not |

If you are unsure, the question is whether older code may change: yes means `code-cleanup`, no means `branch-cleanup`. Each skill's description points at the other, so Claude picks the right one from how you phrase the request.

## code-cleanup in short

Asking an agent to "clean up the code" usually ends in one large diff that mixes deleted dead code with renamed variables, reformatted files and a quietly fixed bug. If something breaks, there is no telling which change did it. This skill does the opposite: it works on a separate branch, measures the project before touching anything, sorts every finding by risk, and applies the changes in small blocks, one commit each, that you approve one at a time. Anything that would change behaviour goes into a report instead of into the code.

```
Plan: 6 blocks
1. Remove unused imports in src/                 level 1
2. Remove repeated keys in the i18n dictionary   level 1
3. Remove debug logs left in the importer        level 2
4. Remove CSS selectors that match nothing       level 2   (visual check)
5. Merge two copies of the date formatter        level 2   (reviewed)
6. Format with the project's Prettier config     level 2   (last)

Level 3, report only: 2 bugs (1 high), 1 tracked .env, 1 data migration
Apply block 1?
```

## What is in the box

| Path | What it is |
|---|---|
| `code-cleanup/SKILL.md` | The skill: safety net, baseline, inventory, analysis in three levels, block-by-block application, wrap-up |
| `code-cleanup/references/worktree.md` | Working in a git worktree: what it costs, how to create it, how to remove it without losing anything. Read only when a worktree is on the table |
| `code-cleanup/references/find-skills.md` | Searching the open skills registry for extra help, with permission before anything is downloaded. Read only if you ask for it |
| `code-cleanup/references/report-template.md` | The structure of the final report |
| `code-cleanup/scripts/skill-inventory.mjs` | Lists installed skills, subagents and plugins (marking disabled ones) and plugins available in your marketplaces, filtered and ranked by keyword. Read-only |
| `branch-cleanup/SKILL.md` | The skill: fix the scope from the branch's diff, know the checks, plan blocks, apply block by block, wrap up with a pull request section |
| `branch-cleanup/evals/` | Three test cases, each with a script that builds a throwaway repository, a prompt and graders: stays inside the fence, stops on a dirty tree, finds an orphan built from text |

## Install

Copy the skill folder you want into your skills directory, or both:

```bash
cp -r code-cleanup ~/.claude/skills/code-cleanup
cp -r branch-cleanup ~/.claude/skills/branch-cleanup
```

Then ask Claude to clean up a project or a folder (or run `/code-cleanup`), or to tidy the branch before a pull request (or run `/branch-cleanup`). The inventory script of `code-cleanup` needs Node.js; without it the skill falls back to looking at the skill folders by hand. `branch-cleanup` needs nothing but git, and the `evals/` folder is not needed to use it.

## How code-cleanup works

**Phase 0, safety net.** Checks the folder is a git repository (and offers to create one, with a `.gitignore` first so secrets and `node_modules` stay out), refuses to mix your uncommitted work into the cleanup, and creates a cleanup branch. Optionally it works in a git worktree, so you can keep working in your own folder meanwhile. The report lives in a `.cleanup/` folder excluded through `.git/info/exclude`, so it never reaches a commit.

**Phase 1, baseline.** Finds the project's real checks and splits them into fast (unit tests, lint, types, build) and slow (end-to-end tests). Runs all of them once and records what already failed, so an old failure is never blamed on the cleanup. Warns about a development server left running, which end-to-end tests can silently test instead of the branch.

**Phase 2, inventory.** Uses the skills you already have (`/simplify`, `/code-review`, a `code-simplifier` subagent...) rather than imitating them. **Phase 3**, searching for new ones, is optional and asks before downloading anything.

**Phase 4, analysis.** Every finding gets a level:

- **Level 1, safe and mechanical:** unused imports and variables, repeated keys in an object literal. Imports with side effects, re-exports and variables holding a call are deliberately excluded.
- **Level 2, needs judgement:** duplicate or long functions, files and dependencies that look unused, logs, commented-out code, dead CSS, unused i18n keys, outdated comments and docs, dead config options, formatting with the project's own formatter.
- **Level 3, report only:** behaviour changes, bugs, anything touching authentication, payments or stored data (including data migrations written as code, such as Dexie's `db.version(n).upgrade(...)`), public exports, dependency upgrades, secrets. Each finding gets a severity, a fix risk and a size, and the report ends with a recommended order of separate pieces of work.

Before calling anything unused, the skill looks for indirect references, above all names built from strings: `"nav" + id` uses a class called `navchallenges` that appears nowhere in the code.

**Phase 5, block by block.** Explain, ask, apply, check, commit. Fast checks run on every block; slow ones only on blocks that change something visible, and all of them at the end. Blocks that change how things look need a visual comparison. Only logic blocks go through a review subagent. A failing block is undone and noted, not patched on the spot. Pre-commit hooks are never skipped.

**Phase 6, wrap-up.** Runs everything once more, fills in the report with before-and-after measurements, and explains how to review, keep or discard the branch. It never merges or pushes: that is your call. If a slow check fails only at the end, one commit per block means `git bisect` can find the culprit.

## How branch-cleanup works

**Scope is a fence.** The scope is the branch's own diff, measured from the merge base so later commits on the base do not leak in, plus the orphans: code outside the diff that the diff made dead or untrue, such as a CSS class, keyframes, a function or a translation key whose last user the branch removed, and comments beside changed code that now describe something gone. It finds them by searching for every name the branch deleted, including names built from text. Anything else, even older code next to a change, is mentioned in one line under "Seen outside the scope" and left alone.

**Same branch, no baseline folder.** It starts only from a clean tree on a branch that is not the default one, notes the starting commit and commits each block on top of the branch. It does not create a cleanup branch or a `.cleanup/` folder; the commits themselves keep the progress.

**Same levels, smaller plan.** Findings are sorted into the three levels used by `code-cleanup` (mechanical, needs judgement, report only). A branch usually yields two to six blocks, and more than about eight means the branch is too big for one pass. The tooling is sized to the diff: up to about 150 changed lines it reads the hunks itself, above that it can use `/simplify`, and `/code-review` is reserved for blocks that change logic.

**Wrap-up.** It runs all the checks, compares the lines the branch adds before and after, and writes a `## Cleanup` section (applied, skipped, left for later, seen outside the scope) to paste into the pull request description. Reviewing the commits, opening the pull request and merging stay with you.

The `evals/` folder holds the cases used to test it. Each builds a small repository with deliberately untidy old code on `main` and a feature branch on top, then grades whether the skill cleaned the branch, left the old code exactly as it was, and made one commit per block without merging, pushing or stashing.

## Rules they do not bend

A project's `CLAUDE.md` governs conventions such as branch names, commit language and how tests are run. It cannot lower the safety rules: no `merge`, `push`, `rebase`, `reset --hard` or `stash`, no behaviour change, no `--no-verify`, nothing downloaded and run without asking, no AI signatures in commits. `code-cleanup` also never touches your starting branch, since all its work happens on a new one; `branch-cleanup` works on the branch under review and never leaves it.

## Large projects

With `code-cleanup`, on a project with more than about eight blocks, the skill proposes writing the plan, closing the session, and applying a few blocks per new session from the report. Every message resends the whole conversation, so several short sessions cost much less than one long one. Test output is written to a log file and only its summary is read, for the same reason.

## Costs

Not measured yet. The cost depends mostly on the size of the project or diff, the number of blocks and how long the test output is. `code-cleanup` itself is about 7k tokens and the files under its `references/` load only when needed. `branch-cleanup` is a single file of about 3k tokens.

## Licence

MIT. See `LICENSE`.
