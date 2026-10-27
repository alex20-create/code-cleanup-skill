#!/usr/bin/env node
// Inventory of Claude Code skills, subagents and plugins.
//
// Usage:
//   node skill-inventory.mjs [--project <path>] [--search "word1,word2"] [--max <n>] [--json]
//
// Lists:
//   - personal skills        (~/.claude/skills/*/SKILL.md)
//   - project skills         (<project>/.claude/skills/*/SKILL.md)
//   - skills of installed plugins (only the installed version, not older ones left in the cache)
//   - personal, project and plugin subagents (agents/*.md)
//   - plugins in marketplaces already added that are not installed yet
// Marks plugins disabled in enabledPlugins (settings.json).
// With --search it filters by those words (at the start of a word, in name or description),
// sorts by relevance and shows at most --max results per section (15 by default).
// Read-only: it installs and changes nothing.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`Warning: ${name} needs a value; ignored.`);
    return undefined;
  }
  return value;
};
const project = path.resolve(opt("--project") ?? process.cwd());
const words = (opt("--search") ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const max = words.length ? Number(opt("--max") ?? 15) || 15 : Infinity;
const asJson = args.includes("--json");

const claudeHome = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
const pluginsDir = path.join(claudeHome, "plugins");

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readJson(file) {
  try {
    return JSON.parse(read(file) ?? "null");
  } catch {
    return null;
  }
}

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text ?? "");
  if (!m) return {};
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      data[key] = kv[2].replace(/^["'>|-]\s*|["']$/g, "").trim();
    } else if (key && /^\s+\S/.test(line)) {
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }
  return data;
}

function entriesOf(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function skillsIn(dir, source) {
  const out = [];
  for (const e of entriesOf(dir)) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    const file = path.join(dir, e.name, "SKILL.md");
    const text = read(file);
    if (!text) continue;
    const fm = frontmatter(text);
    out.push({
      source,
      name: fm.name || e.name,
      description: fm.description || "",
      path: file,
      hasScripts: fs.existsSync(path.join(dir, e.name, "scripts")),
    });
  }
  return out;
}

function agentsIn(dir, source) {
  const out = [];
  for (const e of entriesOf(dir)) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const file = path.join(dir, e.name);
    const fm = frontmatter(read(file));
    out.push({
      source,
      name: fm.name || e.name.replace(/\.md$/, ""),
      description: (fm.description || "").replace(/\\n/g, " "),
      path: file,
    });
  }
  return out;
}

// Finds folders with a given name ("skills", "agents") inside a plugin, to a limited depth.
function foldersNamed(base, name, depth = 4) {
  const found = [];
  const visit = (dir, level) => {
    if (level > depth) return;
    for (const e of entriesOf(dir)) {
      if (!e.isDirectory() || e.name === "node_modules" || e.name === ".git") continue;
      const p = path.join(dir, e.name);
      if (e.name === name) found.push(p);
      else visit(p, level + 1);
    }
  };
  visit(base, 0);
  return found;
}

// enabledPlugins: the project's settings override the personal ones.
const enabled = {};
for (const settings of [
  path.join(claudeHome, "settings.json"),
  path.join(project, ".claude", "settings.json"),
  path.join(project, ".claude", "settings.local.json"),
]) {
  Object.assign(enabled, readJson(settings)?.enabledPlugins ?? {});
}
const stateOf = (key) =>
  enabled[key] === true ? "enabled" : enabled[key] === false ? "disabled" : "unknown";

// Installed plugins and the folder of the version in use.
// Entries with "project" or "local" scope only count if they belong to this project.
const installedJson = readJson(path.join(pluginsDir, "installed_plugins.json"));
const installedMap = installedJson?.plugins ?? installedJson ?? {};
const installed = [];
for (const [key, value] of Object.entries(installedMap)) {
  const list = Array.isArray(value) ? value : [value];
  const entry = list.find(
    (x) =>
      x?.installPath &&
      (!x.projectPath || path.resolve(x.projectPath).toLowerCase() === project.toLowerCase()),
  );
  if (entry) installed.push({ key, folder: entry.installPath });
}

