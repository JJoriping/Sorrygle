import MIDI = require("midi-writer-js");

const REGEXP_PITCH = /^([A-G]#?)(\d+)$/;
const NOTE_SEQUENCES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
] as const;

export function getTickDuration(data:string|string[]):number{
  return (MIDI as any)['Utils']['getTickDuration'](data);
}
export function getControllerChangePacket(channel:number, key:number, value:number):any{
  return {
    type: "controller",
    data: (MIDI as any)['Utils']['numberToVariableLength'](0x00)['concat'](
      0xB0 + channel - 1,
      key,
      value
    )
  };
}
export function getGhostNote(length:number):MIDI.NoteEvent{
  return new MIDI.NoteEvent({
    pitch: [ "C1" ],
    duration: [ toTick(0) ],
    velocity: 0,
    wait: [ toTick(length) ]
  });
}
export function transpose(pitch:MIDI.Pitch|`x${number}/${number}`, amount:number, forTrill?:boolean):MIDI.Pitch{
  if(pitch.startsWith("x")) throw Error("x can not be transposed");
  if(!amount && !forTrill){
    return pitch as MIDI.Pitch;
  }
  const [ , a, b ] = pitch.match(REGEXP_PITCH)!;
  const sequence = NOTE_SEQUENCES.indexOf(a as any);
  let newSequence = sequence + (forTrill
    ? a === "E" || a === "B" || a.endsWith("#") ? 1 : 2
    : amount
  );
  let carry = 0;

  if(newSequence >= NOTE_SEQUENCES.length){
    carry++;
    newSequence -= NOTE_SEQUENCES.length;
  }
  if(newSequence < 0){
    carry--;
    newSequence += NOTE_SEQUENCES.length;
  }
  return `${NOTE_SEQUENCES[newSequence]}${parseInt(b) + carry}` as any;
}
export function toTick(value:number):MIDI.Duration{
  return `T${value}` as any;
}