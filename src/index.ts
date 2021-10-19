import MIDI = require("midi-writer-js");
import { Grammar, Parser } from "nearley";
import { AST } from "./AST";
import grammar from "./grammar";
import SemanticError from "./SemanticError";
import { ControllerType, GlobalConfiguration, MIDIOptionModifier, TrackSet } from "./TrackSet";
import { getTickDuration, toTick, transpose } from "./utils";

const MAX_GROUP_REFERENCES = 1000;

const RESOLUTION = 8;
const STACCATO_LENGTH = 16;
const GRACE_LENGTH = 8;
const TRILL_INTERVAL = 16;
const REGEXP_UDR_X = /^x([-\d]+)\/([-\d]+)$/;

export class Sorrygle{
  public static MAX_GAS = 100000;

  private static readonly DEFAULT_EMOJI:{ [key:string]: AST.LocalConfiguration } = {
    '𝅝': { l: 0, type: "local-configuration", key: "q", value: "1" },
    '𝅗𝅥': { l: 0, type: "local-configuration", key: "q", value: "2" },
    '𝅘𝅥': { l: 0, type: "local-configuration", key: "q", value: "4" },
    '𝅘𝅥𝅮': { l: 0, type: "local-configuration", key: "q", value: "8" },
    '𝅘𝅥𝅯': { l: 0, type: "local-configuration", key: "q", value: "16" },
    '𝅘𝅥𝅰': { l: 0, type: "local-configuration", key: "q", value: "32" },
    '♩': { l: 0, type: "local-configuration", key: "q", value: "4" },
    '♪': { l: 0, type: "local-configuration", key: "q", value: "8" },
    '♬': { l: 0, type: "local-configuration", key: "q", value: "16" },

    '🎹': { l: 0, type: "local-configuration", key: "p", value: "0" },
    '🪗': { l: 0, type: "local-configuration", key: "p", value: "21" },
    '🎸': { l: 0, type: "local-configuration", key: "p", value: "24" },
    '🎻': { l: 0, type: "local-configuration", key: "p", value: "40" },
    '🎤': { l: 0, type: "local-configuration", key: "p", value: "54" },
    '🎺': { l: 0, type: "local-configuration", key: "p", value: "56" },
    '🎷': { l: 0, type: "local-configuration", key: "p", value: "64" },
    '🪕': { l: 0, type: "local-configuration", key: "p", value: "105" },
    '🥁': { l: 0, type: "local-configuration", key: "p", value: "118" }
  };
  private static readonly GRAMMAR = Grammar.fromCompiled(grammar);

  private static prettifyError(preprocessedData:string, e:any):never{
    if(e instanceof SemanticError){
      const text = preprocessedData.substr(Math.max(0, e.index - 10), 30);

      e.message += `\n${" ".repeat(Math.min(10, e.index))}↓ here\n${text.replace(/\r?\n/g, " ")}`;
    }else if(e instanceof Error && e.message.startsWith("Syntax error")){
      const chunk = e.message.split(/\n+/g);
      const header = chunk[0].match(/at line (\d+) col (\d+)/);
      const out = [
        chunk[0],
        header ? getMap(parseInt(header[1]), parseInt(header[2])) : "",
        "Expected characters are:"
      ];
      for(const v of chunk){
        const w = v.match(/^A (.+) based on:$/);

        if(!w) continue;
        const o = `• ${w[1]}`;

        if(!out.includes(o)) out.push(o);
      }
      e.message = out.join('\n');
    }
    throw e;

    function getMap(line:number, column:number):string{
      const R:string[] = [];
      const lines = preprocessedData.split(/\n+/g);
      const lineWidth = lines.length.toString().length;

      for(let i = -2; i <= 0; i++){
        const l = line + i - 1;

        if(l < 0 || l >= lines.length){
          continue;
        }
        R.push(`${(l + 1).toString().padStart(lineWidth, " ")}│ ${lines[l]}`);
      }
      R.push(" ".repeat(lineWidth + 1 + column) + "^ here");
      return R.join('\n');
    }
  }
  private static preprocess(data:string):string{
    return data.replace(/(.*)=\/|\/=(.*)/mg, "");
  }
  public static compile(data:string):Buffer{
    const preprocessedData = Sorrygle.preprocess(data);
    const R = new Sorrygle(preprocessedData);

    try{
      R.parse();
      return R.compile();
    }catch(e){
      Sorrygle.prettifyError(preprocessedData, e);
    }
  }
  public static parse(data:string):AST.Tree{
    const preprocessedData = Sorrygle.preprocess(data);
    const parser = new Parser(Sorrygle.GRAMMAR);

    try{
      parser.feed(preprocessedData).finish();
      return parser.results[0];
    }catch(e){
      Sorrygle.prettifyError(preprocessedData, e);
    }
  }

