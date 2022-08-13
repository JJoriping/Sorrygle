import MIDI = require("midi-writer-js");
import { AST } from "./AST";
import SemanticError from "./SemanticError";
import { toTick, getTickDuration, transpose, getControllerChangePacket, getGhostNote } from "./utils";

export type GlobalConfiguration = {
  'track': MIDI.Track,
  'position': number,
  'fermataLength': number
};
export const enum ControllerType{
  BANK_SELECT_MSB = 0,
  BANK_SELECT_LSB = 32,
  SUSTAIN_PEDAL = 64
}
export type MIDIArrayOptions = Omit<MIDI.Options, 'pitch'>&{
  'ignore'?: true,
  'graced'?: true,
  'arpeggio'?: true,
  'pitch': Array<MIDI.Pitch|`x${number}/${number}`>,
  'duration': MIDI.Duration[],
  'wait': MIDI.Duration[]
};
export type MIDIOptionModifier = (options:MIDIArrayOptions, caller:TrackSet, position:number, l:number) => void;

export class TrackSet{
  private static readonly NOTES:{ [key:string]: `${MIDI.BasePitch}${MIDI.PitchModifier}` } = {
    c: "C", d: "D", e: "E", f: "F", g: "G", a: "A", b: "B",
    C: "C#", D: "D#", F: "F#", G: "G#", A: "A#",

    도: "C", 레: "D", 미: "E", 파: "F", 솔: "G", 라: "A", 시: "B",
    돗: "C#", 렛: "D#", 팟: "F#", 솘: "G#", 랏: "A#",
    렢: "Db", 밒: "Eb", 솚: "Gb", 랖: "Ab", 싶: "Bb"
  };
  private static readonly SNAPSHOT_NODES:Exclude<AST.Node, null>['type'][] = [
    'global-configuration',
    'group-declaration',
    'group-reference',
    'local-configuration',
    'notation',
    'parallelization',
    'range',
    'rest',
    'volta'
  ];

  public readonly channel:number;
  public readonly events:Array<{
    'type': "note",
    'l': number,
    'options': MIDIArrayOptions
  }|{
    'type': "program",
    'program': number,
    'bank': number
  }|{
    'type': "controller",
    'key': ControllerType,
    'value': number
  }|{
    'type': "bpm",
    'position': number,
    'value': number
  }>;
  public readonly children:TrackSet[];
  private readonly pitchBend:[position:number, value:number][];

  public octave:number;
  public quantization:MIDI.Duration;
  public transpose:number;
  public velocity:number;
  private rests:MIDI.Duration[];
  private position:number;
  private snapshot:AST.Node[];
  private repeatShapshot?:AST.Node[];
  private tuplet?:{
    'stack': number,
    'error': number
  };

  private get isDummy():boolean{
    return this.channel === -1;
  }
  public get dummy():TrackSet{
    return new TrackSet(-1).override(this);
  }
  public get isEmpty():boolean{
    return this.events.length < 1 && this.children.every(v => v.events.length < 1);
  }

  constructor(channel:number){
    this.channel = channel;
    this.events = [];

    this.octave = 4;
    this.quantization = "16";
    this.transpose = 0;
    this.velocity = 80;
    this.children = [];
    this.rests = [];
    this.position = 0;
    this.pitchBend = [];
    this.snapshot = [];
  }
  private checkTuplet(tick:number):number{
    if(!this.tuplet) return 0;
    let R = 0;
    
    this.tuplet.error += Math.round(tick / getTickDuration(this.quantization));
    while(this.tuplet.error >= this.tuplet.stack){
      this.tuplet.error -= this.tuplet.stack;
      R++;
    }
    return R;
  }
  private override(parent:TrackSet):this{
    this.octave = parent.octave;
    this.quantization = parent.quantization;
    this.transpose = parent.transpose;
    this.velocity = parent.velocity;
    return this;
  }

