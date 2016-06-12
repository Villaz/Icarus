///<reference path='./typings/tsd.d.ts' />
var zmq = require('zmq');
var Promise = require('bluebird');
import * as Message from "./message";
import {LocalClient as Replica} from "./clients/localClient";
var moment = require('moment');

export class ClientIcarus extends Replica{
  private execution = 1;
  private times = {};
  private time_start;

  constructor(params?: { name:string, test?: boolean, external?:boolean, network?:{ discover: any, ports: any, network:any }}){
    super(params);
    setTimeout(()=>{this.time_start = moment().unix();this.ex()}, 20000);
    this.emmiter.on('result', (b)=>{
      console.log("Resultado es:" +b);
      this.execution++;
      //if(this.execution > 2) return;
      if(this.execution === 100  || this.execution === 200  || this.execution === 500 || this.execution === 1000 || this.execution === 2000 || this.execution === 5000 || this.execution === 20000)
        this.times[this.execution] = moment().unix() - this.time_start;
      if(this.execution === 20000){ console.log(this.times) ;return};

      this.ex();
    })
  }

  public work(operation):Promise<any>{
    console.log(JSON.stringify(operation));
    if(operation.type === 'SUM'){
      return Promise.resolve(operation.args.reduce((v1,v2)=>{ return v1+v2;}));
    }
  };

  public ex(){
    console.log("Ejecuta")
    this.execute({type:'SUM', args:[this.execution,this.execution+1]})
  }
}

/*
var a = new ClientIcarus();
a.execute({type:'SUM', args:[1,2]}).then((b)=>{
  console.log(b);
});
*/
