# Sorrygle
Text-based MIDI-writing language and its parser

🔗 [Online parser](https://sorry.daldal.so/sorrygle) available in Korean

## Abstract
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
I couldn't recognize such notations at a glance *(important!)*.
That's why I've defined a new language that can be converted into MIDI files.

Now I'm happy 😊.

## Getting Started
1. `npm install sorrygle`
2. 
```js
import { writeFileSync } from "fs";
import { Sorrygle } from "sorrygle";

writeFileSync(
  "./output.mid",
  Sorrygle.parse("cege[vcc]~~~")
);
```
3. Open `output.mid`
3. *Cool and good*.

## Grammar
*(Now writing...)*

## License
MIT