  private readonly data:string;
  private gas:number;
  private parser:Parser;
  private globalConfiguration:GlobalConfiguration;
  private tracks:TrackSet[];
  private groups:Map<number, AST.Stackable[]>;
  private emojis:Map<string, AST.LocalConfiguration>;
  private udrs:Map<string, AST.Stackable[]>;

  private _track?:TrackSet;
  private get track():TrackSet{
    let R = this._track;

    if(!R){
      R = new TrackSet(1);
      this.tracks.push(R);
      this._track = R;
    }
    return R;
  }

  constructor(data:string){
    this.data = data;
    this.gas = Sorrygle.MAX_GAS;
    this.parser = new Parser(Sorrygle.GRAMMAR);
    this.globalConfiguration = {
      track: new MIDI.Track(),
      position: 0,
      fermataLength: 2
    };
    this.tracks = [];
    this.groups = new Map();
    this.emojis = new Map();
    this.udrs = new Map();
  }
  private parseRestrictedNotations(list:Array<AST.RestrictedNotation|AST.Rest>, modifiers:MIDIOptionModifier[] = [], target:TrackSet = this.track):number{
    let R = 0;

    for(const v of list) switch(v.type){
      case "key": case "chord": R += target.add(v, modifiers); break;
      case "rest": R += target.rest(); break;
      case "tie": R += target.tie(v.l); break;
      case "diacritic":{
        const innerList:Array<AST.DiacriticComponent|AST.Decimals> = [];
        const durations = new Map<number, number>();
        let current:AST.RestrictedNotation|undefined;
        let modifier:MIDIOptionModifier;

        if(v.name === "." || v.name === "~" || v.name === "t") for(const w of v.value) switch(w?.type){
          case "key": case "chord": case "diacritic":
            current = w;
            durations.set(w.l, getTickDuration(target.quantization));
            innerList.push(w);
            break;
          case "tie":{
            if(!current) throw new SemanticError(w.l, "Malformed tie");
            const data = durations.get(current.l);
            if(data === undefined) throw Error("Unknown notation");

            durations.set(current.l, data + getTickDuration(target.quantization));
          } break;
        }else{
          innerList.push(...v.value);
        }
        switch(v.name){
          case ".": modifier = (o, caller, _, l) => {
            const originalLength = durations.get(l)!;

            if(originalLength <= STACCATO_LENGTH){
              return;
            }
            o.duration = [ toTick(STACCATO_LENGTH) ];
            caller.rest(originalLength - STACCATO_LENGTH, true);
          }; break;
          case "~": modifier = (o, _, __, l) => o.duration = [
            // NOTE This may cause a synchronization error if fermataLength is not an integer.
            toTick(this.globalConfiguration.fermataLength * durations.get(l)!)
          ]; break;
          case "!": modifier = o => o.velocity = 100; break;
          case "t": modifier = (o, caller, position, l) => {
            let length = durations.get(l)!;
            let count = 0;

            while(length >= TRILL_INTERVAL){
              let pitch:MIDI.Pitch[];

              if(count++ % 2){
                pitch = o.pitch.map(w => transpose(w, 0, true));
              }else{
                if(o.pitch.find(w => w.startsWith("x"))) throw Error("Unresolved x");
                pitch = o.pitch as MIDI.Pitch[];
              }
              R += caller.addRaw(modifiers.reduce((pw, w) => {
                w(pw, caller, position, l);
                return pw;
              }, {
                ...o,
                pitch,
                duration: [ toTick(TRILL_INTERVAL) ],
                wait: count === 1 ? o.wait : []
              }));
              length -= TRILL_INTERVAL;
            }
            if(length > 0) caller.rest(length, true);
            o.duration = [];
          }; break;
          case "+": case "-":{
            const length = this.parseDiacriticComponents(innerList, modifiers, target.dummy);
            const start = target.velocity;
            const end = v.velocity;
            let startPosition:number;

            if(v.name === "+" && start >= end) throw new SemanticError(v.l, "Useless crescendo");
            if(v.name === "-" && end >= start) throw new SemanticError(v.l, "Useless decrescendo");
            modifier = (o, _, position) => {
              if(startPosition === undefined){
                startPosition = position;
              }
              o.velocity = start + (end - start) * (position - startPosition) / length;
            };
          }; break;
          case "p":{
            const bends:[offset:number, value:number][] = [];
            let first = true;
            let offset = 0;
            let prevOffset = offset;
            let prevValue:number|undefined;
            
            for(const w of v.value){
              if(w === null) continue;
              if(w.type === "decimals"){
                if(prevValue !== undefined) for(let i = prevOffset; i < offset; i += RESOLUTION){
                  bends.push([ i, prevValue + (w.value - prevValue) * (i - prevOffset) / (offset - prevOffset) ]);
                }
                bends.push([ offset, w.value ]);
                prevOffset = offset;
                prevValue = w.value;
              }else{
                offset += this.parseDiacriticComponents([ w ], modifiers, target.dummy);
              }
            }
            modifier = (_, caller, position) => {
              if(!first) return;
              for(const bend of bends){
                caller.addPitchBend(position + bend[0], bend[1]);
              }
              first = false;
            };
          } break;
        }
        R += this.parseDiacriticComponents(
          innerList,
          [ ...modifiers, modifier ],
          target
        );
        if(v.name === "+" || v.name === "-"){
          target.velocity = v.velocity;
        }
        if(v.name === "p"){
          target.addPitchBend(null, 0);
        }
      } break;
    }
    return R;
  }
  private parseDiacriticComponents(list:Array<AST.DiacriticComponent|AST.Decimals>, modifiers:MIDIOptionModifier[] = [], target:TrackSet = this.track):number{
    let R = 0;

    for(const v of list) switch(v?.type){
      case "key": case "chord": case "diacritic": case "tie": case "rest":
        R += this.parseRestrictedNotations([ v ], modifiers, target);
        break;
      case "group-reference": case "local-configuration": case "range":
        R += this.parseStackables([ v ], modifiers, target);
        break;
    }
    return R;
  }
  private parseStackables(list:AST.Stackable[], modifiers:MIDIOptionModifier[] = [], target:TrackSet = this.track):number{
    let referenceCount = 0;
    let R = 0;

    for(let i = 0; i < list.length; i++){
      const v = list[i];
      if(!v) continue;
      if(--this.gas < 0) throw new SemanticError(v.l, "Not enough gas");

      switch(v.type){
        case "local-configuration": switch(v.key){
          case "o": target.octave = parseInt(v.value); break;
          case "p":{
            const chunk = v.value.match(/^(\d+)(?:\/(\d+))?$/);
            if(!chunk) throw new SemanticError(v.l, "Malformed local configuration");
            target.setInstrument(parseInt(chunk[1]), chunk[2] ? parseInt(chunk[2]) : 0);
          } break;
          case "q": target.quantization = v.value as MIDI.Duration; break;
          case "s": target.setController(ControllerType.SUSTAIN_PEDAL, parseInt(v.value)); break;
          case "t": target.transpose = parseInt(v.value); break;
          case "v": target.velocity = parseInt(v.value); break;
          default: throw new SemanticError(v.l, `Unhandled local configuration: ${v.key}`);
        } break;
        case "notation":{
          const w = v.value;
          const actualModifiers = [ ...modifiers ];

          if(v.grace){
            const graceModifiers:MIDIOptionModifier[] = [
              ...modifiers,
              o => {
                o.graced = true;
                o.duration = [ toTick(GRACE_LENGTH) ];
              }
            ];
            let totalLength = 0;

            for(const g of v.grace.value){
              if(!g) continue;
              switch(g.type){
                case "key": case "chord":
                  R += target.add(g, graceModifiers);
                  totalLength += GRACE_LENGTH;
                  break;
                case "range":{
                  const length = this.parseRange(g, graceModifiers, target);

                  R += length;
                  totalLength += length;
                } break;
              }
            }
            actualModifiers.push(o => {
              const value = getTickDuration(o.duration) - totalLength;

              if(value < 1) throw new SemanticError(v.l, "Too long graces");
              o.duration = [ toTick(value) ];
            });
          }
          R += this.parseRestrictedNotations([ w ], actualModifiers, target);
        } break;
        case "rest": R += target.rest(); break;
        case "range": R += this.parseRange(v, modifiers, target); break;
        case "parallelization":{
          for(let i = 1; i < v.values.length; i++){
            this.parseStackables(v.values[i], modifiers, target.childAt(v.l, i));
          }
          R += this.parseStackables(v.values[0], modifiers, target);
        } break;
        case "group-declaration":
          if(this.groups.has(v.key)) throw new SemanticError(v.l, `Already declared group: ${v.key}`);
          this.groups.set(v.key, v.value);
          list.splice(i, 1, ...v.value);
          i--;
          break;
        case "group-reference":{
          const group = this.groups.get(v.key);

          if(!group) throw new SemanticError(v.l, `No such group: ${v.key}`);
          if(++referenceCount >= MAX_GROUP_REFERENCES){
            throw new SemanticError(v.l, "Too many references");
          }
          list.splice(i, 1, ...group);
          i--;
        } break;
        case "emoji-reference":{
          const emoji = this.emojis.get(v.key) || Sorrygle.DEFAULT_EMOJI[v.key];

          if(!emoji) throw new SemanticError(v.l, `No such emoji: ${v.key}`);
          list.splice(i, 1, emoji);
          i--;
        } break;
      }
    }
    return R;
  }
  private parseRange(range:AST.Range, modifiers:MIDIOptionModifier[], target:TrackSet = this.track):number{
    let modifier:MIDIOptionModifier;

    if(range.udr){
      const data = this.udrs.get(range.key);

      if(!data) throw new SemanticError(range.l, `Unknown UDR: ${range.key}`);
      modifier = (o, caller) => {
        let wait = o.wait;

        this.parseStackables(data, [ ...modifiers, p => {
          const pitches:MIDI.Pitch[] = [];

          for(let i = 0; i < p.pitch.length; i++){
            if(!p.pitch[i].startsWith("x")){
              pitches.push(p.pitch[i] as MIDI.Pitch);
              continue;
            }
            const chunk = p.pitch[i].match(REGEXP_UDR_X);

            if(!chunk) throw Error(`Malformed x: ${p.pitch[i]}`);
            for(const w of o.pitch){
              pitches.push(transpose(w, 12 * parseInt(chunk[1]) + parseInt(chunk[2])));
            }
          }
          p.wait.unshift(...wait);
          p.pitch = pitches;
          wait = [];
        }], caller);
        o.duration = [];
      };
    }else switch(range.key){
      case "^": modifier = o => o.pitch = o.pitch.map(w => transpose(w, 12)); break;
      case "v": modifier = o => o.pitch = o.pitch.map(w => transpose(w, -12)); break;
      case "3": return target.wrapTuplet(range.l, 3, () => (
        this.parseStackables(range.value, modifiers, target)
      ));
      case "5": return target.wrapTuplet(range.l, 5, () => (
        this.parseStackables(range.value, modifiers, target)
      ));
      case "7": return target.wrapTuplet(range.l, 7, () => (
        this.parseStackables(range.value, modifiers, target)
      ));
      case "s":{
        let R:number;

        target.setController(ControllerType.SUSTAIN_PEDAL, 127);
        R = this.parseStackables(range.value, modifiers, target);
        target.setController(ControllerType.SUSTAIN_PEDAL, 0);
        return R;
      }
      default: throw new SemanticError(range.l, `Unhandled range key: ${range.key}`);
    }
    return this.parseStackables(range.value, [ ...modifiers, modifier ], target);
  }

