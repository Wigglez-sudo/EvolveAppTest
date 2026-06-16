#!/usr/bin/env node
/* ============================================================================
   Evolve — validate app shell
   Checks the core APP files for syntax, manifest validity and required security
   hardening markers used by the test build.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["index.html", "styles.css", "app.js", "data.js", "food-packs.js", "sw.js", "manifest.json", "README.md", "EVOLVE_HANDOFF.txt"];
let errors = 0;
function fail(msg){ console.error("✗ " + msg); errors++; }
function ok(msg){ console.log("✓ " + msg); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

for(const rel of FILES){
  if(!fs.existsSync(path.join(ROOT, rel))) fail(rel + " is missing");
  else ok(rel + " exists");
}

try {
  const manifest = JSON.parse(read("manifest.json"));
  if(!manifest.name || !manifest.start_url) fail("manifest.json missing required fields");
  else ok("manifest.json parses");
} catch (e) { fail("manifest.json invalid JSON: " + e.message); }

for(const rel of ["app.js", "data.js", "food-packs.js", "sw.js"]){
  try { new vm.Script(read(rel), { filename: rel }); ok(rel + " parses as JavaScript"); }
  catch (e) { fail(rel + " syntax error: " + e.message); }
}

const index = read("index.html");
if(!/Content-Security-Policy/i.test(index)) fail("index.html missing CSP");
else ok("index.html includes CSP");
if(!/referrer/i.test(index)) fail("index.html missing referrer policy");
else ok("index.html includes referrer policy");

const sw = read("sw.js");
if(!/FONT_ORIGINS/.test(sw)) fail("sw.js missing tightened cross-origin allowlist");
else ok("sw.js uses tightened cross-origin allowlist");

const app = read("app.js");
if(!/SECURITY_NOTICE_VERSION/.test(app)) fail("app.js missing security notice version");
else ok("app.js includes test-build security notice");
if(!/COACH_KEY_MODE_KEY/.test(app)) fail("app.js missing session/device Coach key mode support");
else ok("app.js includes Coach key mode support");
if(!/MAX_IMPORT_BYTES/.test(app)) fail("app.js missing stricter import size limits");
else ok("app.js includes stricter import size limits");

if(errors){
  console.error(`\n${errors} validation error(s).`);
  process.exit(1);
}
console.log("\nAll app-shell checks passed.");
