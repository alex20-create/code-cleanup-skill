---
name: code-cleanup
description: Guided, safe code cleanup of a whole project or one folder (JavaScript, TypeScript, Python or other). Works on a new branch, uses the skills, plugins and subagents already installed, can search for new skills if the user wants and asks before installing any, and applies changes in blocks the user approves one at a time, checking that everything still works after each block. Use it when the user asks to clean up, tidy, sanitise, simplify or bring up to date the code of a project or folder, remove dead code, unused imports, debug logs or duplicates, or get a repo ready before launching or showing it, even if they never say "cleanup". Do not use it to refactor a single function or one specific file. Also use for "clean up this codebase", "tidy the repo", "remove dead code", "cleanup pass", and in Spanish for "limpia el código", "ordena el repo", "quita código muerto".
---

# Guided code cleanup

The goal is to leave the project cleaner **without changing what it does** and without the user losing anything. Whoever uses this skill may not be a seasoned programmer: they can follow commands but not diagnose a failure. That is why safety (a separate branch, one commit per block, checking after every change) matters more than speed, and every step is explained in plain language: what is about to happen, why, and how to undo it.

Speak the user's language, and write the report and the baseline in it too. If it is Spanish, use European Spanish.

## Non-negotiable rules

These rules exist because a mistake here can cost the user real work:

- **The project's and the user's `CLAUDE.md` govern conventions**: branch names, commit style, language, how to run the tests, asking before writing. Follow them even where this skill says otherwise. What they never do is lower the safety rules in this list (a separate branch, no `merge`, `push` or `stash`, no behaviour change, no skipping hooks). If a `CLAUDE.md` clashes with one of them (for example, "work directly on main"), stop and ask the user before going on.
- **Do not touch the starting branch.** Everything happens on a new branch. Never `merge`, `push`, `rebase`, `reset --hard`, `push --force`, `stash` or delete branches. That is the user's call at the end. The only exceptions are the initial commit of a brand-new repository (Phase 0, step 1) and the commit of their pending work (Phase 0, step 3): both only with their explicit approval and before the cleanup branch is created.
- **Do not change behaviour.** Cleaning is not adding features or "fixing" logic. If you see a bug, note it in the report; do not fix it inside the cleanup.
- **Never skip hooks.** If a pre-commit hook fails, do not use `--no-verify`: treat it as a failure of the block (Phase 5, step 5).
- **No AI signatures.** In commits, comments, READMEs or descriptions, add no `Co-Authored-By`, "Generated with..." or anything that mentions AI. Plain, descriptive commit messages.
- **Secrets:** do not read out or copy keys, tokens or passwords you come across. If one appears in the code, flag it as high priority in the report (without showing the value) and do not move it yourself. The same goes for a `.env` or credentials file that is stored in git (`git ls-files` lists it) or ever was (`git log --all --oneline -- ":(glob)**/.env*"` also finds those deleted later, in any folder): even if it is gone now, it is still in the history, so the key has to be rotated. Explain this to the user and leave it alone.
- **Do not hand-edit** `.env*`, credentials, data migrations or lock files (`package-lock.json`, `poetry.lock`...). Migrations are not always loose files in a `migrations/` folder: often they are code inside another file, such as Dexie versions with `db.version(2).upgrade(...)` or a list of steps that run when stored data is loaded. They look like ordinary code, but changing them changes what happens to the data the user already has: they are level 3 even if a simplifier sees something to improve. If dependencies have to change, do it with the package manager and in a block of its own.
- **Nothing that downloads and runs code without permission.** That includes `npx`, `pipx`, `uvx` and the like, even just to search: say which package gets downloaded and wait for a yes.

## Phase 0: Safety net

1. Check that the project is a git repository (`git rev-parse --is-inside-work-tree`).
   - If it is not, **stop**. Explain that without git there is no easy way to undo changes and offer to create one. Go on only if the user agrees, and in this order:
     1. `git init`.
     2. If there is no `.gitignore`, propose a minimal one for the stack (at least `.env*`, dependencies such as `node_modules/` or `.venv/`, and build output such as `dist/`). Without it, the first commit would take secrets and thousands of dependency files with it.
     3. `git add -A` and show the list of what is going in (`git status --short`). If anything looks like a secret or a huge folder, stop and ask.
     4. `git commit -m "Initial state before cleanup"`.
