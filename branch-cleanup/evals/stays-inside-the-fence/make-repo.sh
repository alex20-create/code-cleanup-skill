#!/usr/bin/env bash
# Builds the test repository in the current folder: main with some deliberately
# untidy old code, and feat/hover adding new code with its own untidiness and
# one orphan (the fadeOld keyframes and the comment that names them).
set -eu
git init -q -b main .
git config user.name "Fixture"
git config user.email "fixture@example.com"
git config core.autocrlf false

cat > package.json <<'EOF'
{ "name": "fence-fixture", "private": true, "type": "module", "scripts": { "test": "node test.mjs" } }
EOF

cat > CLAUDE.md <<'EOF'
# CLAUDE.md

- Checks: `npm test` (fast, milliseconds). There are no end-to-end tests and no dev server.
- Commits: Conventional Commits, imperative, lowercase, English.
EOF

cat > app.js <<'EOF'
function oldHelper(x) {
  return x * 2;
}

export function total(items) {
  console.log("total called");
  return items.reduce((a, b) => a + b, 0);
}

// export function legacy() { return 1; }
EOF

cat > styles.css <<'EOF'
@keyframes fadeOld { from { opacity: 0; } to { opacity: 1; } }

/* Cards fade in with fadeOld. */
.card { animation: fadeOld .3s; border: 1px solid #ccc; }

.unusedOld { color: red; }
EOF

cat > index.html <<'EOF'
<!doctype html>
<html data-theme="dark">
<link rel="stylesheet" href="styles.css">
<div class="card"><button class="btn">Add</button><span class="chip">Tag</span></div>
<script type="module" src="app.js"></script>
</html>
EOF

cat > test.mjs <<'EOF'
import assert from "node:assert/strict";
import { total } from "./app.js";
assert.equal(total([1, 2, 3]), 6);
console.log("ok");
EOF

git add -A
git commit -q -m "feat: first version"

git switch -q -c feat/hover

cat >> app.js <<'EOF'

export function average(items) {
  console.log("debug avg", items);
  // const result = items.length ? total(items) / items.length : 0;
  return items.length ? total(items) / items.length : 0;
}
EOF

cat > styles.css <<'EOF'
@keyframes fadeOld { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeNew { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* Cards fade in with fadeOld. */
.card { animation: fadeNew .5s; border: 1px solid #ccc; }

.unusedOld { color: red; }

[data-theme="dark"] .btn:hover { background: #333; border-color: var(--accent); }
[data-theme="dark"] .chip:hover { background: #333; border-color: var(--accent); }
[data-theme="light"] .btn:hover { background: #eee; border-color: var(--accent); }
[data-theme="light"] .chip:hover { background: #eee; border-color: var(--accent); }
EOF

cat > test.mjs <<'EOF'
import assert from "node:assert/strict";
import { total, average } from "./app.js";
assert.equal(total([1, 2, 3]), 6);
assert.equal(average([2, 4]), 3);
assert.equal(average([]), 0);
console.log("ok");
EOF

git add -A
git commit -q -m "feat: hover colours and an average"
