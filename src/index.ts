import MIDI = require("midi-writer-js");

type Table<T> = {
  [key:string]: T
};
type GlobalSet = {
  'fermataLength': number
};
type TrackSet = {
  'id': number,
  'data': MIDI.Track,
  'pitchBendData'?: MIDI.Track,
  'pitchBendPosition'?: number,
  'octave': number,
  'quantization': MIDI.Duration,
  'velocity': number,
  'transpose': number,
  'position': number,
  'wait': MIDI.Duration[],
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
  DECRESCENDO,
  PITCH_BEND
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
    c: "C", d: "D", e: "E", f: "F", g: "G", a: "A", b: "B",
    C: "C#", D: "D#", F: "F#", G: "G#", A: "A#",

    도: "C", 레: "D", 미: "E", 파: "F", 솔: "G", 라: "A", 시: "B",
    돗: "C#", 렛: "D#", 팟: "F#", 솘: "G#", 랏: "A#",
    렢: "Db", 밒: "Eb", 솚: "Gb", 랖: "Ab", 싶: "Bb"
  } as const;
  private static readonly NOTE_SEQUENCES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ] as const;
  private static readonly INSTRUMENTS:Table<number> = {
    '🎹': 0,
    '🪗': 21,
    '🎸': 24,
    '🎻': 40,
    '🎤': 54,
    '🎺': 56,
    '🎷': 64,
    '🪕': 105,
    '🥁': 118
  };
  private static readonly REGEXP_PITCH = /^([A-G]#?)(\d+)$/;
  private static readonly RESOLUTION = 8;
  private static readonly GRACE_LENGTH = 8;
  private static readonly TRILL_LENGTH = 16;
  private static readonly INITIAL_GAS = 100000;

  public static compile(data:string):Buffer{
    const R = new Sorrygle(data);
    
    try{
      R.parse();
      return R.compile();
    }catch(e){
      if(e instanceof Error && e.message.startsWith("#")){
        const [ , indexText ] = e.message.match(/^#(\d+)/)!;
        const index = parseInt(indexText);
        const text = R.data.substr(Math.max(0, index - 10), 30);

        e.message += `\n${" ".repeat(Math.min(10, index))}↓ here\n${text.replace(/\r?\n/g, " ")}`;
      }
      throw e;
    }
  }
  private static preprocess(data:string):string{
    const validNotes = new RegExp(`([v^\s]*[${Object.keys(Sorrygle.NOTES).join('')}])([~\s]*)`, "g");
    const ref:Table<string> = {};
    const udr:Table<string> = {};
    let R = data.replace(/(.*)=\/|\/=(.*)/mg, "");

    return R
      .replace(/\{\{([^\}]+)\}\}\s*\{([\s\S]+?)\}/g, (_, g1:string, g2:string) => {
        // UDR 선언
        if(g1 in udr) throw Error(`Already declared range: ${g1}`);
        udr[g1] = g2.trim();
        return "";
      }).replace(/\{\{([^\}]+)\}\}\s*\(([\s\S]*?)\)/g, (_, g1:string, g2:string) => {
        if(!udr[g1]) throw Error(`No such range: ${g1}`);
        return g2.replace(validNotes, (_, h1:string, h2:string) => udr[g1].replace(/x/g, h1) + h2);
      }).replace(/\{(\d+)([\s\S]+?)\}/g, (_, g1:string, g2:string) => {
        // 그룹 선언
        if(g1 in ref) throw Error(`Already declared group: ${g1}`);
        ref[g1] = g2;
        return g2;
      }).replace(/\{=(\d+)\}/g, (_, g1:string) => {
        // 그룹 참조
        if(!ref[g1]) throw Error(`No such group: ${g1}`);
        return ref[g1].replace(/\|:|:\|\d*|\/\d+/g, "");
      }).replace(/\(p=(\D+?)\)/g, (_, g1:string) => (
        // 이모지 악기
        `(p=${Sorrygle.INSTRUMENTS[g1] || g1})`
      )).replace(/\(s(?!=)([\s\S]+?)\)/g, (_, g1:string) => (
        // 서스테인 페달
        `(s=127)${g1}(s=0)`
      )).replace(/\(\^([\s\S]+?)\)/g, (_, g1:string) => (
        // 그룹 옥타브 올리기
        g1.replace(/[A-G]/gi, "^$&")
      )).replace(/\(v(?!=)([\s\S]+?)\)/g, (_, g1:string) => (
        // 그룹 옥타브 내리기
        g1.replace(/[A-G]/gi, "v$&")
      )).replace(/\((3|5|7)([\s\S]+?)\)/g, (_, g1:string, g2:string) => (
        // 잇단음표
        `(q=?${g1})${g2}(q=?)`
      ))
    ;
  }
  private static transpose(v:MIDI.Pitch, amount:number, forTrill?:boolean):MIDI.Pitch{
    if(!amount && !forTrill){
      return v;
    }
    const [ , a, b ] = v.match(Sorrygle.REGEXP_PITCH)!;
    const sequence = Sorrygle.NOTE_SEQUENCES.indexOf(a as any);
    let newSequence = sequence + (forTrill
      ? a === "E" || a === "B" || a.endsWith("#") ? 1 : 2
      : amount
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

  private readonly data:string;
  private globalPreset?:GlobalSet;
  private trackPreset?:TrackSet;
  private configurationTrack:TrackSet;
  private tracks:TrackSet[];
  private gas:number;

  constructor(data:string){
    this.data = Sorrygle.preprocess(data);
    this.configurationTrack = this.createTrack(0);
    this.tracks = [];
    this.gas = Sorrygle.INITIAL_GAS;
  }
  private createTrack(id:number):TrackSet{
    return this.trackPreset
      ? {
        ...this.trackPreset,
        data: new MIDI.Track(),
        wait: [ ...this.trackPreset.wait ]
      }
      : {
        id,
        data: new MIDI.Track(),
        quantization: '16',
        octave: 4,
        velocity: 80,
        transpose: 0,
        position: 0,
        wait: []
      }
    ;
  }

  public compile():Buffer{
    const data = [ this.configurationTrack.data ];

    for(const v of this.tracks){
      if(v.pitchBendData) data.push(v.pitchBendData);
      data.push(v.data);
    }
    return Buffer.from(new MIDI.Writer(data).buildFile());
  }
  public parse():void{
    const global:GlobalSet = {
      fermataLength: 2,
      ...(this.globalPreset || {})
    };
    const chunk = this.data;
    let track:TrackSet|undefined;
    let inChord:'normal'|'grace'|undefined;
    let prevNote:[notes:MIDI.Pitch[], length:MIDI.Duration[]]|undefined;

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
    
    const addNote = (i:number, breakChord?:boolean) => {
      if(!track){
        track = this.createTrack(1);
        if(track.position > 0){
          track.wait.push(`T${track.position}` as any);
        }
        this.tracks.push(track);
      }
      if(!prevNote) return;
      if(inChord){
        if(breakChord) throw Error(`#${i} Incomplete chord`);
        else return;
      }
      if(track.transpose){
        prevNote[0] = prevNote[0].map(v => Sorrygle.transpose(v, track!.transpose));
        if(pendingGrace) pendingGrace = pendingGrace.map(v => Sorrygle.transpose(v, track!.transpose));
      }
      if(octaveOffset){
        prevNote[0] = prevNote[0].map(v => {
          const [ , a, b ] = v.match(Sorrygle.REGEXP_PITCH)!;

          return `${a}${parseInt(b) + octaveOffset}` as any;
        });
        octaveOffset = 0;
      }
      for(const v of pendingGrace || []){
        track.position += Sorrygle.GRACE_LENGTH + getTickDuration(track.wait);
        track.data.addEvent(new MIDI.NoteEvent({
          pitch: v,
          duration: `T${Sorrygle.GRACE_LENGTH}` as any,
          channel: track.id,
          velocity: track.velocity,
          wait: track.wait
        }));
        prevNote[1].push(`T-${Sorrygle.GRACE_LENGTH}` as any);
        track.wait = [];
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
        wait: track.wait
      };
      if(pendingDiacritics.length){
        pendingDiacritics[pendingDiacritics.length - 1].notes.push(options);
      }else{
        track.position += getTickDuration(options.duration) + getTickDuration(options.wait);
        track.data.addEvent(new MIDI.NoteEvent(options));
      }
      prevNote = undefined;
      pendingGrace = undefined;
      track.wait = [];
    };
    const getGhostNote = (length:number) => new MIDI.NoteEvent({
      pitch: [ "C1" ],
      duration: [ "T0" as any ],
      velocity: 0,
      wait: [ `T${length}` as any ]
    });

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
                this.configurationTrack.data.addEvent(getGhostNote(track!.position - this.configurationTrack.position));
                this.configurationTrack.data.setTempo(Number(value));
                this.configurationTrack.position = track!.position;
                break;
              case 'time-sig':{
                const [ n, d ] = value.split('/');

                this.configurationTrack.data.addEvent(getGhostNote(track!.position - this.configurationTrack.position));
                this.configurationTrack.data.setTimeSignature(parseInt(n), parseInt(d));
                this.configurationTrack.position = track!.position;
              } break;
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
                // 잇단음표
                if(value === "?3"){
                  originalQuantization = track.quantization;
                  quantizationCarry = 0;
                  track.quantization = `T${2 * getTickDuration(originalQuantization) / 3}` as any;
                }else if(value === "?5"){
                  originalQuantization = track.quantization;
                  quantizationCarry = 0;
                  track.quantization = `T${0.4 * getTickDuration(originalQuantization)}` as any;
                }else if(value === "?7"){
                  originalQuantization = track.quantization;
                  quantizationCarry = 0;
                  track.quantization = `T${2 * getTickDuration(originalQuantization) / 7}` as any;
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
          // 채널 선언
          const [ C, idText ] = assert(/^#(\d+)/, i, 'declare-channel');
          const id = parseInt(idText);

          if(id < 1 || id > 16) throw Error(`#${i} Invalid channel ID: ${id}`);
          track = this.createTrack(id);
          this.tracks.push(track);
          i += C.length - 1;
        } break;
        case "[":
          addNote(i, true);
          switch(n1){
            case "[":{
              // 병렬 열기
              const [ C ] = assert(/^\[\[([\s\S]+?)(?=\]\])/, i, 'parallel');
              const list = C.split('|');

              if(list.length <= 1) throw Error(`#${i} Useless parallel`);
              for(const v of list.slice(1)){
                const child = new Sorrygle(v);

                child.globalPreset = global;
                child.trackPreset = {
                  ...track!
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
              if(track!.velocity >= parseInt(args[0])) throw Error(`#${i} Useless crescendo`);
              argsRange = [ i + C.length - args[0].length, i + C.length - 1 ];
            } break;
            case "-":{
              let C:string;

              type = DiacriticType.DECRESCENDO;
              [ C, ...args ] = assert(/^<-[\s\S]+?(\d+)(?=>)/, i, 'diacritic-decrescendo');
              if(track!.velocity <= parseInt(args[0])) throw Error(`#${i} Useless decrescendo`);
              argsRange = [ i + C.length - args[0].length, i + C.length - 1 ];
            } break;
            case "p":
              type = DiacriticType.PITCH_BEND;
              args = [];
              break;
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
          popDiacritic(i);
          break;
        case "|":
          if(n1 !== ":") throw Error(`#${i} Unknown character: ${n1}`);
          if(track?.repeat) throw Error(`#${i} Incomplete repeat`);
          addNote(i, true);
          // 여는 도돌이표
          i++;
          track!.repeat = {
            start: i,
            count: 1,
            current: 0
          };
          break;
        case ":":{
          if(!track?.repeat) throw Error(`#${i} Please open a repeat`);
          addNote(i, true);
          // 닫는 도돌이표
          const [ C, repeat ] = assert(/^:\|(\d+)?/, i, 'close-repeat');
          const count = parseInt(repeat || "1");

          if(isNaN(count) || count < 1) throw Error(`#${i} Malformed repeat: ${repeat}`);
          if(!track!.repeat.closed){
            track!.repeat.count = count;
            track!.repeat.closed = true;
          }
          if(track!.repeat.current >= track!.repeat.count){
            delete track!.repeat;
            i += C.length - 1;
          }else{
            track!.repeat.current++;
            i = track!.repeat.start;
          }
        } break;
        case "/":
          addNote(i, true);
          switch(n1){
            case "1":
              if(!track!.repeat || track!.repeat.count > 1) throw Error(`#${i} Unexpected prima volta`);
              if(track!.repeat.current === 1){
                const [ C ] = assert(/^\/1[\s\S]+?:\|\s*(\/2)?/, i, 'repeat');

                delete track!.repeat;
                i += C.length - 1;
              }else{
                i++;
              }
              break;
            default: throw Error(`#${i} Unknown character: ${n1}`);
          }
          break;
        case "c": case "d": case "e": case "f": case "g": case "a": case "b":
        case "C": case "D": case "F": case "G": case "A":
        case "도": case "레": case "미": case "파": case "솔": case "라": case "시":
        case "돗": case "렛": case "팟": case "솘": case "랏":
        case "렢": case "밒": case "솚": case "랖": case "싶":{
          addNote(i);
          const [ C, semitones ] = assert(/^.([-+]*)/, i, 'semitone');
          let semitone = 0;
          let octave = track!.octave;
          let key:MIDI.Pitch;

          if(inChord){
            octave += octaveOffset;
            octaveOffset = 0;
          }
          for(let j = 0; j < semitones.length; j++){
            if(semitones[j] === "+") semitone++;
            else semitone--;
          }
          key = Sorrygle.transpose(`${Sorrygle.NOTES[c]}${octave}`, semitone);
          switch(inChord){
            case 'normal':
              if(prevNote) prevNote[0].push(key);
              else prevNote = [
                [ key ],
                [ track!.quantization ]
              ];
              break;
            case 'grace':
              if(pendingGrace) pendingGrace.push(key);
              else pendingGrace = [ key ];
              break;
            default: prevNote = [
              [ key ],
              [ track!.quantization ]
            ];
          }
          i += C.length - 1;
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
        case "_": case "ㅇ":
          // 쉼표
          addNote(i, true);
          track!.wait.push(track!.quantization);
          break;
        case "~": case "ㅡ":
          // 길이 연장
          if(!track) throw Error(`#${i} No channel specified`);
          if(!prevNote) throw Error(`#${i} No previous note (long)`);
          prevNote[1].push(track.quantization);
          break;
        case "0": case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9":
        case "-": case ".":{
          // 숫자 구성 요소
          const topDiacritic = pendingDiacritics[pendingDiacritics.length - 1];
          
          if(topDiacritic?.type === DiacriticType.PITCH_BEND){
            const [ C ] = assert(/^[-.0-9]+/, i, 'pitch-bend-frame');
            const value = parseFloat(C);
            if(isNaN(value) || value < -1 || value > 1) throw Error(`#${i} Malformed pitch bend value: ${C}`);
            const samples = topDiacritic.notes.map(v => [ v.duration, v.wait ]);

            samples.push([ track!.wait ]);
            if(prevNote) samples.push([ prevNote[1] ]);
            topDiacritic.args!.push([
              track!.position + getTickDuration(samples.flat(2)),
              value
            ]);
            i += C.length - 1;
            break;
          }
        } default:
          if(c.trim()) throw Error(`#${i} Unknown character: ${c}`);
      }
    }
    addNote(chunk.length, true);

    function assert(pattern:RegExp, i:number, name:string):RegExpMatchArray{
      const R = chunk.slice(i).match(pattern);

      if(!R) throw Error(`#${i} Malformed (${name}) (${chunk.slice(0, 10)}...)`);
      return R;
    }
    function popDiacritic(index:number):void{
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
                  pitch: pitch.map(w => Sorrygle.transpose(w, track!.transpose, true)),
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
            if(!diacritic.args) throw Error(`#${index} Malformed diacritic`);
            v.velocity = track!.velocity + i / (my.length - 1) * (diacritic.args[0] - track!.velocity);
            newVelocity = v.velocity;
            break;
          case DiacriticType.PITCH_BEND: if(!i){
            // 안에 노트가 얼마나 있든 한 번만 처리하면 된다.
            if(!diacritic.args || diacritic.args.length < 1) throw Error(`#${index} Malformed pitch bend`);
            const data = track!.pitchBendData || new MIDI.Track();
            const frames:[number, number][] = diacritic.args;
            let prevPosition = track!.pitchBendPosition || 0;
            const setBend = (position:number, value:number) => {
              data.addEvent(getGhostNote(position - prevPosition));
              data.addEvent(new (MIDI as any)['PitchBendEvent']({
                channel: track!.id - 1,
                bend: value
              }));
              prevPosition = position;
            };
            setBend(...frames[0]);
            for(let j = 1; j < frames.length; j++){
              const prev = frames[j - 1];
              const curr = frames[j];
              const gap = curr[1] - prev[1];
              
              for(let k = prev[0]; k < curr[0]; k += Sorrygle.RESOLUTION){
                const rate = (k - prev[0]) / (curr[0] - prev[0]);
                
                setBend(k, prev[1] + gap * rate);
              }
              setBend(...curr);
            }
            setBend(track!.position + getTickDuration(
              diacritic.notes.map(v => [ v.duration, v.wait ]).flat(2)
            ), 0);
            track!.pitchBendData = data;
            track!.pitchBendPosition = prevPosition;
          } break;
        }
        if(pendingDiacritics.length){
          pendingDiacritics[pendingDiacritics.length - 1].notes.push(...notes);
        }else{
          track!.position += getTickDuration(v.duration) + getTickDuration(v.wait);
          track!.data.addEvent(notes.map(w => new MIDI.NoteEvent(w)));
        }
      });
      if(internalWait.length){
        track!.wait.push(...internalWait);
      }
      track!.velocity = newVelocity;
    }
  }
}