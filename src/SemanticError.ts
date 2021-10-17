export default class SemanticError extends Error{
  public readonly index:number;
  
  constructor(l:number, message:string){
    super(message);
    this.index = l;
  }
}