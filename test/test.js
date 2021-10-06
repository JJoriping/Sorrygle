const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { Sorrygle } = require("..");

function testCompileAvailability(){
  console.log("** Compile Availability");
  for(const v of readdirSync("./test")){
    if(!v.endsWith(".srg")){
      continue;
    }
    const time = Date.now();
    let buffer;

    console.log(`*    Test: ${v}`);
    try{
      buffer = Sorrygle.compile(readFileSync(`./test/${v}`).toString());
    }catch(e){
      console.error(`*    \x1B[33mError\x1B[0m: ${e.stack}`);
      process.exit(1);
    }
    console.log(`*    \x1B[32m✔ Pass\x1B[0m (${Date.now() - time}㎳)`);
    writeFileSync(`./test/${v.replace(".srg", ".mid")}`, buffer);
  }
  console.log("** Done!");
}
testCompileAvailability();