2. Check whether the session already runs in a worktree: if the two paths from `git rev-parse --path-format=absolute --git-dir --git-common-dir` differ, it does. In that case read `references/worktree.md` ("If the session is already in a worktree") and do not offer another worktree in step 4.
3. Check for uncommitted changes (`git status --porcelain`).
   - If there are any, **stop and ask**: commit them on their current branch (one of the only two times the starting branch is touched, and only if they approve), work in a worktree (step 4) so they stay where they are (not if the session is already in one, step 2), or cancel so they sort them out themselves. Do not use `git stash`: it is easy to forget what was put aside. Do not mix their pending work with the cleanup.
4. Decide where the work happens. By default, in the same folder on a new branch. Offer a **worktree** (a second folder of the same repository with the cleanup branch checked out) only if there are uncommitted changes the user does not want to commit, or if they want to keep working in their folder while the cleanup runs. If they consider it, read `references/worktree.md` and explain what it costs before they choose.
5. Note the starting branch and commit (`git branch --show-current`, `git rev-parse --short HEAD`).
   - If `git rev-parse HEAD` fails, the repository has no commits: offer the initial commit from step 1 before going on.
   - If `git branch --show-current` returns nothing, the user is not on any branch (detached HEAD: they have a loose commit checked out, not a branch). Explain this and ask which branch they want to start from. Without a starting branch, the closing instructions of Phase 6 do not work.
6. Choose the branch name:
   - If the project documents a convention (in `CLAUDE.md`, `CONTRIBUTING`, or what `git branch -a` shows), follow it; for example `chore/cleanup-YYYY-MM-DD`.
   - If there is none, use `cleanup/YYYY-MM-DD`.
   - With today's date; if it already exists, add `-2`, `-3`...
7. For the report, propose creating a `.cleanup/` folder at the root of wherever the work happens and adding it to `.git/info/exclude` (not to `.gitignore`). That way the report stays on the user's machine but never enters a commit or clutters the repo.
8. Before creating anything, say in one sentence what you are about to create (the branch, the worktree if any, the `.cleanup/` folder and the line in `.git/info/exclude`) and, with a worktree, which command will install the dependencies. Wait for the go-ahead. Installing dependencies downloads packages and runs their install scripts, so it falls under the rule of not running code without permission. Then:
   1. Same folder: `git switch -c <branch>`. Worktree: the steps under "Creating it" in `references/worktree.md`.
   2. Create the `.cleanup/` folder and add the line `.cleanup/` to `.git/info/exclude` (in a worktree, at the path given in `references/worktree.md`).

Explain to the user in two or three sentences what you have done and how to go back. In the same folder, `git switch <original-branch>` brings back their usual version. With a worktree, their folder never changed: they just do not open the other one.

## Phase 1: Understand the project and measure the starting point

