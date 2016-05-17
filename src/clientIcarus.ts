///<reference path='./typings/tsd.d.ts' />
var zmq = require('zmq');
var Promise = require('bluebird');
import * as Message from "./message";
import {LocalClient as Replica} from "./clients/localClient";


export class ClientIcarus extends Replica{
  constructor(params?: { name:string, test?: boolean, external?:boolean, network?:{ discover: any, ports: any, network:any }}){
    super(params);
    setTimeout(()=>{this.ex()}, 1000);
  }

  public work(operation):Promise<any>{
    if(operation.type === 'SUM'){
      return Promise.resolve(operation.args.reduce((v1,v2)=>{ return v1+v2;}));
    }
  };

  public ex(){
    console.log("Ejecuta")
    this.execute({type:'SUM', args:[1,2]}).then((b)=>{
      console.log("Resultado es:" +b);
      this.ex();
    });

  }
}

/*
var a = new ClientIcarus();
a.execute({type:'SUM', args:[1,2]}).then((b)=>{
  console.log(b);
});
*/
