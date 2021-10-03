# Sorrygle
Text-based MIDI-writing language and its parser

🔗 [Online parser](https://sorry.daldal.so/sorrygle) available in Korean

## Introduction
I often chat with my friends via Discord.
However, it becomes cumbersome when I want to share a bundle of melody.
To do so I had to turn on a notation software (e.g., MuseScore) first,
create a new sheet, write the melody, export it to a sound file,
and then finally I could do share.

So as to alleviate this nasty time-consuming process,
I thought that MML (i.e., Music Macro Language) can be a solution.
But I felt disappointment when I realized that MML doesn't support so many *sugars*
such as staccato, sforzando, crescendo, and graces.

Of course MML actually does support some of them (e.g., crescendo),
but you know it's too long to write in comfort.
For example in crescendo, you must change the volume for every note increasingly in MML.

> // Crescendo in MML                        \
> `L8 V1C V2D V3E V4F V5G V6A V7B V8G >V9C1` \
> // Crescendo in Sorrygle                   \
> `(q=8) (v=10)<+cdefgabg ^c~~~~~~~90>`

The problem becomes bigger when it comes to graces.
Assume that a grace note is a 64th note long.
Then you must calculate the total length of graces and subtract the value from the length of the main note.

> // Graces in MML \
> `L64 G A B^32^16 L8 A G A` \
> // Graces in Sorrygle \
> `(q=8) [>ga]baga`

In addition, even if crescendoes and graces can be exist in MML,
I couldn't recognize such notations at a glance *(this is important)*.
That's why I've defined a new language that can be converted into MIDI files.

Now I'm happy 😊.

## Getting Started
### CLI
1. `npm -g install sorrygle`
2. `sorrygle 'cege[c^c]~~~'`
3. Open `output.mid`
4. *Cool and good*.

### Script
1. `npm install sorrygle`
2. 
```js
import { writeFileSync } from "fs";
import { Sorrygle } from "sorrygle";

writeFileSync("./output.mid", Sorrygle.compile("cege[c^c]~~~"));
```
or
```js
const { writeFileSync } = require("fs");
const { Sorrygle } = require("sorrygle");

writeFileSync("./output.mid", Sorrygle.compile("cege[c^c]~~~"));
```
3. Open `output.mid`
4. *Cool and good*.

## Grammar

* `ⓘ` Integer variable
* `ⓝ` Numeric variable
* `ⓓ` [Duration](#duration)

| Notation         | Name                  | Meaning                    | Default |
|------------------|-----------------------|----------------------------|---------|
| `((bpm=ⓘ))`     | BPM configuration     | Set the current BPM to ⓘ. | 120 |
| `((fermata=ⓝ))` | Fermata configuration | Set the length of fermatas to ⓝ. The duration of the note becomes ⓝ times. | 2 |
| `((time-sig=ⓘ/ⓘ))` | Time signature configuration | Set the time signature to ⓘ/ⓘ. | 4/4 |
| `#ⓘ`            | Channel declearation  | (1≤ⓘ≤16) Set the current channel for following input. | 1 |
| `(o=ⓘ)`         | Default octave        | (0≤ⓘ≤8) Set the default octave for following input. | 4 |
| `(p=ⓘ)`         | Instrument            | (0≤ⓘ≤127) Set the instrument for following input. You can refer to [GM 1 Sound Set](https://www.midi.org/specifications-old/item/gm-level-1-sound-set) for determining the number. Please note that `PC# = ⓘ + 1` since ⓘ starts from zero. | 0 |
| `(q=ⓓ)`         | Quantization          | Set the default note/rest/tie length for following input. | 16 |
| `(s=ⓘ)`         | Sustain pedal         | (0≤ⓘ≤127) Set the value of the sustain pedal. It's enabled only if ⓘ≥64. | 0 |
| `(t=ⓘ)`         | Transpose             | Transpose following input. | 0 |
| `(v=ⓘ)`         | Volume                | (1≤ⓘ≤100) Set the volume for following input. | 80 |
| `cdefgab`        | Note                  | Play C, D, E, F, G, A, B in sequence.
| `CDFGA`          | Sharp note            | Play C#, D#, F#, G#, A# in sequence.
| `_`              | Rest                  | Keep silent
| `~`              | Tie                   | Increase the length of the preceding note.
| `[ceg]`          | Chord                 | Play C, E, G at once.
| `^c`             | Octave up             | Play C in one octave higher than the default.
| `vc`             | Octave down           | Play C in one octave lower than the default.
| `(^ceg)`         | Group octave up       | Play all notes in the bracket in one octave higher than the default.
| `(vceg)`         | Group octave down     | Play all notes in the bracket in one octave lower than the default.
| `(3ceg)`         | Triplet               | Set the length of each note to 3/5 of the current quantization.
| `(5cdefg)`       | Quintuplet            | Set the length of each note to 2/5 of the current quantization.
| `[>ga]b`         | Appoggiatura          | Treat all notes in the bracket as appoggiaturas.
| `[[c~~~\|efga]]` | Parallelization       | Play all notes sequentially in each section at once.
| `<.c>`           | Staccato              | Play the note shortly (precisely `T8`).
| `<~c>`           | Fermata               | Play the note lengthy (as configured by *Fermata configuration*).
| `<!c>`           | Sforzando             | Play the note strongly (in the maximum volume).
| `<tc>`           | Trill                 | Play the note as a trill (of interval `T16`).
| `<+cegⓘ>`       | Crescendo             | (1≤ⓘ≤100) Play all notes in the bracket with the increasing volume from the current volume to ⓘ. |
| `<-gecⓘ>`       | Decrescendo           | (1≤ⓘ≤100) Play all notes in the bracket with the decreasing volume from the current volume to ⓘ. |
| `\|:`            | Open repeat           | Set the start point of a repetition. Currently this is compulsory for a repetition unlike musical scores due to a technical issue.
| `:\|ⓘ`          | Close repeat          | (1≤ⓘ) Set the end point of a repetition. You can omit ⓘ if you want to repeat the closed interval just once. | 1 |
| `/1`             | Prima volta           | Play the following notes only if it's the first time to be played.
| `/2`             | Seconda volta         | Play the following notes after one repetition, skipping the notes of the corresponding prima volta. Since currently only prima and seconda voltas are supported, you can omit this.
| `{ⓘceg}`        | Grouping              | Name the set of notes ⓘ.
| `{=ⓘ}`          | Group reference       | Refer the set ⓘ. Repeats are ignored.
| `=/`             | Head comment          | Ignore the text before this.
| `/=`             | Tail comment          | Ignore the text after this.

### Duration
- `1`: Whole note
- `2`: Half note
- `4`: Quarter note
- `8`: 8th note
- `16`: 16th note
- `32`: 32nd note
- `64`: 64th note
- You can put `t` at the end of each number above for triplets.
- You can put `d` or `dd` at the front of each number above for (double-)dotted notes.
- `Tⓘ`: ⓘ-tick-long note. Note that `♩ = T128`.

## Example
🎵 Wolfgang Amadeus Mozart - Turkish March (first 27 bars)
```plain
((time-sig=2/4))
#1
0 =/      ____                         {1 baGa (o=5)
2 =/ |:   c~__dcvbc                       e~__feDe
4 =/      baGabaGa                      } <!^c~~~>a_^c_
6 =/      [>ga]b_[Fa]_[eg]_[Fa]_          [>ga]b_[Fa]_[eg]_[Fa]_
8 =/      [>ga]b_[Fa]_[eg]_[DF]_       /1 e~~~(vbaGa)         :|
10=/ /2   e~~~           |: [ce]_[df]_    [eg]_[eg]_agfe
13=/      [[<!d~~~>|vb~vg~]][ce]_[df]_    [eg]_[eg]_agfe
15=/      [vbd]~~~[vac]_[vbd]_            [ce]_[ce]_fedc
17=/      (v[[<!b~~~>|G~e~]])[vac]_[vbd]_ [ce]_[ce]_fedc
19=/      (v[bG]~~~)(o=4){=1}             <!^c~~~>a_b_
24=/      ^c_b_a_G_                       a_e_f_d_
26=/      c~~~(q=32)(v<tb~~~~~>ab)(q=16)  va~~~               :|

#2(q=8)
0 =/      __                           {2 __
2 =/ |:   va[ce][ce][ce]                  va[ce][ce][ce]
4 =/      va[ce]va[ce]                  } va[ce][ce][ce]
6 =/      (ve[b^e][b^e][b^e]              e[b^e][b^e][b^e]
8 =/      e[b^e]vbb                    /1 e~__)               :|
10=/ /2   ve~            |: __            vccvee
13=/      g~__                            vccvee
15=/      g~__                            vvavavcc
17=/      e~__                            vvavavcc
19=/      e~{=2}                          vf[vaD][vaD][vaD]
24=/      (ve[a^e]d[fb]                   c[ea]d[fb]
26=/      [ea][ea][eG][eG]                [vaa]~)             :|
```

## License
MIT