// Without installed_plugins.json: walk the cache and, per plugin, use the most recently modified version.
if (!installed.length) {
  const cache = path.join(pluginsDir, "cache");
  for (const market of entriesOf(cache)) {
    if (!market.isDirectory()) continue;
    for (const plugin of entriesOf(path.join(cache, market.name))) {
      if (!plugin.isDirectory()) continue;
      const base = path.join(cache, market.name, plugin.name);
      const versions = entriesOf(base)
        .filter((v) => v.isDirectory())
        .map((v) => path.join(base, v.name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      if (versions.length) installed.push({ key: `${plugin.name}@${market.name}`, folder: versions[0] });
    }
  }
}

const skills = [
  ...skillsIn(path.join(claudeHome, "skills"), "personal"),
  ...skillsIn(path.join(project, ".claude", "skills"), "project"),
];
const agents = [
  ...agentsIn(path.join(claudeHome, "agents"), "personal"),
  ...agentsIn(path.join(project, ".claude", "agents"), "project"),
];
// A plugin can repeat the same skill or subagent in several folders: it is counted once.
const seen = new Set();
const addOnce = (list, x) => {
  const id = `${list === skills ? "s" : "a"}:${x.source}:${x.name}`;
  if (seen.has(id)) return;
  seen.add(id);
  list.push(x);
};
for (const { key, folder } of installed) {
  const state = stateOf(key);
  for (const dir of foldersNamed(folder, "skills")) {
    for (const s of skillsIn(dir, `plugin ${key}`)) addOnce(skills, { ...s, state });
  }
  for (const dir of foldersNamed(folder, "agents")) {
    for (const a of agentsIn(dir, `plugin ${key}`)) addOnce(agents, { ...a, state });
  }
}

// Plugins available in marketplaces already added.
const installedNames = new Set(installed.map((p) => p.key.split("@")[0]));
const available = [];
const marketplaces = entriesOf(path.join(pluginsDir, "marketplaces")).filter((m) => m.isDirectory());
for (const m of marketplaces) {
  const j = readJson(path.join(pluginsDir, "marketplaces", m.name, ".claude-plugin", "marketplace.json"));
  for (const p of j?.plugins ?? []) {
    if (!p?.name || installedNames.has(p.name)) continue;
    available.push({
      name: p.name,
      marketplace: j.name ?? m.name,
      description: p.description ?? "",
      install: `/plugin install ${p.name}@${j.name ?? m.name}`,
    });
  }
}

// Match at the start of a word: "simplif" finds "simplify" and "simplification",
// but "lint" does not find "splinter".
const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = words.map((w) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(w)}`, "giu"));
const score = (x) => {
  let total = 0;
  for (const re of patterns) {
    total += 3 * (x.name.match(re)?.length ?? 0);
    total += x.description.match(re)?.length ?? 0;
  }
  return total;
};
const filter = (list) => {
  if (!words.length) return { shown: list, total: list.length };
  const matches = list
    .map((x) => ({ x, s: score(x) }))
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((e) => e.x);
  return { shown: matches.slice(0, max), total: matches.length };
};

const fSkills = filter(skills);
const fAgents = filter(agents);
const fAvailable = filter(available);

const result = {
  claudeHome,
  project,
  installedSkills: fSkills.shown,
  subagents: fAgents.shown,
  availablePluginsNotInstalled: fAvailable.shown,
  totals: { skills: fSkills.total, subagents: fAgents.total, availablePlugins: fAvailable.total },
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const short = (t) => (t.length > 140 ? `${t.slice(0, 137)}...` : t);
  const count = (f) => (f.shown.length < f.total ? `${f.shown.length} of ${f.total}` : `${f.total}`);
  const mark = (x) =>
    x.state === "disabled" ? " (plugin disabled)" : x.state === "unknown" ? " (plugin: enabled state unknown)" : "";
  console.log(`Claude Code configuration: ${claudeHome}`);
  console.log(`Project: ${project}`);
  if (words.length) console.log(`Filter: ${words.join(", ")} (sorted by relevance)`);
  console.log(`\nInstalled skills (${count(fSkills)}):`);
  for (const s of fSkills.shown) {
    console.log(`- [${s.source}] ${s.name}${s.hasScripts ? " (ships scripts)" : ""}${mark(s)}`);
    if (s.description) console.log(`    ${short(s.description)}`);
  }
  console.log(`\nSubagents (${count(fAgents)}):`);
  for (const a of fAgents.shown) {
    console.log(`- [${a.source}] ${a.name}${mark(a)}`);
    if (a.description) console.log(`    ${short(a.description)}`);
  }
  console.log(`\nPlugins in added marketplaces, not installed (${count(fAvailable)}):`);
  for (const p of fAvailable.shown) {
    console.log(`- ${p.name} (${p.marketplace}): ${short(p.description)}`);
    console.log(`    ${p.install}`);
  }
  if (!marketplaces.length) {
    console.log("  (No marketplaces added. The official one is added with /plugin marketplace add anthropics/claude-plugins-official)");
  }
}
