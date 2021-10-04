#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Sorrygle } from ".";

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
    'stdin': string[],
    'out': string
  } = {
    stdin: [],
    out: "output.mid"
  };
  if(!args.length){
    console.log([
      head + " ┐",
      `┌${"─".repeat(head.length - Color.BLUE.length - Color.DEFAULT.length)}┘`,
      `├ To compile from stdin,`,
      `│ └ ${command} "cege[vcc]~~~"`,
      "|",
      `├ ${g("--file")} To compile from a file,`,
      `│ ├ ${command} --file input.srg`,
      `| └ or shortly -f`,
      "|",
      `├ ${g("--out")}  To determine the output file,`,
      `│ ├ ${command} --file input.srg --out output.mid`,
      `| └ or shortly -o`,
      "|",
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
        options.out = args[i + 1];
        i++;
        break;
      default:
        options.stdin.push(args[i]);
    }
  }
  let buffer:Buffer;

  if(options.file){
    console.log(`📥 Reading from ${Color.YELLOW}${options.file}${Color.DEFAULT}...`);
    buffer = Sorrygle.compile(readFileSync(options.file).toString());
  }else{
    console.log(`📥 Reading from ${Color.YELLOW}stdin${Color.DEFAULT}...`);
    buffer = Sorrygle.compile(options.stdin.join(''));
  }
  console.log(`📤 Writing to   ${Color.YELLOW}${options.out}${Color.DEFAULT}...`);
  writeFileSync(options.out, buffer);
}
function g(text:string):string{
  return `${Color.GREEN}[${text}]${Color.DEFAULT}`;
}
main(...process.argv.slice(2));
