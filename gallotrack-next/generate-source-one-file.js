"use strict";

/**
 * GalloTrack - One-File Source Code Compiler
 * ------------------------------------------
 * Collects every text source file in this project into ONE labeled text file
 * that can be copied into Microsoft Word.
 *
 * Run by double-clicking GENERATE-GALLOTRACK-ONE-FILE.bat on the Desktop,
 * or with: node generate-source-one-file.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "GALLOTRACK-NEXT-SOURCE-CODE.txt");
const SCRIPT_NAME = path.basename(__filename);

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  ".turbo",
  ".idea",
  ".vscode",
  "coverage",
  "out",
  "build",
  "dist",
  ".pytest_cache",
  "__pycache__",
]);

const EXCLUDE_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.tsbuildinfo",
  "next-env.d.ts",
  "GALLOTRACK-NEXT-SOURCE-CODE.txt",
  SCRIPT_NAME,
  "GENERATE-GALLOTRACK-ONE-FILE.bat",
]);

const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".py",
  ".md",
  ".html",
  ".sql",
  ".txt",
  ".yml",
  ".yaml",
  ".svg",
]);

function isExcludedFile(name) {
  if (EXCLUDE_FILES.has(name)) return true;
  if (name.startsWith(".env")) return true; // never include secrets
  if (name.endsWith(".log")) return true;
  return false;
}

function collectFiles(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      collectFiles(full, acc);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!INCLUDE_EXT.has(ext)) continue;
    if (isExcludedFile(entry.name)) continue;
    acc.push(full);
  }
}

function classify(rel) {
  if (rel.startsWith("app/api/")) return { order: 1, group: "Frontend - API Route" };
  if (rel.startsWith("app/")) return { order: 1, group: "Frontend - App Router" };
  if (rel.startsWith("components/")) return { order: 2, group: "Frontend - React Component" };
  if (rel.startsWith("lib/")) return { order: 3, group: "Frontend - Library" };
  if (rel.startsWith("utils/")) return { order: 4, group: "Utility" };
  if (rel.startsWith("locales/")) return { order: 5, group: "Localization" };
  if (rel.startsWith("scripts/")) return { order: 6, group: "Developer Script" };
  if (rel.startsWith("public/")) return { order: 7, group: "Public Asset" };
  if (rel.startsWith("docs/")) return { order: 8, group: "Documentation" };
  return { order: 9, group: "Configuration / Documentation" };
}

function readSource(fullPath) {
  const raw = fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "");
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function countLines(content) {
  if (!content) return 0;
  return content.replace(/\n$/, "").split("\n").length;
}

function banner(index, total, file) {
  const line = "=".repeat(80);
  return [
    line,
    "FILE " + String(index).padStart(3, "0") + " of " + String(total).padStart(3, "0"),
    "PATH     : " + file.rel,
    "TYPE     : " + file.group,
    "LINES    : " + file.lines,
    line,
  ].join("\n");
}

function endBanner(index, file) {
  const line = "-".repeat(80);
  return [line, "END OF FILE " + String(index).padStart(3, "0") + " - " + file.rel, line].join("\n");
}

function main() {
  console.log("Scanning project...");

  const absoluteFiles = [];
  collectFiles(ROOT, absoluteFiles);

  const files = [];
  for (const full of absoluteFiles) {
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    try {
      const content = readSource(full);
      const meta = classify(rel);
      files.push({
        rel,
        content,
        lines: countLines(content),
        group: meta.group,
        order: meta.order,
      });
    } catch (err) {
      console.warn("[SKIP] " + rel + " (" + err.message + ")");
    }
  }

  files.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.rel.localeCompare(b.rel);
  });

  const totalFiles = files.length;
  const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
  const generated = new Date().toLocaleString();
  const bar = "=".repeat(80);

  const out = [];
  out.push(bar);
  out.push("GALLOTRACK-NEXT - COMPLETE SOURCE CODE");
  out.push(bar);
  out.push("Project     : GalloTrack - Gamefowl Management System");
  out.push("Description : Web-based pedigree and performance tracking system");
  out.push("Generated   : " + generated);
  out.push("Source root : " + ROOT);
  out.push("Total files : " + totalFiles);
  out.push("Total lines : " + totalLines.toLocaleString());
  out.push("");
  out.push("HOW TO USE THIS FILE");
  out.push("  1. Open this file in Notepad.");
  out.push("  2. Press Ctrl+A, then Ctrl+C.");
  out.push("  3. Paste into Microsoft Word (Ctrl+V).");
  out.push("  4. Select the code and set the font to Consolas, 8-9 pt.");
  out.push("  Each file starts on a new page (form feed) for clean printing.");
  out.push("");
  out.push("NOTE: Binary files (images, videos, node_modules, .next, .env secrets,");
  out.push("      lock files) are intentionally excluded.");
  out.push("");
  out.push("TABLE OF CONTENTS");
  out.push("-".repeat(80));

  files.forEach((file, i) => {
    const num = String(i + 1).padStart(3, "0");
    const linesLabel = file.lines + " lines";
    const dots = ".".repeat(Math.max(3, 70 - file.rel.length - linesLabel.length));
    out.push(num + ". " + file.rel + " " + dots + " " + linesLabel);
  });

  out.push("-".repeat(80));
  out.push("");

  files.forEach((file, i) => {
    out.push("\f");
    out.push(banner(i + 1, totalFiles, file));
    out.push("");
    out.push(file.content.replace(/\n$/, ""));
    out.push("");
    out.push(endBanner(i + 1, file));
    out.push("");
  });

  out.push(bar);
  out.push("END OF DOCUMENT - " + totalFiles + " files, " + totalLines.toLocaleString() + " lines");
  out.push(bar);

  fs.writeFileSync(OUT, out.join("\n"), "utf8");

  console.log("");
  console.log("[OK] Files scanned : " + totalFiles);
  console.log("[OK] Lines found   : " + totalLines.toLocaleString());
  console.log("[OK] One file      : " + path.basename(OUT));
  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("[ERROR] " + (error && error.message ? error.message : String(error)));
  process.exitCode = 1;
}
