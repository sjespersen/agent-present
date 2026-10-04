#!/usr/bin/env node
/**
 * present-render — render a Present IR document in the terminal.
 *
 *   present-render doc.json
 *   cat doc.json | present-render --depth scan
 *   present-render doc.json --width 80 --ascii --no-color
 *   present-render doc.json --validate
 */
import { readFileSync } from "node:fs";
import { formatIssues, validate } from "@agent-present/core";
import type { Depth } from "./context.js";
import { renderDocument } from "./document.js";
import { ansiStyle, monochromeStyle, plainStyle } from "./style.js";

const HELP = `present-render [file] [options]

Renders a Present IR document (JSON) as a terminal infographic.
Reads stdin when no file is given.

  --depth <glance|scan|explore>   information depth (default: glance)
  --width <n>                     columns (default: terminal width or 100)
  --ascii                         ASCII only, no Unicode graphics
  --no-color                      no colour (also honours NO_COLOR)
  --mono                          bold but no colour
  --validate                      print schema validation issues and exit
  -h, --help                      show this help`;

function main(argv: string[]): number {
  const args = [...argv];
  const flag = (name: string) => {
    const i = args.indexOf(name);
    if (i < 0) return false;
    args.splice(i, 1);
    return true;
  };
  const option = (name: string) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const value = args[i + 1];
    args.splice(i, 2);
    return value;
  };
  if (flag("-h") || flag("--help")) {
    console.log(HELP);
    return 0;
  }
  const depth = (option("--depth") ?? "glance") as Depth;
  const width = Number(option("--width") ?? process.stdout.columns ?? 100) || 100;
  const ascii = flag("--ascii");
  const noColor = flag("--no-color") || Boolean(process.env.NO_COLOR);
  const mono = flag("--mono");
  const onlyValidate = flag("--validate");
  const file = args[0];

  const source = file && file !== "-" ? readFileSync(file, "utf8") : readFileSync(0, "utf8");
  let doc: unknown;
  try {
    doc = JSON.parse(source);
  } catch (error) {
    console.error(`present-render: invalid JSON: ${(error as Error).message}`);
    return 2;
  }

  const result = validate(doc);
  if (onlyValidate) {
    if (result.errors.length) console.log(`errors:\n${formatIssues(result.errors)}`);
    if (result.warnings.length) console.log(`warnings:\n${formatIssues(result.warnings)}`);
    if (result.valid && !result.warnings.length) console.log("valid Present IR");
    return result.valid ? 0 : 1;
  }

  const truecolor = /truecolor|24bit/i.test(process.env.COLORTERM ?? "");
  const style = noColor ? plainStyle() : mono ? monochromeStyle() : ansiStyle({ depth: truecolor ? "truecolor" : "ansi16" });
  const lines = renderDocument(doc, { width, depth, unicode: !ascii, style });
  process.stdout.write(`\n${lines.join("\n")}\n\n`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
