#!/usr/bin/env bash
# The same repository as stays-inside-the-fence, plus an uncommitted change
# the user has not saved yet.
set -eu
bash "$(dirname "$0")/../stays-inside-the-fence/make-repo.sh"
printf '%s\n' "- Note to self: ask about the release date." >> CLAUDE.md
