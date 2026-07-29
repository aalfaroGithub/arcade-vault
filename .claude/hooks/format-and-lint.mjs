#!/usr/bin/env node
// PostToolUse hook (Write|Edit) for Arcade Vault only.
// Formats the touched file with Prettier and, for JS/TS files, runs
// `eslint --fix`. Never blocks the turn: any error just exits 0 silently,
// except remaining ESLint errors, which are surfaced back to Claude as
// additionalContext.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const LINTABLE_EXTS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const EXCLUDED_DIRS = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}.git${path.sep}`,
];

function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function main() {
  const raw = readStdin();
  if (!raw) return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const filePath =
    payload?.tool_response?.filePath ?? payload?.tool_input?.file_path;
  if (!filePath || typeof filePath !== "string") return;

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(PROJECT_ROOT, filePath);

  const relative = path.relative(PROJECT_ROOT, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return; // outside project
  const normalized = `${path.sep}${relative}${path.sep}`;
  if (EXCLUDED_DIRS.some((dir) => normalized.includes(dir))) return;

  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  // shell:true does NOT escape array args on Windows (Node just joins them
  // with spaces), so paths containing spaces must be quoted ourselves.
  const quote = (arg) => `"${arg.replace(/"/g, '\\"')}"`;

  spawnSync(
    npxCmd,
    ["prettier", "--write", "--ignore-unknown", quote(absolutePath)],
    {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: "ignore",
    },
  );

  const ext = path.extname(absolutePath).toLowerCase();
  if (LINTABLE_EXTS.has(ext)) {
    const eslintResult = spawnSync(
      npxCmd,
      ["eslint", "--fix", quote(absolutePath)],
      {
        cwd: PROJECT_ROOT,
        shell: true,
        encoding: "utf-8",
      },
    );

    if (eslintResult.status !== 0) {
      const output =
        `${eslintResult.stdout ?? ""}${eslintResult.stderr ?? ""}`.trim();
      if (output) {
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "PostToolUse",
              additionalContext: `ESLint encontró errores que no pudo autocorregir en ${relative}:\n${output}`,
            },
          }),
        );
      }
    }
  }
}

try {
  main();
} catch {
  // Never block the turn on unexpected errors.
}
process.exit(0);