  public compile():Buffer{
    const tracks = [ this.globalConfiguration.track ];

    for(const v of this.tracks){
      if(v.isEmpty) continue;
      tracks.push(...v.out());
    }
    return Buffer.from(new MIDI.Writer(tracks).buildFile());
  }
  public parse():void{
    this.parser.feed(this.data).finish();
    if(this.parser.results.length > 1){
      console.warn(`Ambiguity detected: ${this.parser.results.length}`);
    }
    if(this.parser.results.length < 1){
      throw Error("Incomplete data");
    }
    const result:AST.Tree = JSON.parse(JSON.stringify(this.parser.results[0]));

    for(let i = 0; i < result.length; i++){
      const v = result[i];
      if(!v) continue;
      switch(v.type){
        case "global-configuration":
          switch(v.key){
            case "bpm":{
              this.track.wrapGlobalConfiguration(v.l, this.globalConfiguration, track => {
                track.setTempo(parseFloat(v.value));
              });
            } break;
            case "time-sig":{
              const [ n, d ] = v.value.split('/');

              this.track.wrapGlobalConfiguration(v.l, this.globalConfiguration, track => {
                track.setTimeSignature(parseInt(n), parseInt(d));
              });
            } break;
            case "fermata": this.globalConfiguration.fermataLength = parseFloat(v.value); break;
            default: throw new SemanticError(v.l, `Unhandled global configuration: ${v.key}`);
          }
          break;
        case "channel-declaration":{
          if(v.continue){
            const target = this.tracks.filter(w => w.channel === v.id).at(-1);

            if(!target) throw new SemanticError(v.l, `No such channel: ${v.id}`);
            this._track = target;
          }else{
            const baby = new TrackSet(v.id);
  
            this._track = baby;
            this.tracks.push(baby);
          }
        } break;
        case "udr-definition":
          if(this.udrs.has(v.name)) throw new SemanticError(v.l, `Already declared UDR: ${v.name}`);
          this.udrs.set(v.name, v.value);
          break;
        case "repeat-open": this.track.repeatOpen(v.l); break;
        case "repeat-close": result.splice(i + 1, 0, ...this.track.repeatClose(v.l, v.count)); break;
        case "volta":
          // Voltas are processed in TrackSet
          break;
        case "emoji-declaration":
          if(this.emojis.has(v.key)) throw new SemanticError(v.l, `Already declared emoji: ${v.key}`);
          this.emojis.set(v.key, v.value);
          break;
        case "local-configuration":
        case "range":
        case "notation":
        case "group-declaration":
        case "group-reference":
        case "parallelization":
        case "emoji-reference":
        case "rest":
          this.parseStackables([ v ]);
          break;
      }
      this.track.addSnapshot(v);
    }
  }
}
{
  const _ProgramChangeEvent = MIDI.ProgramChangeEvent;

  MIDI.ProgramChangeEvent = class extends _ProgramChangeEvent{
    public type:'program';
    public data:any;

    constructor(options:{ 'channel': number, 'instrument': number }){
      super(options);
      this.type = 'program';
      this.data[1] += options.channel - 1;
    }
  };
}