1. Read `CLAUDE.md`, `README` and the configuration files (`package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, lint and formatter configuration...). Respect the project's conventions even when they differ from your preferences.
2. Find out which checks exist: tests, lint, type checking, build. Look for the real scripts (for example `scripts` in `package.json`); do not invent them. Split them into two groups and note this in the baseline:
   - **Fast** (seconds): unit tests, lint, types, build. They run on every block.
   - **Slow** (minutes): mostly end-to-end tests, which drive the app the way a person would (Playwright, Cypress). They run for the baseline, on blocks that change something visible, and at the end (Phase 6).
3. **Running servers.** Many end-to-end tests start the app or, if one is already open on their port, connect to it (in Playwright, `reuseExistingServer`). If the user has `npm run dev` or similar open, the tests may end up testing that app instead of the branch's code, and nothing will fail. Before running them, ask whether a development server is open and ask the user to stop it while they run.
4. **Run all those checks, the slow ones included, before touching anything**, and save the result and the exact commands you used in `.cleanup/baseline.md`, so they are repeated the same way on every block and in a new session. If something was already failing, it is on record and will not be mistaken for a failure caused by the cleanup. Also note a few measurements that come free with what you already run: line count of the main files, build size, number of tests and of linter warnings. At the end they show what changed.
   - **Save the full output to a file and read only the summary.** Redirect each check to a file in `.cleanup/` (for example `.cleanup/tests.log`) and read only the last lines or the pass/fail count. Open the details only if something fails. The same in Phase 5: test output, repeated on every block, is one of the biggest context costs.
   - If a test fails, run it a second time. If it passes the second time, mark it as **flaky**: a later failure of it is not enough to revert a block.
   - When done, `git status --porcelain` must come out clean (the `.cleanup/` folder does not show because it is excluded). If the checks modified files tracked by git (test snapshots, generated files), tell the user, note it in the baseline and restore them with `git restore -- :/` before the first block. Otherwise those changes would end up mixed into the cleanup commits. If what shows up is new files the checks created (test reports, for example), note them and add them to no commit. In Phase 5 this is done differently (step 4), because by then there are uncommitted block changes.
5. If the project has no tests and no build, say so plainly: the safety net will be weaker. Propose how to verify by hand (starting the app, the `/verify` skill if the session has it) and adjust Phase 4 to be more conservative.
6. If the project is large (hundreds of files), propose narrowing it down: by folder, or starting with what is used most. A partial cleanup done well is worth more than a complete one done halfway.
7. Decide what stays **out of the analysis**: everything in `.gitignore`, generated code (`dist/`, `build/`, `out/`, `coverage/`), third-party code copied into the repo (`vendor/`, `third_party/`), minified files (`*.min.js`, `*.min.css`) and lock files. If you are unsure whether something is generated, ask.

## Phase 2: Inventory of what is already installed

Before looking for anything new, make use of what the user already has. There are three sources:

1. **This session's skill list.** It is already in your context (available skills and subagent types). It is the main source.
2. **The inventory script**, which also finds what is not loaded, the subagents, and the plugins in marketplaces already added. Use it with a filter so you do not get hundreds of lines:
   ```bash
   node "<path-to-this-skill>/scripts/skill-inventory.mjs" --project "<project root>" --search "simplif,cleanup,clean up,refactor,lint,dead code"
   ```
   The filter matches at the start of a word (`simplif` finds `simplify` and `simplification`), sorts by relevance and shows at most 15 results per section (`--max <n>` to change that). It also marks disabled plugins. In a worktree, see `references/worktree.md` for which folder to pass as `--project`. If `node` is not available, look by hand at `~/.claude/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, `~/.claude/agents/*.md` and `~/.claude/plugins/`.
3. **The skills bundled with Claude Code**, such as `/simplify`, `/code-review`, `/verify` or `/debug`, if they appear in the session. Do not assume they exist: check the list.

Pick only the ones that add something to this cleanup, for example:

| What for | What to look for |
|---|---|
| Simplify code without changing behaviour | `/simplify`, the `code-simplifier` plugin |
| Review level 2 blocks that touch logic | `/code-review`, `code-reviewer`-type subagents |
| Check that the app still works | `/verify`, `verification-before-completion` |
| If something fails after a block | `systematic-debugging`, `/debug` |
| Stack rules (React, Python...) | best-practice skills for the language or framework |
| Close the branch at the end | `finishing-a-development-branch` |

Show the user a short table: skill, where it comes from, what you will use it for. When you use one, actually invoke it with the skill tool instead of imitating what you think it says. A plugin the script marks as disabled is not available: if it would help, tell the user how to enable it. Write the selection into `.cleanup/report.md`, so a new session uses the same ones without repeating this phase.

## Phase 3: Look for new skills (optional)

First ask whether the user wants to look for new skills or would rather work with what they have. Explain that searching takes a few minutes and downloads the search tool from npm.

- If they do not want to, go to Phase 4.
- If they do, read `references/find-skills.md` and follow its steps.

This phase never blocks the cleanup: with no network or nothing approved, carry on with what is installed.

## Phase 4: Analysis and a plan in blocks

Go through the code and sort every finding into one of three levels. Use the project's own tools where they exist (its linter, its formatter). External tools such as `knip`, `depcheck`, `ts-prune`, `ruff` or `vulture` are very good at finding dead code, but they download and run code: mention them in the plan and use them only if the user agrees.

If the project has no linter, propose a one-off pass: install the language's linter (ESLint, `ruff`...) in a temporary folder **outside the repository**, run it once over the code and leave nothing installed or added. It tends to find unused variables, duplicate keys and real bugs in one go. It needs the user's permission, because it downloads code. If it turns out useful, adding the linter to the project goes into the report as a recommendation, to be done later on its own branch, not inside the cleanup.

**Do not read whole files to search.** Locate with searches (`rg`, `git grep`), with the linter or with an exploration subagent, and read only the lines around each match. In a file thousands of lines long, reading it whole costs a lot and adds nothing.

**Level 1: safe and mechanical.** Unused imports and variables, with three exceptions that move to level 2:
- Imports that run just by loading, bringing in no name: `import "./styles.css"`, a polyfill, a module that registers something when imported.
- Imports that are really re-exports: in `__init__.py` or an `index.js`/`index.ts`, other files use them through that file.
- Variables whose value comes from a call (`const x = save()`): deleting the variable would also delete the call and what it does.

Also level 1: a key repeated inside the same object or dictionary literal in JavaScript or Python code. Only the last one counts, so removing the earlier ones changes nothing. In JSON or YAML it depends on the program that reads it (some raise an error): that is level 2.

**Level 2: needs judgement.**
- Duplicate functions that can be merged, very long functions, confusing names, convoluted conditionals.
- Files that seem unused and dependencies that seem unnecessary.
- Logs (`console.log`, `print`...): some are forgotten debugging, but others are the program's real output (a command-line tool, a server's log). Explain each case.
- Blocks of commented-out code: they may be there on purpose (an alternative, a feature switched off for now).
- Styles (CSS) that apply to no element. Removing them can change what is shown, so they need the visual check of Phase 5.
- Translation strings (i18n keys) that no code reads. Also check whether the code builds the key's name from text.
- Outdated comments and documentation: comments that no longer describe the code, or a `README` or `CLAUDE.md` that says something the code no longer does.
- Configuration options that have no effect (from a tool no longer used, or ignored by the installed version).
- Formatting: only with the formatter the project **already has configured**, never a new one. It goes in a block of its own, the last one, because it touches many lines and makes the diff hard to review.

