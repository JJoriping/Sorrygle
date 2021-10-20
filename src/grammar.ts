// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

function e<T extends string|any[]|null>(value:T):T|undefined{
  if(!value || value.length === 0) return undefined;
  return value;
}

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: undefined,
  ParserRules: [
    {"name": "Main$ebnf$1$subexpression$1", "symbols": ["GlobalConfiguration"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$1", "symbols": ["EmojiDeclaration"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$1", "symbols": ["ChannelDeclaration"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$1", "symbols": ["UDRDefinition"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$1", "symbols": ["Repetition"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$1", "symbols": ["Stackable"], "postprocess": id},
    {"name": "Main$ebnf$1", "symbols": ["Main$ebnf$1$subexpression$1"]},
    {"name": "Main$ebnf$1$subexpression$2", "symbols": ["GlobalConfiguration"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$2", "symbols": ["EmojiDeclaration"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$2", "symbols": ["ChannelDeclaration"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$2", "symbols": ["UDRDefinition"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$2", "symbols": ["Repetition"], "postprocess": id},
    {"name": "Main$ebnf$1$subexpression$2", "symbols": ["Stackable"], "postprocess": id},
    {"name": "Main$ebnf$1", "symbols": ["Main$ebnf$1", "Main$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Main", "symbols": ["Main$ebnf$1"], "postprocess": id},
    {"name": "GlobalConfiguration$string$1", "symbols": [{"literal":"("}, {"literal":"("}], "postprocess": (d) => d.join('')},
    {"name": "GlobalConfiguration$string$2", "symbols": [{"literal":")"}, {"literal":")"}], "postprocess": (d) => d.join('')},
    {"name": "GlobalConfiguration", "symbols": ["GlobalConfiguration$string$1", "words", {"literal":"="}, "words", "GlobalConfiguration$string$2"], "postprocess": 
        (d, l) => ({ l, type: "global-configuration", key: d[1].value, value: d[3].value })
        },
    {"name": "ChannelDeclaration", "symbols": [{"literal":"#"}, "digits"], "postprocess": 
        (d, l) => ({ l, type: "channel-declaration", id: d[1].value })
        },
    {"name": "ChannelDeclaration$string$1", "symbols": [{"literal":"#"}, {"literal":"~"}], "postprocess": (d) => d.join('')},
    {"name": "ChannelDeclaration", "symbols": ["ChannelDeclaration$string$1", "digits"], "postprocess": 
        (d, l) => ({ l, type: "channel-declaration", id: d[1].value, continue: true })
        },
    {"name": "UDRDefinition$string$1", "symbols": [{"literal":"{"}, {"literal":"{"}], "postprocess": (d) => d.join('')},
    {"name": "UDRDefinition$string$2", "symbols": [{"literal":"}"}, {"literal":"}"}], "postprocess": (d) => d.join('')},
    {"name": "UDRDefinition$ebnf$1", "symbols": ["Stackable"]},
    {"name": "UDRDefinition$ebnf$1", "symbols": ["UDRDefinition$ebnf$1", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "UDRDefinition", "symbols": ["UDRDefinition$string$1", "words", "UDRDefinition$string$2", "__", {"literal":"{"}, "UDRDefinition$ebnf$1", {"literal":"}"}], "postprocess": 
        (d, l) => ({ l, type: "udr-definition", name: d[1].value, value: d[5] })
        },
    {"name": "LocalConfiguration", "symbols": [{"literal":"("}, "words", {"literal":"="}, "words", {"literal":")"}], "postprocess": 
        (d, l) => ({ l, type: "local-configuration", key: d[1].value, value: d[3].value })
        },
    {"name": "Stackable", "symbols": ["LocalConfiguration"], "postprocess": id},
    {"name": "Stackable", "symbols": ["EmojiReference"], "postprocess": id},
    {"name": "Stackable", "symbols": ["Range"], "postprocess": id},
    {"name": "Stackable", "symbols": ["Notation"], "postprocess": id},
    {"name": "Stackable", "symbols": ["Group"], "postprocess": id},
    {"name": "Stackable", "symbols": ["Parallelization"], "postprocess": id},
    {"name": "Stackable", "symbols": ["rest"], "postprocess": id},
    {"name": "Stackable", "symbols": ["_"], "postprocess": id},
    {"name": "EmojiDeclaration$string$1", "symbols": [{"literal":"("}, {"literal":"("}], "postprocess": (d) => d.join('')},
    {"name": "EmojiDeclaration$string$2", "symbols": [{"literal":")"}, {"literal":")"}], "postprocess": (d) => d.join('')},
    {"name": "EmojiDeclaration", "symbols": ["EmojiDeclaration$string$1", "emoji", {"literal":"="}, "__", "LocalConfiguration", "__", "EmojiDeclaration$string$2"], "postprocess": 
        (d, l) => ({ l, type: "emoji-declaration", key: d[1].join(''), value: d[4] })
        },
    {"name": "EmojiReference", "symbols": [{"literal":"("}, "emoji", {"literal":")"}], "postprocess": 
        (d, l) => ({ l, type: "emoji-reference", key: d[1].join('') })
        },
    {"name": "Range$ebnf$1", "symbols": ["Stackable"]},
    {"name": "Range$ebnf$1", "symbols": ["Range$ebnf$1", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Range", "symbols": [{"literal":"("}, "rangeType", "Range$ebnf$1", {"literal":")"}], "postprocess": 
        (d, l) => ({ l, type: "range", key: d[1], value: d[2] })
        },
    {"name": "Range$string$1", "symbols": [{"literal":"{"}, {"literal":"{"}], "postprocess": (d) => d.join('')},
    {"name": "Range$string$2", "symbols": [{"literal":"}"}, {"literal":"}"}], "postprocess": (d) => d.join('')},
    {"name": "Range$ebnf$2", "symbols": ["Stackable"]},
    {"name": "Range$ebnf$2", "symbols": ["Range$ebnf$2", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Range", "symbols": ["Range$string$1", "words", "Range$string$2", "__", {"literal":"("}, "Range$ebnf$2", {"literal":")"}], "postprocess": 
        (d, l) => ({ l, type: "range", udr: true, key: d[1].value, value: d[5] })
        },
    {"name": "Notation$ebnf$1", "symbols": ["Grace"], "postprocess": id},
    {"name": "Notation$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Notation", "symbols": ["Notation$ebnf$1", "restrictedNotation"], "postprocess": 
        (d, l) => ({ l, type: "notation", grace: e(d[0]), value: d[1] })
        },
    {"name": "Grace$string$1", "symbols": [{"literal":"["}, {"literal":">"}], "postprocess": (d) => d.join('')},
    {"name": "Grace$ebnf$1$subexpression$1", "symbols": ["keySet"], "postprocess": id},
    {"name": "Grace$ebnf$1$subexpression$1", "symbols": ["chordSet"], "postprocess": id},
    {"name": "Grace$ebnf$1$subexpression$1", "symbols": ["Range"], "postprocess": id},
    {"name": "Grace$ebnf$1$subexpression$1", "symbols": ["_"], "postprocess": id},
    {"name": "Grace$ebnf$1", "symbols": ["Grace$ebnf$1$subexpression$1"]},
    {"name": "Grace$ebnf$1$subexpression$2", "symbols": ["keySet"], "postprocess": id},
    {"name": "Grace$ebnf$1$subexpression$2", "symbols": ["chordSet"], "postprocess": id},
    {"name": "Grace$ebnf$1$subexpression$2", "symbols": ["Range"], "postprocess": id},
    {"name": "Grace$ebnf$1$subexpression$2", "symbols": ["_"], "postprocess": id},
    {"name": "Grace$ebnf$1", "symbols": ["Grace$ebnf$1", "Grace$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Grace", "symbols": ["Grace$string$1", "Grace$ebnf$1", {"literal":"]"}], "postprocess": 
        (d, l) => ({ l, type: "appoggiatura", value: d[1] })
        },
    {"name": "Group$ebnf$1", "symbols": ["Stackable"]},
    {"name": "Group$ebnf$1", "symbols": ["Group$ebnf$1", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Group", "symbols": [{"literal":"{"}, "digits", "Group$ebnf$1", {"literal":"}"}], "postprocess": 
        (d, l) => ({ l, type: "group-declaration", key: d[1].value, value: d[2] })
        },
    {"name": "Group", "symbols": ["GroupReference"], "postprocess": id},
    {"name": "GroupReference$string$1", "symbols": [{"literal":"{"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "GroupReference", "symbols": ["GroupReference$string$1", "digits", {"literal":"}"}], "postprocess": 
        (d, l) => ({ l, type: "group-reference", key: d[1].value })
        },
    {"name": "Parallelization$string$1", "symbols": [{"literal":"["}, {"literal":"["}], "postprocess": (d) => d.join('')},
    {"name": "Parallelization$ebnf$1", "symbols": ["Stackable"]},
    {"name": "Parallelization$ebnf$1", "symbols": ["Parallelization$ebnf$1", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Parallelization$ebnf$2$subexpression$1$ebnf$1", "symbols": ["Stackable"]},
    {"name": "Parallelization$ebnf$2$subexpression$1$ebnf$1", "symbols": ["Parallelization$ebnf$2$subexpression$1$ebnf$1", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Parallelization$ebnf$2$subexpression$1", "symbols": [{"literal":"|"}, "Parallelization$ebnf$2$subexpression$1$ebnf$1"]},
    {"name": "Parallelization$ebnf$2", "symbols": ["Parallelization$ebnf$2$subexpression$1"]},
    {"name": "Parallelization$ebnf$2$subexpression$2$ebnf$1", "symbols": ["Stackable"]},
    {"name": "Parallelization$ebnf$2$subexpression$2$ebnf$1", "symbols": ["Parallelization$ebnf$2$subexpression$2$ebnf$1", "Stackable"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Parallelization$ebnf$2$subexpression$2", "symbols": [{"literal":"|"}, "Parallelization$ebnf$2$subexpression$2$ebnf$1"]},
    {"name": "Parallelization$ebnf$2", "symbols": ["Parallelization$ebnf$2", "Parallelization$ebnf$2$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Parallelization$string$2", "symbols": [{"literal":"]"}, {"literal":"]"}], "postprocess": (d) => d.join('')},
    {"name": "Parallelization", "symbols": ["Parallelization$string$1", "Parallelization$ebnf$1", "Parallelization$ebnf$2", "Parallelization$string$2"], "postprocess": 
        (d, l) => ({ l, type: "parallelization", values: [ d[1], ...d[2].map((v:any) => v[1]) ] })
        },
    {"name": "word", "symbols": [/[\w.\/\-]/], "postprocess": id},
    {"name": "words$ebnf$1", "symbols": ["word"]},
    {"name": "words$ebnf$1", "symbols": ["words$ebnf$1", "word"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "words", "symbols": ["words$ebnf$1"], "postprocess": (d, l) => ({ l, type: "words", value: d[0].join('') })},
    {"name": "emoji$ebnf$1", "symbols": [/[^\x00-\xFF]/]},
    {"name": "emoji$ebnf$1", "symbols": ["emoji$ebnf$1", /[^\x00-\xFF]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "emoji", "symbols": ["emoji$ebnf$1"], "postprocess": id},
    {"name": "digit", "symbols": [/[0-9]/], "postprocess": id},
    {"name": "digits$ebnf$1", "symbols": ["digit"]},
    {"name": "digits$ebnf$1", "symbols": ["digits$ebnf$1", "digit"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "digits", "symbols": ["digits$ebnf$1"], "postprocess": (d, l) => ({ l, type: "digits", value: parseInt(d[0].join('')) })},
    {"name": "decimals$ebnf$1", "symbols": [/[-0-9.]/]},
    {"name": "decimals$ebnf$1", "symbols": ["decimals$ebnf$1", /[-0-9.]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "decimals", "symbols": ["decimals$ebnf$1"], "postprocess": (d, l) => ({ l, type: "decimals", value: parseFloat(d[0].join('')) })},
    {"name": "diacriticComponent", "symbols": ["GroupReference"], "postprocess": id},
    {"name": "diacriticComponent", "symbols": ["LocalConfiguration"], "postprocess": id},
    {"name": "diacriticComponent", "symbols": ["Range"], "postprocess": id},
    {"name": "diacriticComponent", "symbols": ["restrictedNotation"], "postprocess": id},
    {"name": "diacriticComponent", "symbols": ["rest"], "postprocess": id},
    {"name": "diacriticComponent", "symbols": ["_"], "postprocess": id},
    {"name": "restrictedNotation", "symbols": ["keySet"], "postprocess": id},
    {"name": "restrictedNotation", "symbols": ["chordSet"], "postprocess": id},
    {"name": "restrictedNotation", "symbols": ["tie"], "postprocess": id},
    {"name": "restrictedNotation$ebnf$1", "symbols": ["diacriticComponent"]},
    {"name": "restrictedNotation$ebnf$1", "symbols": ["restrictedNotation$ebnf$1", "diacriticComponent"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "restrictedNotation", "symbols": [{"literal":"<"}, "diacriticType", "restrictedNotation$ebnf$1", {"literal":">"}], "postprocess": 
        (d, l) => ({ l, type: "diacritic", name: d[1], value: d[2] })
        },
    {"name": "restrictedNotation$string$1", "symbols": [{"literal":"<"}, {"literal":"+"}], "postprocess": (d) => d.join('')},
    {"name": "restrictedNotation$ebnf$2", "symbols": ["diacriticComponent"]},
    {"name": "restrictedNotation$ebnf$2", "symbols": ["restrictedNotation$ebnf$2", "diacriticComponent"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "restrictedNotation", "symbols": ["restrictedNotation$string$1", "restrictedNotation$ebnf$2", "digits", {"literal":">"}], "postprocess": 
        (d, l) => ({ l, type: "diacritic", name: "+", velocity: d[2].value, value: d[1] })
        },
    {"name": "restrictedNotation$string$2", "symbols": [{"literal":"<"}, {"literal":"-"}], "postprocess": (d) => d.join('')},
    {"name": "restrictedNotation$ebnf$3", "symbols": ["diacriticComponent"]},
    {"name": "restrictedNotation$ebnf$3", "symbols": ["restrictedNotation$ebnf$3", "diacriticComponent"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "restrictedNotation", "symbols": ["restrictedNotation$string$2", "restrictedNotation$ebnf$3", "digits", {"literal":">"}], "postprocess": 
        (d, l) => ({ l, type: "diacritic", name: "-", velocity: d[2].value, value: d[1] })
        },
    {"name": "restrictedNotation$string$3", "symbols": [{"literal":"<"}, {"literal":"p"}], "postprocess": (d) => d.join('')},
    {"name": "restrictedNotation$ebnf$4$subexpression$1", "symbols": ["diacriticComponent"], "postprocess": id},
    {"name": "restrictedNotation$ebnf$4$subexpression$1", "symbols": [{"literal":"("}, "decimals", {"literal":")"}], "postprocess": (d, l) => d[1]},
    {"name": "restrictedNotation$ebnf$4", "symbols": ["restrictedNotation$ebnf$4$subexpression$1"]},
    {"name": "restrictedNotation$ebnf$4$subexpression$2", "symbols": ["diacriticComponent"], "postprocess": id},
    {"name": "restrictedNotation$ebnf$4$subexpression$2", "symbols": [{"literal":"("}, "decimals", {"literal":")"}], "postprocess": (d, l) => d[1]},
    {"name": "restrictedNotation$ebnf$4", "symbols": ["restrictedNotation$ebnf$4", "restrictedNotation$ebnf$4$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "restrictedNotation", "symbols": ["restrictedNotation$string$3", "restrictedNotation$ebnf$4", {"literal":">"}], "postprocess": 
        (d, l) => {
          const R = [];
          let chunk = "";
        
          for(const v of d[1]){
            if(typeof v === "string"){
              chunk += v;
              continue;
            }else if(chunk){
              R.push(parseFloat(chunk));
              chunk = "";
            }
            R.push(v);
          }
          if(chunk){
            R.push(parseFloat(chunk));
          }
          return { l, type: "diacritic", name: "p", value: R };
        }
        },
    {"name": "keySet$ebnf$1", "symbols": []},
    {"name": "keySet$ebnf$1", "symbols": ["keySet$ebnf$1", "notePrefix"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "keySet$ebnf$2", "symbols": []},
    {"name": "keySet$ebnf$2", "symbols": ["keySet$ebnf$2", "noteSuffix"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "keySet", "symbols": ["keySet$ebnf$1", "key", "keySet$ebnf$2"], "postprocess": 
        (d, l) => ({ l, type: "key", prefix: e(d[0]), key: d[1], suffix: e(d[2]) })
        },
    {"name": "restrictedKeySet$ebnf$1", "symbols": []},
    {"name": "restrictedKeySet$ebnf$1", "symbols": ["restrictedKeySet$ebnf$1", "notePrefix"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "restrictedKeySet$ebnf$2", "symbols": []},
    {"name": "restrictedKeySet$ebnf$2", "symbols": ["restrictedKeySet$ebnf$2", "noteSuffix"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "restrictedKeySet", "symbols": ["restrictedKeySet$ebnf$1", "key", "restrictedKeySet$ebnf$2"], "postprocess": 
        (d, l) => ({ l, type: "key", prefix: e(d[0]), key: d[1], suffix: e(d[2]) })
        },
    {"name": "chordSet$ebnf$1", "symbols": [{"literal":"|"}], "postprocess": id},
    {"name": "chordSet$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "chordSet$ebnf$2", "symbols": ["restrictedKeySet"]},
    {"name": "chordSet$ebnf$2", "symbols": ["chordSet$ebnf$2", "restrictedKeySet"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "chordSet", "symbols": [{"literal":"["}, "chordSet$ebnf$1", "chordSet$ebnf$2", {"literal":"]"}], "postprocess": 
        (d, l) => ({ l, type: "chord", arpeggio: Boolean(d[1]), value: d[2] })
        },
    {"name": "Repetition$string$1", "symbols": [{"literal":"|"}, {"literal":":"}], "postprocess": (d) => d.join('')},
    {"name": "Repetition", "symbols": ["Repetition$string$1"], "postprocess": 
        (d, l) => ({ l, type: "repeat-open" })
        },
    {"name": "Repetition$string$2", "symbols": [{"literal":":"}, {"literal":"|"}], "postprocess": (d) => d.join('')},
    {"name": "Repetition$ebnf$1", "symbols": ["digits"], "postprocess": id},
    {"name": "Repetition$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Repetition", "symbols": ["Repetition$string$2", "Repetition$ebnf$1"], "postprocess": 
        (d, l) => ({ l, type: "repeat-close", count: e(d[1]?.value) })
        },
    {"name": "Repetition$string$3", "symbols": [{"literal":"/"}, {"literal":"1"}], "postprocess": (d) => d.join('')},
    {"name": "Repetition", "symbols": ["Repetition$string$3"], "postprocess": 
        (d, l) => ({ l, type: "volta", value: 1 })
        },
    {"name": "Repetition$string$4", "symbols": [{"literal":"/"}, {"literal":"2"}], "postprocess": (d) => d.join('')},
    {"name": "Repetition", "symbols": ["Repetition$string$4"], "postprocess": 
        (d, l) => ({ l, type: "volta", value: 2 })
        },
    {"name": "rangeType", "symbols": [/[v^357s]/], "postprocess": id},
    {"name": "diacriticType", "symbols": [/[.~!t]/], "postprocess": id},
    {"name": "notePrefix", "symbols": [/[v^]/], "postprocess": id},
    {"name": "noteSuffix", "symbols": [/[-+]/], "postprocess": id},
    {"name": "key", "symbols": [/[xcdefgabCDEFGA도레미파솔라시돗렛팟솘랏렢밒솚랖싶]/], "postprocess": id},
    {"name": "rest", "symbols": [/[_ㅇ]/], "postprocess": 
        (d, l) => ({ l, type: "rest" })
        },
    {"name": "tie", "symbols": [/[~ㅡ]/], "postprocess": 
        (d, l) => ({ l, type: "tie" })
        },
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": () => null},
    {"name": "_", "symbols": [/[\s]/], "postprocess": () => null}
  ],
  ParserStart: "Main",
};

export default grammar;
