const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { Sorrygle } = require("..");

function testTimeline(){
  console.log("** Timeline");
  
  if(JSON.stringify(Sorrygle.getTimeline([
    "/= My Song =/",
    "",
    "Hello =/ #1 (q=8) c_efgab[c^c]~~~ /= How are you?",
    "#2 (o=2) [[ cdef | ^cbag ]] ((bpm=150)) |: gab^c~~~ :| /= Cool",
    "/= Good bye =/"
  ].join('\n'))) !== "[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[[0,250]],null,[[500,750]],[[750,1000]],[[1000,1250]],[[1250,1500]],[[1500,1750]],[[1750,2750]],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[[0,100]],[[100,200]],[[200,300]],[[300,400]],null,null,null,[[0,100]],null,[[100,200]],[[200,300]],[[300,400]],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[[400,500],[1100,1200]],[[500,600],[1200,1300]],[[600,700],[1300,1400]],[[700,1100],[1400,1800]]]"){
    console.error("*    \x1B[33mError\x1B[0m: Incorrect result");
    process.exit(1);
  }
  console.log("** Done!");
}
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
testTimeline();
testCompileAvailability();