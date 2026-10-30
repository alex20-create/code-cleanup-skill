#!/usr/bin/env bash
# Builds the test repository in the current folder. feat/nav-redesign stops
# writing two classes literally in index.html: .navbadge is truly orphaned,
# but .navchallenges is still produced at run time by "nav" + id in nav.js.
set -eu
git init -q -b main .
git config user.name "Fixture"
git config user.email "fixture@example.com"
git config core.autocrlf false

cat > package.json <<'EOF'
{ "name": "nav-fixture", "private": true, "type": "module", "scripts": { "test": "node test.mjs" } }
EOF

cat > CLAUDE.md <<'EOF'
# CLAUDE.md

- Checks: `npm test` (fast, milliseconds). There are no end-to-end tests and no dev server.
- Commits: Conventional Commits, imperative, lowercase, English.
EOF

cat > nav.js <<'EOF'
export function navClass(id) {
  return "nav" + id;
}
EOF

cat > menu.js <<'EOF'
import { navClass } from "./nav.js";

export const items = ["home", "challenges"].map((id) => ({ id, className: navClass(id) }));
EOF

cat > styles.css <<'EOF'
.navhome { color: #333; }
.navchallenges { color: #a06f30; }
.navbadge { background: #b00; border-radius: 999px; }
.navlink { text-decoration: none; }
EOF

cat > index.html <<'EOF'
<!doctype html>
<link rel="stylesheet" href="styles.css">
<nav><a class="navlink navchallenges" href="#challenges">Challenges</a><span class="navbadge">3</span></nav>
EOF

cat > test.mjs <<'EOF'
import assert from "node:assert/strict";
import { items } from "./menu.js";
assert.deepEqual(items.map((i) => i.className), ["navhome", "navchallenges"]);
console.log("ok");
EOF

git add -A
git commit -q -m "feat: first version"

git switch -q -c feat/nav-redesign

cat > index.html <<'EOF'
<!doctype html>
<link rel="stylesheet" href="styles.css">
<nav id="menu"></nav>
<script type="module">
  import { items } from "./menu.js";
  for (const item of items) {
    const a = document.createElement("a");
    a.className = "navlink " + item.className;
    a.href = "#" + item.id;
    a.textContent = item.id;
    document.getElementById("menu").append(a);
  }
</script>
EOF

git add -A
git commit -q -m "feat: build the nav from the menu items"
