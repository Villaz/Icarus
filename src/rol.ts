///<reference path='./typings/tsd.d.ts' />

var winston = require('winston');

var capitalize = function(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export abstract class  Rol {

  private type:string;
  protected network:any;
  protected test:boolean;
  protected external:boolean;
  protected id:string;

  constructor(type:string, params?: { name:string, test?: boolean, external?:boolean, network?:any}){
    this.type = type;
    this.id = params.name;
    this.network = params.network;

    if (params !== undefined && params.test !== undefined) this.test = params.test
    else this.test = false

    if (params !== undefined && params.external !== undefined) this.external = params.external
    else this.external = false

    if (!this.test) {
        winston.add(winston.transports.File, { filename: `./logs/${type}-${this.id}.log` , level:'info'});
        if (params !== undefined && params.network !== undefined)
          winston.info(type +" %s started",this.id);
    }
  }

  get Network():any{
    return this.network;
  }

  get Id():string{
    return this.id;
  }

  get Test():boolean{
    return this.test;
  }
}

export function getRol(type:any, params:{ name:string, test?: boolean, network?:{ discover: any, ports: any, network:any }}):any{
  if(type === 'replica') type = 'clientIcarus';
  var obj = require('./'+type)[capitalize(type)];
  return new obj(params);
}
