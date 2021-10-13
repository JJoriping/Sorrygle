@{%
function e(value){
  if(!value?.length) return undefined;
  return value;
}
%}

Main                -> (GlobalConfiguration {% id %} | ChannelDeclaration {% id %} | UDRDefinition {% id %} | Stackable {% id %}):+ {% id %}
GlobalConfiguration -> "((" words "=" words "))" {%
  d => ({ type: "global-configuration", key: d[1].value, value: d[3].value })
%}
ChannelDeclaration  -> "#" digits {%
  d => ({ type: "channel-declaration", id: d[1] })
%}
UDRDefinition       -> "{{" words "}}" __ "{" Stackable:+ "}" {%
  d => ({ type: "udr-definition", name: d[1].value, value: d[5] })
%}
LocalConfiguration  -> "(" words "=" words ")" {%
  d => ({ type: "local-configuration", key: d[1].value, value: d[3].value })
%}
Stackable           -> LocalConfiguration {% id %}
                       | Range {% id %}
                       | Notation {% id %}
                       | Group {% id %}
                       | Parallelization {% id %}
                       | repetition {% id %}
                       | rest {% id %}
                       | _ {% id %}
Range               -> "(" rangeType Stackable:+ ")" {%
  d => ({ type: "range", key: d[1], value: d[2] })
%}
                       | "{{" words "}}" __ "(" Stackable:+ ")" {%
  d => ({ type: "range", key: d[1].value, value: d[5] })
%}
Notation            -> Grace:? restrictedNotation {%
  d => ({ type: "notation", grace: e(d[0]), value: d[1] })
%}
Grace               -> "[>" (keySet | chordSet | Range | _):+ "]" {%
  d => ({ type: "grace", value: d[1] })
%}
Group               -> "{" digits Stackable:+ "}" {%
  d => ({ type: "group-declaration", key: d[1], value: d[2] })
%}
                       | "{=" digits "}" {%
  d => ({ type: "group-reference", key: d[1] })
%}
Parallelization     -> "[[" Stackable:+ ("|" Stackable:+):+ "]]" {%
  d => ({ type: "parallelization", values: [ ...d[1], ...d[2].map(v => v[1]) ] })
%}

word                -> [A-Za-z0-9.\-/] {% id %}
words               -> word:+ {% d => ({ type: "words", value: d[0].join('') }) %}
digit               -> [0-9] {% id %}
digits              -> digit:+ {% d => ({ type: "digits", value: parseInt(d[0].join('')) }) %}
decimal             -> [-0-9.] {% id %}
restrictedNotation  -> keySet {% id %}
                       | chordSet {% id %}
                       | "<" diacriticType (restrictedNotation {% id %} | _ {% id %}):+ ">" {%
  d => ({ type: "diacritic", name: d[1], value: d[2] })
%}
                       | "<+" (restrictedNotation {% id %} | _ {% id %}):+ digits ">" {%
  d => ({ type: "diacritic", name: "+", volume: d[2], value: d[1] })
%}
                       | "<-" (restrictedNotation {% id %} | _ {% id %}):+ digits ">" {%
  d => ({ type: "diacritic", name: "-", volume: d[2], value: d[1] })
%}
                       | "<p" (restrictedNotation {% id %} | decimal {% id %} | _ {% id %}):+ ">" {%
  d => {
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
    return { type: "diacritic", name: "p", frames: R };
  }
%}
keySet              -> notePrefix:* key (noteSuffix {% id %} | tie {% id %}):* {%
  d => ({ type: "key", prefix: e(d[0]), key: d[1], suffix: e(d[2]) })
%}
restrictedKeySet    -> notePrefix:* key noteSuffix:* {%
  d => ({ type: "key", prefix: e(d[0]), key: d[1], suffix: e(d[2]) })
%}
chordSet            -> "[" restrictedKeySet:+ "]" tie:* {%
  d => ({ type: "chord", value: d[1], suffix: e(d[3]) })
%}
repetition          -> "|:" {% id %} | ":|" digits:? {%
  d => ({ type: "repeat-close", count: e(d[1]) })
%}
                       | "/1" {% id %}
                       | "/2" {% id %}
rangeType           -> [v^357s] {% id %}
diacriticType       -> [.~!t] {% id %}
notePrefix          -> [v^] {% id %}
noteSuffix          -> [-+] {% id %}
key                 -> [xcdefgabCDEFGA도레미파솔라시돗렛팟솘랏렢밒솚랖싶] {% id %}
rest                -> [_ㅇ] {% id %}
tie                 -> [~ㅡ] {% id %}
__                  -> [\s]:* {% () => null %}
_                   -> [\s] {% () => null %}