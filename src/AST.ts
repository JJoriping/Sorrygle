export namespace AST{
  export type Tree = Node[];
  export type Node = {
    'l': number,
    'type': "global-configuration",
    'key': string,
    'value': string
  }|{
    'l': number,
    'type': "channel-declaration",
    'id': number,
    'continue'?: true
  }|{
    'l': number,
    'type': "udr-definition",
    'name': string,
    'value': Stackable[]
  }|{
    'l': number,
    'type': "repeat-open"
  }|{
    'l': number,
    'type': "repeat-close",
    'count'?: number
  }|{
    'l': number,
    'type': "volta",
    'value': number
  }|{
    'l': number,
    'type': "emoji-declaration",
    'key': string,
    'value': LocalConfiguration
  }|Stackable;
  export type Stackable = LocalConfiguration|Range|{
    'l': number,
    'type': "notation",
    'grace'?: Grace,
    'value': RestrictedNotation
  }|{
    'l': number,
    'type': "group-declaration",
    'key': number,
    'value': Stackable[]
  }|GroupReference|Parallelization|{
    'l': number,
    'type': "emoji-reference",
    'key': string
  }|Rest|null;
  export type Parallelization = {
    'l': number,
    'type': "parallelization",
    'values': Stackable[][]
  };
  export type GroupReference = {
    'l': number,
    'type': "group-reference",
    'key': number
  };
  export type LocalConfiguration = {
    'l': number,
    'type': "local-configuration",
    'key': string,
    'value': string
  };
  export type Rest = {
    'l': number,
    'type': "rest"
  };
  export type Range = {
    'l': number,
    'type': "range",
    'udr'?: true,
    'key': string,
    'value': Stackable[]
  };
  export type RestrictedNotation = KeySet|ChordSet|Diacritic|Tie;
  export type Tie = {
    'l': number,
    'type': "tie"
  };
  export type Decimals = { 'type': "decimals", 'value': number };
  export type Diacritic = {
    'l': number,
    'type': "diacritic",
    'name': "p",
    'value': Array<DiacriticComponent|Decimals>
  }|{
    'l': number,
    'type': "diacritic",
    'name': "+"|"-",
    'velocity': number,
    'value': DiacriticComponent[]
  }|{
    'l': number,
    'type': "diacritic",
    'name': "."|"~"|"!"|"t",
    'value': DiacriticComponent[]
  };
  export type DiacriticComponent =  GroupReference|LocalConfiguration|Range|RestrictedNotation|Rest|null;
  export type KeySet = {
    'l': number,
    'type': "key",
    'prefix'?: string[],
    'key': string,
    'suffix'?: string[]
  };
  export type Grace = {
    'l': number,
    'type': "appoggiatura",
    'value': Array<KeySet|ChordSet|Range|null>
  }
  export type ChordSet = {
    'l': number,
    'type': "chord",
    'arpeggio': boolean,
    'value': KeySet[],
    'suffix'?: string[]
  };
}