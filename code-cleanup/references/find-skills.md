# Looking for new skills

You only get here if the user has said they want to search. The open skills ecosystem is searched with the `skills` CLI (registry at skills.sh), and Claude Code's official plugins through the `claude-plugins-official` marketplace.

1. **Ask for permission before the first `npx`.** Explain that `npx -y skills ...` downloads the `skills` package from npm and runs it on their machine, and wait for a yes. If they say no, the search ends here: what is installed and the marketplaces already added came out in the Phase 2 inventory. Go back to Phase 4.
2. Run two or three searches with words from the project's real stack, from most specific to most general:
   ```bash
   npx -y skills find "react best practices"
   npx -y skills find "python refactor"
   ```
   Always give a search term: `npx skills find` with no term opens an interactive search that waits for the keyboard and would hang. If results come up, you can see what each candidate contains without installing it with `npx -y skills add <owner/repo> --list`.
3. **"No skills found" does not mean nothing exists.** It may be a network failure. If every search comes back empty, try a web search (`skills.sh <topic>`) before concluding there are no candidates, and tell the user exactly that.
4. Filter with judgement. Drop whatever duplicates something already installed. Prefer known sources (Anthropic, the framework's official maintainers, repos with many installs). Before proposing a skill, read its `SKILL.md` without installing it, on GitHub (`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path-to-skill>/SKILL.md`; the path comes from the repository's page), and check whether it ships scripts that run: a third-party skill can run commands on the user's machine.
5. Present at most five candidates with: name, what it would do in this cleanup, source, number of installs if available, link, and whether it runs scripts. Ask which to install (multiple choice, with a "none" option).
6. **Install only the approved ones**:
   - Registry skills: `npx -y skills add <owner/repo> --skill <name> -g -a claude-code -y` (global, so no files land in the project's repo). On Windows add `--copy`: by default the CLI creates symbolic links, and on Windows creating them may need special permissions. If the new skill does not then appear in the session's skill list, the session needs a restart: tell the user.
   - Marketplace plugins: ask the user to type `/plugin install <plugin>@<marketplace>` and warn them that a new plugin's subagents only appear after restarting the session.
7. If nothing is approved or there is no network, go back to Phase 4 with what is installed.