  public add(set:AST.KeySet|AST.ChordSet, modifiers:MIDIOptionModifier[] = []):number{
    const keys = set.type === "key" ? [ set ] : set.value;
    const duration = [ this.quantization ];
    const notes = keys.map(v => {
      let octave = this.octave;
      let semitone = 0;

      for(const w of v.prefix || []) switch(w){
        case "^": octave++; break;
        case "v": octave--; break;
        default: if(w) throw new SemanticError(v.l, `Unhandled prefix: ${w}`);
      }
      for(const w of v.suffix || []) switch(w){
        case "+": semitone++; break;
        case "-": semitone--; break;
        default: if(w) throw new SemanticError(v.l, `Unhandled suffix: ${w}`);
      }
      return v.key === "x"
        ? `x${octave - this.octave}/${this.transpose + semitone}` as const
        : transpose(`${TrackSet.NOTES[v.key]}${octave}`, this.transpose + semitone)
      ;
    });
    const options = {
      pitch: notes,
      duration,
      channel: this.channel,
      velocity: this.velocity,
      wait: this.rests
    };
    // NOTE Modifiers may rest.
    this.rests = [];
    for(let i = modifiers.length - 1; i >= 0; i--){
      modifiers[i](options, this, this.position, set.l);
    }
    if(this.tuplet){
      const ticks = getTickDuration(options.duration) + getTickDuration(this.rests);
      const calibration = this.checkTuplet(ticks);
      
      if(calibration){
        if(this.rests.length) this.rest(calibration);
        else if(!this.children[0]) this.rest(calibration);
        else this.tie(set.l, calibration);
      }
    }
    return this.addRaw(set.l, options);
  }
  public addPitchBend(position:number|null, value:number):this{
    this.pitchBend.push([ position ?? this.position, value ]);
    return this;
  }
  public addRaw(l:number, options:MIDIArrayOptions):number{
    if(options.ignore) return 0;
    const R = getTickDuration(options.duration);

    if(options.pitch.find(v => v.startsWith("x"))) throw Error("Unresolved x");
    this.events.push({ type: "note", l, options });
    this.position += R;
    return R;
  }
  public addSnapshot(node:AST.Node):this{
    if(!node || !TrackSet.SNAPSHOT_NODES.includes(node.type)){
      return this;
    }
    if(node.type === "group-declaration"){
      const referenceNode:AST.Node = {
        l: node.l,
        type: "group-reference",
        key: node.key
      };
      this.snapshot.push(referenceNode);
      this.repeatShapshot?.push(referenceNode);
    }else{
      this.snapshot.push(node);
      this.repeatShapshot?.push(node);
    }
    return this;
  }
  public childAt(l:number, index:number):TrackSet{
    let R = this.children[index];

    if(!R){
      R = new TrackSet(this.channel);
      this.children[index] = R;
    }
    R.override(this);
    if(R.position > this.position){
      throw new SemanticError(l, "Child can not be longer than its parent");
    }
    if(R.position < this.position){
      R.rest(this.position - R.position);
    }
    return R;
  }
  public repeatOpen(l:number):this{
    if(this.repeatShapshot) throw new SemanticError(l, "Already opened repeat");
    this.repeatShapshot = [];
    return this;
  }
  public repeatClose(l:number, count:number = 1):AST.Node[]{
    const R = this.repeatShapshot || this.snapshot;
    const primaVolta = R.find(v => v?.type === "volta" && v.value === 1);

    if(primaVolta){
      if(count > 1) throw new SemanticError(l, "Prima volta can exist only if count = 1");
      this.repeatShapshot = undefined;
      return R.slice(0, R.indexOf(primaVolta));
    }
    const r = [ ...R ];
    for(let i = 1; i < count; i++){
      R.push(...r);
    }
    this.repeatShapshot = undefined;
    return R;
  }
  public rest(length?:number, ignoreTuplet?:boolean):number{
    if(length === 0) return 0;
    let actualLength = length ?? getTickDuration(this.quantization);
    if(!ignoreTuplet) actualLength += this.checkTuplet(actualLength);
    const duration = toTick(actualLength);

    this.rests.push(duration);
    const R = getTickDuration(duration);
    this.position += R;
    return R;
  }
  public tie(l:number, length?:number):number{
    if(length === 0) return 0;
    let actualLength = length ?? getTickDuration(this.quantization);
    actualLength += this.checkTuplet(actualLength);
    const duration = toTick(actualLength);
    const R = getTickDuration(duration);

    if(!this.isDummy){
      const lastEvent = this.events.at(-1);
  
      if(lastEvent?.type === "note"){
        lastEvent.options.duration.push(duration);
      }else{
        const firstChildLastEvent = this.children[0].events.at(-1);

        if(firstChildLastEvent?.type === "note" && firstChildLastEvent.options.arpeggio){
          for(const v of this.children){
            const childNote = v?.events.at(-1);
    
            if(childNote?.type === "note" && childNote.options.arpeggio){
              childNote.options.duration.push(duration);
              v.position += R;
            }
          }
          return this.rest(R);
        }else throw new SemanticError(l, "Malformed tie");
      }
    }
    this.position += R;
    return R;
  }
  public setController(key:ControllerType, value:number):this{
    this.events.push({ type: "controller", key, value });
    return this;
  }
  public setInstrument(program:number, bank:number = 0):this{
    this.events.push({ type: "program", program, bank });
    return this;
  }
  public setBPM(value:number):this{
    this.events.push({ type: "bpm", position: this.position, value });
    return this;
  }
  public wrapGlobalConfiguration(l:number, data:GlobalConfiguration, callback:(track:MIDI.Track) => void):this{
    const delta = this.position - data.position;

    if(delta < 0) throw new SemanticError(l, "Global variables can not intersect each other");
    if(delta > 0) data.track.addEvent(getGhostNote(delta));
    callback(data.track);
    data.position = this.position;

    return this;
  }
  public wrapTuplet(l:number, stack:number, callback:() => number):number{
    if(this.tuplet) throw new SemanticError(l, "Tuplets can not be folded");
    const originalQuantization = this.quantization;
    const trueQuantization = 2 * getTickDuration(originalQuantization) / stack;
    let R:number;
    
    this.quantization = toTick(Math.floor(trueQuantization));
    this.tuplet = {
      stack: Math.round(1 / (trueQuantization - Math.floor(trueQuantization))),
      error: 0
    };
    R = callback();
    if(this.tuplet.error > 0){
      R += this.tie(l, this.tuplet.error);
    }
    this.quantization = originalQuantization;
    this.tuplet = undefined;
    return R;
  }

