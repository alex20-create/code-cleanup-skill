# Working in a worktree

You only get here if the user is considering a worktree (Phase 0, step 4) or the session already runs in one (Phase 0, step 2). A worktree is a second folder of the same repository with another branch checked out: it shares the history, but each folder has its own files.

## What it costs (explain before they choose)

- **Conflicts when merging.** The worktree starts from the last commit, **without** the pending changes. If those changes and the cleanup touch the same files, merging the cleanup branch later will make git ask for conflicts to be resolved by hand, which is the hardest thing to diagnose. Compare the files in `git status --porcelain` with what the user asked to clean (the whole project or one folder). If they overlap, and with the whole project they almost always do, recommend committing the pending work first instead of the worktree. If they do not overlap, the worktree is safe.
- **Dependencies and `.env`.** The new folder does not bring what git ignores: dependencies (`node_modules`, the Python virtual environment...) or `.env`. Dependencies have to be reinstalled, which takes time, space and network. The user copies any `.env` by hand if the tests need it; you do not touch it.
- **Running servers.** The Phase 1 warning (step 3) weighs more here: if the user keeps working in their main folder with the development server open, the worktree's tests would connect to that server, which serves the code of **the other folder**, and everything would pass without the cleanup having been tested. Ask them to stop it before every round of slow tests, not just at the start.
- **The branch lives in one folder only.** While the worktree exists, the cleanup branch cannot be checked out in their main folder: `git switch` will fail with something like "is already used by worktree" or "already checked out", depending on the git version. To see it, they open the other folder.
- **Cleaning it up at the end** with `git worktree remove` (see "Wrap-up").

## If the session is already in a worktree

Tell the user: their changes here do not affect their main folder. Create the cleanup branch in this folder and do not offer another worktree. The "Running servers" warning applies all the same.

## Creating it

1. `git worktree add ../<project>-cleanup -b <branch>`, next to the project's folder. Work from there for the rest of the cleanup and note the path for the report.
2. Reinstall the dependencies with the project's package manager (`npm install`, `pip install -r requirements.txt`...) before Phase 1. This must already have been approved in Phase 0, step 8.
3. Inside a worktree `.git` is a file, not a folder: the `.cleanup/` line goes in `<git-common-dir>/info/exclude`, with the path from `git rev-parse --git-common-dir`. That file applies to every worktree of the repository.
4. In Phase 2, pass the project's main folder to the inventory script as `--project`, not the worktree's: plugins installed only for the project are registered under that path.

## Wrap-up (Phase 6)

- **Merging or opening a pull request** works the same, from their main folder. If they still have uncommitted changes there (often the reason for the worktree), they should commit them before `git merge`: with half-done changes in the same files, git refuses to merge.
- **Removing the worktree:** `git worktree remove ../<project>-cleanup` deletes that folder, report included, so they should first copy whatever they want to keep. It has to be removed before the cleanup branch can be deleted.
  - Before the command, run `git status --porcelain` inside the worktree. If anything shows up, git will refuse with "contains modified or untracked files, use --force": tell the user which files they are, and do not use `--force` without their yes, because it would delete them too.
  - If someone deletes the folder by hand, `git worktree prune` cleans up the record left behind.