**Level 3: report only, not applied.**
- Architecture changes and any behaviour change.
- Renaming or removing something code outside the repo may use. In a library or published package, an export nobody uses inside the repo may be used by another project.
- Upgrading dependency versions.
- Anything touching authentication, payments or stored data.
- Bugs found and secrets in the code.

Level 3 is not applied, but it has to be usable for fixing things later. Each finding carries:
- **Severity:** critical (data can be lost for good), high (data at risk or the app unusable in a plausible case), medium (wrong or misleading behaviour), low (cosmetic or code health).
- **Fix risk:** safe, needs the tests, or needs a manual check in the app.
- **Size:** XS (under 10 lines), S (10 to 40), M (40 to 150), L (over 150).
- File and lines, and how it was checked (reproduced, or only read in the code).

At the end, propose a **recommended order** in groups, each meant as separate work on its own branch, from most to least severe. In a mature project, level 3 may well be the most valuable part of the whole cleanup.

Before declaring a file, function, CSS class or key "unused", look for indirect references: dynamic imports, paths by file name, configuration, templates, tests, and above all names built from text (`"nav" + id` uses the class `navchallenges` even though that word is written nowhere). If you cannot prove it, move it to level 3.

Write the plan into `.cleanup/report.md` grouped in **blocks**: each block is a single topic (for example "remove unused imports") and small enough to review in a couple of minutes. Order them from lowest to highest risk, with formatting last. Show the user the plan's summary: number of blocks, what each does in one line, and the level 3 list.

**If the plan has more than about 8 blocks, propose splitting it across several sessions.** Every message resends the whole conversation, so one long session costs far more than several short ones. Propose to the user that they close this session once the plan is written in `.cleanup/report.md`, and apply a few blocks in each new session by reading the report (see "The user leaves halfway" under "If something goes wrong").

## Phase 5: Apply block by block

For each block, in order:

1. **Explain** in plain language what changes and why it improves the project. Show the affected files and a short before-and-after example.
2. **Ask**: apply, skip, or see the full change first. If the user has already said they approve every block of a given level, respect that and do not ask again for those.
3. **Apply** the change yourself, sticking to the block's topic. In level 2 blocks that touch logic you can lean on a selected simplification skill (`/simplify`, `code-simplifier`), but bear in mind that it works on whatever changes exist at that moment and applies fixes on its own: use it after your change, only on the block's files, and undo whatever it does outside the block's topic. Its result goes through the same checks as any other change.
   - If you use the `code-simplifier` subagent: it ships fixed style rules aimed at TypeScript (annotating return types, prop types, preferring `function` over arrow functions) that may not be the project's. Give it the conventions from the project's `CLAUDE.md` in the brief, tell it they override its own and that it must not change behaviour, and undo any change of its that does not follow them.