  public out():MIDI.Track[]{
    if(this.isDummy){
      throw Error("Dummy track can not be compiled");
    }
    const pitchBendTrack = new MIDI.Track();
    const data = new MIDI.Track();
    let prevPosition = 0;

    for(const [ position, value ] of this.pitchBend){
      const delta = position - prevPosition;

      if(delta < 0) throw Error(`Malformed position: ${delta}`);
      pitchBendTrack.addEvent(getGhostNote(delta));
      pitchBendTrack.addEvent(new (MIDI as any)['PitchBendEvent']({
        channel: this.channel - 1,
        bend: value
      }));
      prevPosition = position;
    }
    for(const v of this.events){
      switch(v.type){
        case "note":
          if(v.options.duration.length && getTickDuration(v.options.duration) < 1)
            throw new SemanticError(v.l, "Negative duration");
          data.addEvent(new MIDI.NoteEvent(v.options as MIDI.Options));
          break;
        case "program":
          data.addEvent(
            getControllerChangePacket(this.channel, ControllerType.BANK_SELECT_MSB, v.bank),
            getControllerChangePacket(this.channel, ControllerType.BANK_SELECT_LSB, v.bank)
          );
          data.addEvent(new MIDI.ProgramChangeEvent({
            channel: this.channel,
            instrument: v.program
          } as any));
          break;
        case "controller": data.addEvent(getControllerChangePacket(this.channel, v.key, v.value)); break;
      }
    }
    return [
      pitchBendTrack,
      data,
      ...this.children.filter(v => v).map(v => v.out()).flat()
    ];
  }
}