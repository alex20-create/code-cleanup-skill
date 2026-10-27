# Report template

Structure of `.cleanup/report.md` when the cleanup closes (Phase 6). Write it in the user's language, translating the headings too:

```markdown
# Cleanup report: <project> (<date>)

## Summary
Branch: <cleanup-branch> · started from <branch> @ <commit>
Folder: <the project's / worktree at <path>>
Blocks applied: X · skipped: Y · reverted: Z
Checks: <same as baseline / improved / what changed>
Flaky tests: <none / which>

## Measurements
| Measurement | Before | After |
(line count of the main files, build size, tests, linter warnings)

## Blocks
| # | Topic | Status | Commit |

## Pending (deliberately not applied)
Level 3 findings, from most to least severe. Each with: severity, fix risk, size, file and lines, and how it was checked.

### Recommended order
Numbered groups, each meant as separate work on its own branch.

## Decisions taken
What the user decided during the cleanup (skipped blocks, dropped findings) and why.

## Uncertain findings
What looks like a problem but could not be confirmed, and why.

## What could not be checked
Checks that were not run or do not cover something (other browsers, external services, how the app looks...).

## Parked requests
Features or fixes the user asked for during the cleanup, to be done on their own branch.

## Skills used
Installed beforehand and new, and what each one was for.
```
