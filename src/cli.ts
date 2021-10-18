#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Sorrygle } from "./index";

const ROOT = resolve(__dirname, "..");
const PACKAGE = JSON.parse(readFileSync(`${ROOT}/package.json`).toString());

const enum Color{
  DEFAULT = "\x1B[0m",
  BLUE = "\x1B[36m",
  GREEN = "\x1B[32m",
  YELLOW = "\x1B[33m"
}
function main(...args:string[]):void{
  const head = `♪ ${Color.BLUE}Sorrygle compiler${Color.DEFAULT} v${PACKAGE['version']}`;
  const command = `${Color.YELLOW}sorrygle${Color.DEFAULT}`;
  const options:{
    'file'?: string,
    'ast'?: string,
    'raw': string[],
    'out': string,
    'maxGas'?: number
  } = {
    raw: [],
    out: "output.mid"
  };
  let outSet = false;
  if(!args.length){
    console.log([
      head + " ┐",
      `┌${"─".repeat(head.length - Color.BLUE.length - Color.DEFAULT.length)}┘`,
      `├ To compile from a string argument,`,
      `│ └ ${command} "cege[c^c]~~~"`,
      "│",
      `├ ${g("--ast")}     To retrieve the AST of your input,`,
      `│ ├ ${command} --ast output.json "cege[c^c]~~~"`,
      `│ └ If you omit --out, you won't get a MIDI file.`,
      "│",
      `├ ${g("--file")}    To compile from a file,`,
      `│ ├ ${command} --file input.srg`,
      `| └ or shortly -f`,
      "│",
      `├ ${g("--out")}     To determine the output file,`,
      `│ ├ ${command} --file input.srg --out output.mid`,
      `│ └ or shortly -o`,
      "│",
      `├ ${g("--max-gas")} To limit resource usage (default: 100000)`,
      "│",
      `└ Got a problem? 👉 ${PACKAGE['bugs']['url']}`
    ].join('\n'));
    process.exit(1);
  }
  for(let i = 0; i < args.length; i++){
    switch(args[i]){
      case "-f": case "--file":
        options.file = args[i + 1];
        i++;
        break;
      case "-o": case "--out":
        outSet = true;
        options.out = args[i + 1];
        i++;
        break;
      case "--ast":
        options.ast = args[i + 1];
        i++;
        break;
      case "--max-gas":
        options.maxGas = parseInt(args[i + 1]);
        i++;
        break;
      default:
        options.raw.push(args[i]);
    }
  }
  let input:string;

  if(options.maxGas){
    Sorrygle.MAX_GAS = options.maxGas;
  }
  if(options.file){
    console.log(`📥 Reading from   ${Color.YELLOW}${options.file}${Color.DEFAULT}...`);
    input = readFileSync(options.file).toString();
  }else{
    console.log(`📥 Reading from   ${Color.YELLOW}stdin${Color.DEFAULT}...`);
    input = options.raw.join('');
  }
  if(options.ast){
    console.log(`📤 Writing AST to ${Color.YELLOW}${options.ast}${Color.DEFAULT}...`);
    writeFileSync(options.ast, JSON.stringify(Sorrygle.parse(input), null, 2));
    if(!outSet){
      return;
    }
  }
  console.log(`📤 Writing to     ${Color.YELLOW}${options.out}${Color.DEFAULT}...`);
  writeFileSync(options.out, Sorrygle.compile(input));
}
function g(text:string):string{
  return `${Color.GREEN}[${text}]${Color.DEFAULT}`;
}
main(...process.argv.slice(2));
