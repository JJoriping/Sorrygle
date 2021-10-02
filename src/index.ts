import MIDI = require("midi-writer-js");

type Table<T> = {
  [key:string]: T
};
type TrackSet = {
  'id': number,
  'data': MIDI.Track,
  'octave': number,
  'quantization': MIDI.Duration,
  'velocity': number,
  'transpose': number,
  'position': number,
  'repeat'?: {
    'start': number,
    'count': number,
    'current': number,
    'closed'?: boolean
  }
};
enum DiacriticType{
  INVALID,
  FERMATA,
  STACCATO,
  SFORZANDO,
  TRILL,
  CRESCENDO,
  DECRESCENDO
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
const getTickDuration = (MIDI as any)['Utils']['getTickDuration'] as (duration:string|string[]) => number;

export class Sorrygle{
  private static readonly NOTES = {
    c: "C",
    C: "C#",
    d: "D",
    D: "D#",
    e: "E",
    f: "F",
    F: "F#",
    g: "G",
    G: "G#",
    a: "A",
    A: "A#",
    b: "B"
  } as const;
  private static readonly NOTE_SEQUENCES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ] as const;
  private static readonly REGEXP_PITCH = /^([A-G]#?)(\d+)$/;
  private static readonly GRACE_LENGTH = 8;
  private static readonly TRILL_LENGTH = 16;
  private static readonly INITIAL_GAS = 100000;

  public static parse(data:string):Buffer{
    const R = new Sorrygle(data);
    
    try{
      R.parse();
      return R.compile();
    }catch(e){
      if(e instanceof Error && e.message.startsWith("#")){
        const [ , index ] = e.message.match(/^#(\d+)/)!;

        e.message += `\n          ↓ here\n${R.data.substr(Math.max(0, parseInt(index) - 10), 30)}`;
      }
      throw e;
    }
  }
  private static preprocess(data:string):string{
    const ref:Table<string> = {};
    let R = data.replace(/(.*)=\/|\/=(.*)/mg, "");

    if(!R.match(/#\d+/)){
      R = "#1" + R;
    }
    return R
      .replace(/\{(\d+)([\s\S]+?)\}/g, (_, g1:string, g2:string) => {
        if(g1 in ref) throw Error(`Already declared group: ${g1}`);
        ref[g1] = g2;
        return g2;
      }).replace(/\{=(\d+)\}/g, (_, g1:string) => {
        if(!ref[g1]) throw Error(`No such group: ${g1}`);
        return ref[g1].replace(/\|:|:\|\d*|\/\d+/g, "");
      }).replace(/\(s(?!=)([\s\S]+?)\)/g, (_, g1:string) => (
        `(s=127)${g1}(s=0)`
      )).replace(/\(\^([\s\S]+?)\)/g, (_, g1:string) => (
        // 그룹 옥타브 올리기
        g1.replace(/[A-G]/gi, "^$&")
      )).replace(/\(v(?!=)([\s\S]+?)\)/g, (_, g1:string) => (
        // 그룹 옥타브 내리기
        g1.replace(/[A-G]/gi, "v$&")
      )).replace(/\((3|5)([\s\S]+?)\)/g, (_, g1:string, g2:string) => (
        `(q=?${g1})${g2}(q=?)`
      ))
    ;
  }

  private readonly data:string;
  private trackPreset?:TrackSet;
  private tracks:TrackSet[];
  private gas:number;

  constructor(data:string){
    this.data = Sorrygle.preprocess(data);
    this.tracks = [];
    this.gas = Sorrygle.INITIAL_GAS;
  }
  public compile():Buffer{
    return Buffer.from(new MIDI.Writer(this.tracks.filter(v => v).map(v => v.data)).buildFile());
  }
  public parse():void{
    const global = {
      bpm: 120,
      fermataLength: 2
    };
    const chunk = this.data;
    let track:TrackSet|undefined;
    let inChord:'normal'|'grace'|undefined;
    let prevNote:[notes:MIDI.Pitch[], length:MIDI.Duration[]]|undefined;
    let wait:MIDI.Duration[] = [];

    const pendingDiacritics:Array<{
      'type': DiacriticType,
      'notes': Array<MIDI.Options&{ 'duration': MIDI.Duration[], 'wait': MIDI.Duration[] }>,
      'args'?: any[],
      'argsRange'?: [number, number]
    }> = [];
    let parallelRange:[number, number]|undefined;
    let pendingGrace:MIDI.Pitch[]|undefined;
    let octaveOffset = 0;
    let originalQuantization:MIDI.Duration|undefined;
    let quantizationCarry = 0;

    main: for(let i = 0; i < chunk.length; i++){
      if(--this.gas <= 0){
        throw Error(`#${i} Not enough gas`);
      }
      if(parallelRange){
        if(i >= parallelRange[0] && i <= parallelRange[1]) continue;
      }
      for(const w of pendingDiacritics){
        if(w.argsRange){
          if(i >= w.argsRange[0] && i <= w.argsRange[1]) continue main;
        }
      }
      const [ c, n1 ] = chunk.substr(i, 2);

      switch(c){
        case "(":
          addNote(i, true);
          if(n1 === "("){
            // 전역 설정
            const [ C, key, value ] = assert(/^\(\((.+?)=(.+?)\)\)/, i, 'set-global-variable');

            switch(key){
              case 'bpm':
                global.bpm = Number(value);
                for(const v of this.tracks){
                  if(!v) continue;
                  v.data.setTempo(global.bpm);
                }
                break;
              case 'fermata':
                global.fermataLength = Number(value);
                break;
              default: throw Error(`#${i} Unhandled (set-global-variable, ${key})`);
            }
            i += C.length - 1;
          }else{
            // 지역 설정
            if(!track) throw Error(`#${i} No channel specified`);
            const [ C, key, value ] = assert(/^\((.+?)=(.+?)\)/, i, 'set-local-variable');

            switch(key){
              case 'o': track.octave = parseInt(value); break;
              case 'p': track.data.addEvent(new MIDI.ProgramChangeEvent({
                channel: track.id,
                instrument: parseInt(value)
              } as any)); break;
              case 'q':
                if(value === "?3"){
                  originalQuantization = track.quantization;
                  quantizationCarry = 0;
                  track.quantization = `T${0.6 * getTickDuration(originalQuantization)}` as any;
                }else if(value === "?5"){
                  originalQuantization = track.quantization;
                  quantizationCarry = 0;
                  track.quantization = `T${0.4 * getTickDuration(originalQuantization)}` as any;
                }else if(value === "?"){
                  if(!originalQuantization) throw Error(`#${i} No original quantization`);
                  track.quantization = originalQuantization;
                  originalQuantization = undefined;
                }else{
                  track.quantization = value as MIDI.Duration;
                }
                break;
              case 's': (track.data as any).controllerChange(64, parseInt(value)); break;
              case 't': track.transpose = parseInt(value); break;
              case 'v': track.velocity = parseInt(value); break;
            }
            i += C.length - 1;
          }
          break;
        case "#":{
          if(track?.repeat) throw Error(`#${i} Incomplete repeat`);
          addNote(i, true);
          wait = [];
          // 채널 선언
          const [ C, idText ] = assert(/^#(\d+)/, i, 'declare-channel');
          const id = parseInt(idText);

          track = this.trackPreset
            ? {
              ...this.trackPreset,
              data: new MIDI.Track()
            }
            : {
              id,
              data: new MIDI.Track(),
              quantization: '16',
              octave: 4,
              velocity: 80,
              transpose: 0,
              position: 0
            }
          ;
          if(track.position > 0){
            wait.push(`T${track.position}` as any);
          }
          track.data.setTempo(global.bpm);
          this.tracks.push(track);
          i += C.length - 1;
        } break;
        case "[":
          addNote(i, true);
          switch(n1){
            case "[":{
              if(!track) throw Error(`#${i} No channel specified`);
              // 병렬 열기
              const [ C ] = assert(/^\[\[([\s\S]+?)(?=\]\])/, i, 'parallel');
              const list = C.split('|');

              if(list.length <= 1) throw Error(`#${i} Useless parallel`);
              for(const v of list.slice(1)){
                const child = new Sorrygle(v);

                child.trackPreset = {
                  ...track,
                  position: track.position
                };
                child.parse();
                this.tracks.push(...child.tracks);
              }
              parallelRange = [ i + list[0].length, i + C.length + 1 ];
              i++;
            } break;
            case ">":
              // 꾸밈음 열기
              inChord = 'grace';
              i++;
              break;
            default:
              // 화음 열기
              inChord = 'normal';
          }
          break;
        case "]":
          // 화음 닫기
          if(!inChord) throw Error(`#${i} No chord`);
          if(inChord === 'normal' && !prevNote?.[0].length) throw Error(`#${i} Empty chord`);
          if(inChord === 'grace' && !pendingGrace!.length) throw Error(`#${i} Empty grace`);
          inChord = undefined;
          break;
        case "<":{
          let type:DiacriticType;
          let args:any[]|undefined;
          let argsRange:[number, number]|undefined;

          addNote(i);
          if(!track) throw Error(`#${i} No channel specified`);
          // 악상 기호 열기
          switch(n1){
            case "~": type = DiacriticType.FERMATA; break;
            case "!": type = DiacriticType.SFORZANDO; break;
            case ".": type = DiacriticType.STACCATO; break;
            case "t": type = DiacriticType.TRILL; break;
            case "+":{
              let C:string;

              type = DiacriticType.CRESCENDO;
              [ C, ...args ] = assert(/^<\+[\s\S]+?(\d+)(?=>)/, i, 'diacritic-crescendo');
              if(track.velocity >= parseInt(args[0])) throw Error(`#${i} Useless crescendo`);
              argsRange = [ i + C.length - args[0].length, i + C.length - 1 ];
            } break;
            case "-":{
              let C:string;

              type = DiacriticType.DECRESCENDO;
              [ C, ...args ] = assert(/^<-[\s\S]+?(\d+)(?=>)/, i, 'diacritic-decrescendo');
              if(track.velocity <= parseInt(args[0])) throw Error(`#${i} Useless decrescendo`);
              argsRange = [ i + C.length - args[0].length, i + C.length - 1 ];
            } break;
            default: throw Error(`#${i} Unknown diacritic: ${n1}`);
          }
          pendingDiacritics.push({
            type,
            args,
            notes: [],
            argsRange
          });
          i++;
        } break;
        case ">":
          addNote(i);
          // 악상 기호 닫기
          if(!pendingDiacritics.length) throw Error(`#${i} No diacritics opened`);
          popDiacritic();
          break;
        case "|":
          if(n1 !== ":") throw Error(`#${i} Unknown character: ${n1}`);
          if(!track) throw Error(`#${i} No channel specified`);
          if(track.repeat) throw Error(`#${i} Incomplete repeat`);
          addNote(i, true);
          // 여는 도돌이표
          i++;
          track.repeat = {
            start: i,
            count: 1,
            current: 0
          };
          break;
        case ":":{
          if(!track) throw Error(`#${i} No channel specified`);
          if(!track.repeat) throw Error(`#${i} Please open a repeat`);
          addNote(i, true);
          // 닫는 도돌이표
          const [ C, repeat ] = assert(/^:\|(\d+)?/, i, 'close-repeat');
          const count = parseInt(repeat || "1");

          if(isNaN(count) || count < 1) throw Error(`#${i} Malformed repeat: ${repeat}`);
          if(!track.repeat.closed){
            track.repeat.count = count;
            track.repeat.closed = true;
          }
          if(track.repeat.current >= track.repeat.count){
            delete track.repeat;
            i += C.length - 1;
          }else{
            track.repeat.current++;
            i = track.repeat.start;
          }
        } break;
        case "/":
          if(!track) throw Error(`#${i} No channel specified`);
          addNote(i, true);
          switch(n1){
            case "1":
              if(!track.repeat || track.repeat.count > 1) throw Error(`#${i} Unexpected prima volta`);
              if(track.repeat.current === 1){
                const [ C ] = assert(/^\/1[\s\S]+?:\|\s*(\/2)?/, i, 'repeat');

                delete track.repeat;
                i += C.length - 1;
              }else{
                i++;
              }
              break;
            default: throw Error(`#${i} Unknown character: ${n1}`);
          }
          break;
        case "c": case "d": case "e": case "f": case "g": case "a": case "b":
        case "C": case "D": case "F": case "G": case "A":{
          if(!track) throw Error(`#${i} No channel specified (note)`);
          addNote(i);
          let octave = track.octave;
          let key:MIDI.Pitch;

          if(inChord){
            octave += octaveOffset;
            octaveOffset = 0;
          }
          key = `${Sorrygle.NOTES[c]}${octave}`;
          switch(inChord){
            case 'normal':
              if(prevNote) prevNote[0].push(key);
              else prevNote = [
                [ key ],
                [ track.quantization ]
              ];
              break;
            case 'grace':
              if(pendingGrace) pendingGrace.push(key);
              else pendingGrace = [ key ];
              break;
            default: prevNote = [
              [ key ],
              [ track.quantization ]
            ];
          }
        } break;
        case "^":
          addNote(i);
          // 한 옥타브 위
          octaveOffset++;
          break;
        case "v":
          addNote(i);
          // 한 옥타브 아래
          octaveOffset--;
          break;
        case "_":
          // 쉼표
          addNote(i, true);
          if(!track) throw Error(`#${i} No channel specified`);
          wait.push(track.quantization);
          break;
        case "~":
          // 길이 연장
          if(!track) throw Error(`#${i} No channel specified`);
          if(!prevNote) throw Error(`#${i} No previous note (long)`);
          prevNote[1].push(track.quantization);
          break;
        default:
          if(c.trim()) throw Error(`#${i} Unknown character: ${c}`);
      }
    }
    addNote(chunk.length, true);

    function assert(pattern:RegExp, i:number, name:string):RegExpMatchArray{
      const R = chunk.slice(i).match(pattern);

      if(!R) throw Error(`#${i} Malformed (${name}) (${chunk.slice(0, 10)}...)`);
      return R;
    }
    function addNote(i:number, breakChord?:boolean):void{
      if(!prevNote) return;
      if(inChord){
        if(breakChord) throw Error(`#${i} Incomplete chord`);
        else return;
      }
      if(!track) throw Error(`#${i} No channel specified`);
      if(track.transpose){
        prevNote[0] = prevNote[0].map(v => transpose(v));
        if(pendingGrace) pendingGrace = pendingGrace.map(v => transpose(v));
      }
      if(octaveOffset){
        prevNote[0] = prevNote[0].map(v => {
          const [ , a, b ] = v.match(Sorrygle.REGEXP_PITCH)!;

          return `${a}${parseInt(b) + octaveOffset}` as any;
        });
        octaveOffset = 0;
      }
      for(const v of pendingGrace || []){
        track.position += Sorrygle.GRACE_LENGTH + getTickDuration(wait);
        track.data.addEvent(new MIDI.NoteEvent({
          pitch: v,
          duration: `T${Sorrygle.GRACE_LENGTH}` as any,
          channel: track.id,
          velocity: track.velocity,
          wait
        }));
        prevNote[1].push(`T-${Sorrygle.GRACE_LENGTH}` as any);
        wait = [];
      }
      for(let i = 0; i < prevNote[1].length; i++){
        const v = prevNote[1][i];
        if(!v.startsWith("T")){
          continue;
        }
        const y = Number(v.slice(1));
        let x = Math.floor(y);

        quantizationCarry += y - x;
        if(quantizationCarry >= 1){
          quantizationCarry--;
          x++;
        }
        prevNote[1][i] = `T${x}` as any;
      }

      const options:(typeof pendingDiacritics)[number]['notes'][number] = {
        pitch: prevNote[0],
        duration: prevNote[1],
        channel: track.id,
        velocity: track.velocity,
        wait
      };
      if(pendingDiacritics.length){
        pendingDiacritics[pendingDiacritics.length - 1].notes.push(options);
      }else{
        track.position += getTickDuration(options.duration) + getTickDuration(options.wait);
        track.data.addEvent(new MIDI.NoteEvent(options));
      }
      prevNote = undefined;
      pendingGrace = undefined;
      wait = [];
    }
    function popDiacritic():void{
      const diacritic = pendingDiacritics.pop();
      let internalWait:MIDI.Duration[] = [];
      let newVelocity = track!.velocity;

      if(!diacritic){
        throw Error("No diacritics opened");
      }
      diacritic.notes.forEach((v, i, my) => {
        const notes:typeof pendingDiacritics[number]['notes'] = [ v ];
        
        if(internalWait.length){
          v.wait.push(...internalWait);
          internalWait = [];
        }
        switch(diacritic.type){
          case DiacriticType.FERMATA:
            v.duration = [ `T${getTickDuration(v.duration) * global.fermataLength}` as any ];
            break;
          case DiacriticType.SFORZANDO:
            v.velocity = 100;
            break;
          case DiacriticType.STACCATO:
            internalWait.push(`T${getTickDuration(v.duration) - 8}` as any);
            v.duration = [ "T8" as any ];
            break;
          case DiacriticType.TRILL:{
            const pitch = v.pitch instanceof Array ? v.pitch : [ v.pitch ];
            let left = getTickDuration(v.duration);

            notes.shift();
            while(left >= Sorrygle.TRILL_LENGTH){
              left -= Sorrygle.TRILL_LENGTH;
              if(notes.length % 2){
                notes.push({
                  ...v,
                  pitch: pitch.map(w => transpose(w, true)),
                  duration: [ `T${Sorrygle.TRILL_LENGTH}` as any ],
                  wait: []
                });
              }else{
                notes.push({
                  ...v,
                  duration: [ `T${Sorrygle.TRILL_LENGTH}` as any ],
                  wait: []
                });
              }
            }
            internalWait.push(`T${left}` as any);
          } break;
          case DiacriticType.CRESCENDO:
          case DiacriticType.DECRESCENDO:
            if(!diacritic.args) throw Error(`#${i} Malformed diacritic`);
            v.velocity = track!.velocity + i / (my.length - 1) * (diacritic.args[0] - track!.velocity);
            newVelocity = v.velocity;
            break;
        }
        if(pendingDiacritics.length){
          pendingDiacritics[pendingDiacritics.length - 1].notes.push(...notes);
        }else{
          track!.position += getTickDuration(v.duration) + getTickDuration(v.wait);
          track!.data.addEvent(notes.map(w => new MIDI.NoteEvent(w)));
        }
      });
      if(internalWait.length){
        wait.push(...internalWait);
      }
      track!.velocity = newVelocity;
    }
    function transpose(v:MIDI.Pitch, forTrill?:boolean):MIDI.Pitch{
      const [ , a, b ] = v.match(Sorrygle.REGEXP_PITCH)!;
      const sequence = Sorrygle.NOTE_SEQUENCES.indexOf(a as any);
      let newSequence = sequence + (forTrill
        ? a === "E" || a === "B" || a.endsWith("#") ? 1 : 2
        : track!.transpose
      );
      let carry = 0;

      if(newSequence >= Sorrygle.NOTE_SEQUENCES.length){
        carry++;
        newSequence -= Sorrygle.NOTE_SEQUENCES.length;
      }
      if(newSequence < 0){
        carry--;
        newSequence += Sorrygle.NOTE_SEQUENCES.length;
      }
      return `${Sorrygle.NOTE_SEQUENCES[newSequence]}${parseInt(b) + carry}` as any;
    }
  }
}