4. **Check**:
   - Re-run the **fast** checks from Phase 1 and compare them with the baseline. The slow ones only if the block changes something visible (styles, text, interface components); otherwise they wait for Phase 6. A failure of a test marked flaky does not count as a new failure unless it fails twice in a row.
   - Then look at `git status --porcelain`. If the checks modified files the block does not touch again (the same ones as in the baseline), restore them **one by one by name** (`git restore -- <file>`). Never with `:/` or `.` here: the block's change is not committed yet and would be undone too.
   - If the block removes styles or touches anything visible, the tests are not enough: they almost never check how things look. Compare the main screens before and after, with screenshots or with each element's computed styles, using the browser if the session has one. If it cannot be checked, do not apply the block: move it to level 3.
   - Only in level 2 blocks that touch logic (merging duplicates, splitting long functions, simplifying conditionals): if a review skill or subagent was selected (`/code-review`, `code-reviewer`), give it the block's diff. If it finds a behaviour change, drop that part of the block or undo the whole block. For the other blocks (imports, logs, commented-out code, formatting) the checks are enough: a review costs time and tokens and adds nothing.
   - If a new failure appears, undo the block with `git restore --staged --worktree -- :/` (the `:/` makes it cover the whole repository even from a subfolder; with `.` it would only undo the current folder) and delete by name only the new files that block created (never a blanket `git clean`, which could take the user's things with it). If the block touched dependencies (`package.json`, `requirements.txt`...), restoring those files does not put `node_modules` or the virtual environment back as they were: reinstall with the project's package manager (`npm ci` or `npm install`, `pip install -r requirements.txt`...). Tell the user what happened in one sentence and note it in the report. Do not try to fix it by improvising: if investigating makes sense, use `systematic-debugging`.
   - If everything is the same or better, carry on.
5. **Commit** that block alone: `git add` the files touched and a clear message in the language of the previous commits, which may not be the language of the conversation (check with `git log --oneline -10`), for example `chore: remove unused imports in src/`. One commit per block means any of them can be undone separately with `git revert`.
   - If a pre-commit hook rejects the commit, do not skip it. Read what it says:
     - If the block itself caused the failure, treat it as in step 4 (undo and note it).
     - If the failure already existed (it is in the baseline, for example a lint error in a file the block touched), the commit is blocked through no fault of the cleanup. Stop, explain it to the user and ask: drop that file from the block, skip the block, or let them decide what to do about the hook. Never `--no-verify` on your own.
6. Update `.cleanup/report.md` with the block's status (applied, skipped, reverted).

Between blocks, do not narrate every command. One line per finished block is enough.

## Phase 6: Wrap-up

1. Run **all** the checks, fast and slow, one last time on the complete branch, and take the Phase 1 measurements again for the report's before-and-after table. If a slow check fails here and did not fail in the baseline, the culprit is one of the blocks where it was not run. Since every block has its own commit, it can be found without undoing anything: explain `git bisect` to the user, which tries commits on the branch until it finds the first one that fails, and when done go back to the branch with `git bisect reset`. Do this only with their go-ahead. The guilty block is reverted with `git revert <commit>` and noted in the report.
2. Complete `.cleanup/report.md` with the structure in `references/report-template.md`.
3. Explain the user's options step by step, assuming nothing:
   - **Review** all the changes: `git diff <original-branch>...<cleanup-branch>`.
   - **Keep the cleanup**: go back to their branch (`git switch <original-branch>`) and merge it (`git merge <cleanup-branch>`). If they work with GitHub, better to open a pull request from the branch.
   - **Discard it**: go back to their branch and, if they want, delete the cleanup one (`git branch -D <cleanup-branch>`). Their original code was never touched.
   - **If a worktree was used**: also walk them through the "Wrap-up" section of `references/worktree.md` (merging from their main folder and removing the worktree without losing anything).
   - **Tidy up afterwards**: once they no longer need the report, they can delete the `.cleanup/` folder and remove its line from `.git/info/exclude`.
   Do not carry out any of these options on your own.
4. If `finishing-a-development-branch` is installed, offer it for this step.

## If something goes wrong

- A baseline check takes a very long time or needs external services (a database, keys): ask before running it and, if it cannot be run, carry on with the ones that work and say so.
- The user leaves halfway: the report and the commits already made keep the progress. On return:
  1. Find where the work was happening. If there is no `.cleanup/` in this folder, look at `git worktree list`: if a worktree was used, the report is in that other folder, and read `references/worktree.md` before going on.
  2. Check that you are on the cleanup branch (`git branch --show-current`) and that there are no stray changes (`git status --porcelain`). If the user switched branches or left changes in the meantime, explain it and ask before going on.
  3. Read `.cleanup/report.md` (the plan, the chosen skills, each block's status) and `.cleanup/baseline.md` (the check commands and their starting results), and carry on from the first pending block.
- A commit fails with "Please tell me who you are" or "Author identity unknown": git does not know the user's name or email, which is normal on a machine where it was never set up. Explain this and give them the two commands to run themselves with their own details (`git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`). Do not make them up or fill them in yourself: they are the user's details and they go into every commit.
- Unsure whether a change is safe: treat it as level 3. Better left in the report than something broken.
- The user asks halfway for a new feature or a fix: do not put it in a cleanup block, however small. Note it in the report and propose doing it later on its own branch. Mixed into the cleanup, it can no longer be reviewed or undone separately.
