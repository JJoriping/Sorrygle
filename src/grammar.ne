@preprocessor typescript
@{%
function e<T extends string|any[]|null>(value:T):T|undefined{
  if(!value || value.length === 0) return undefined;
  return value;
}
%}

Main                -> (GlobalConfiguration {% id %}
                       | EmojiDeclaration {% id %}
                       | ChannelDeclaration {% id %}
                       | UDRDefinition {% id %}
                       | Repetition {% id %}
                       | Stackable {% id %}):+ {% id %}
GlobalConfiguration -> "((" words "=" words "))" {%
  (d, l) => ({ l, type: "global-configuration", key: d[1].value, value: d[3].value })
%}
ChannelDeclaration  -> "#" digits {%
  (d, l) => ({ l, type: "channel-declaration", id: d[1].value })
%} | "#~" digits {%
  (d, l) => ({ l, type: "channel-declaration", id: d[1].value, continue: true })
%}
UDRDefinition       -> "{{" words "}}" __ "{" Stackable:+ "}" {%
  (d, l) => ({ l, type: "udr-definition", name: d[1].value, value: d[5] })
%}
LocalConfiguration  -> "(" words "=" words ")" {%
  (d, l) => ({ l, type: "local-configuration", key: d[1].value, value: d[3].value })
%}
Stackable           -> LocalConfiguration {% id %}
                       | EmojiReference {% id %}
                       | Range {% id %}
                       | Notation {% id %}
                       | Group {% id %}
                       | Parallelization {% id %}
                       | rest {% id %}
                       | _ {% id %}
EmojiDeclaration    -> "((" emoji "=" __ LocalConfiguration __ "))" {%
  (d, l) => ({ l, type: "emoji-declaration", key: d[1].join(''), value: d[4] })
%}
EmojiReference      -> "(" emoji ")" {%
  (d, l) => ({ l, type: "emoji-reference", key: d[1].join('') })
%}
Range               -> "(" rangeType Stackable:+ ")" {%
  (d, l) => ({ l, type: "range", key: d[1], value: d[2] })
%}
                       | "{{" words "}}" __ "(" Stackable:+ ")" {%
  (d, l) => ({ l, type: "range", udr: true, key: d[1].value, value: d[5] })
%}
Notation            -> Grace:? restrictedNotation {%
  (d, l) => ({ l, type: "notation", grace: e(d[0]), value: d[1] })
%}
Grace               -> "[>" (keySet {% id %} | chordSet {% id %} | Range {% id %} | _ {% id %}):+ "]" {%
  (d, l) => ({ l, type: "appoggiatura", value: d[1] })
%}
Group               -> "{" digits Stackable:+ "}" {%
  (d, l) => ({ l, type: "group-declaration", key: d[1].value, value: d[2] })
%} | GroupReference {% id %}
GroupReference      -> "{=" digits "}" {%
  (d, l) => ({ l, type: "group-reference", key: d[1].value })
%}
Parallelization     -> "[[" Stackable:+ ("|" Stackable:+):+ "]]" {%
  (d, l) => ({ l, type: "parallelization", values: [ d[1], ...d[2].map((v:any) => v[1]) ] })
%}

word                -> [\w.\/\-] {% id %}
words               -> word:+ {% (d, l) => ({ l, type: "words", value: d[0].join('') }) %}
emoji               -> [^\x00-\xFF]:+ {% id %}
digit               -> [0-9] {% id %}
digits              -> digit:+ {% (d, l) => ({ l, type: "digits", value: parseInt(d[0].join('')) }) %}
decimals            -> [-0-9.]:+ {% (d, l) => ({ l, type: "decimals", value: parseFloat(d[0].join('')) }) %}
diacriticComponent  -> GroupReference {% id %}
                       | LocalConfiguration {% id %}
                       | Range {% id %}
                       | restrictedNotation {% id %}
                       | rest {% id %}
                       | _ {% id %}
restrictedNotation  -> keySet {% id %}
                       | chordSet {% id %}
                       | tie {% id %}
                       | "<" diacriticType diacriticComponent:+ ">" {%
  (d, l) => ({ l, type: "diacritic", name: d[1], value: d[2] })
%}
                       | "<+" diacriticComponent:+ digits ">" {%
  (d, l) => ({ l, type: "diacritic", name: "+", velocity: d[2].value, value: d[1] })
%}
                       | "<-" diacriticComponent:+ digits ">" {%
  (d, l) => ({ l, type: "diacritic", name: "-", velocity: d[2].value, value: d[1] })
%}
                       | "<p" (diacriticComponent {% id %} | "(" decimals ")" {% (d, l) => d[1] %}):+ ">" {%
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
%}
keySet              -> notePrefix:* key noteSuffix:* {%
  (d, l) => ({ l, type: "key", prefix: e(d[0]), key: d[1], suffix: e(d[2]) })
%}
restrictedKeySet    -> notePrefix:* key noteSuffix:* {%
  (d, l) => ({ l, type: "key", prefix: e(d[0]), key: d[1], suffix: e(d[2]) })
%}
chordSet            -> "[" "|":? restrictedKeySet:+ "]" {%
  (d, l) => ({ l, type: "chord", arpeggio: Boolean(d[1]), value: d[2] })
%}
Repetition          -> "|:" {%
  (d, l) => ({ l, type: "repeat-open" })
%} | ":|" digits:? {%
  (d, l) => ({ l, type: "repeat-close", count: e(d[1]?.value) })
%} | "/1" {%
  (d, l) => ({ l, type: "volta", value: 1 })
%} | "/2" {%
  (d, l) => ({ l, type: "volta", value: 2 })
%}
rangeType           -> [v^357s] {% id %}
diacriticType       -> [.~!t] {% id %}
notePrefix          -> [v^] {% id %}
noteSuffix          -> [-+] {% id %}
key                 -> [xcdefgabCDEFGA도레미파솔라시돗렛팟솘랏렢밒솚랖싶] {% id %}
rest                -> [_ㅇ] {%
  (d, l) => ({ l, type: "rest" })
%}
tie                 -> [~ㅡ] {%
  (d, l) => ({ l, type: "tie" })
%}
__                  -> [\s]:* {% () => null %}
_                   -> [\s] {% () => null %}