///<reference path='../typings/tsd.d.ts' />
var zmq = require('zmq');
var Promise = require('bluebird');
var sha3 = require('sha3');
import * as Message from "buffer";
import * as Replica from "../replica";
import events = require('events');


export class LocalClient extends Replica.Replica{

  private operations:number;
  private executions:Map<any,any>;
  protected emmiter: events.EventEmitter;

  constructor(params?: { name:string, test?: boolean, external?:boolean, network?:any}){
    super(params);

    this.operations = 1;
    this.executions = new Map();
    this.emmiter = new events.EventEmitter();
  }

  public execute(operation){//:Promise<any>{
    operation.command_id = this.operations;
    operation.sha = new sha3.SHA3Hash().update(JSON.stringify(operation)).digest('hex');
    operation.client_id = this.id;

    var message = {client:this.id,
        id:this.operations,
        operation:operation
    }
    this.operations++;

    if(this.executions.has(message.id))
      return this.executions.get(message.id).promise;

    let promise = new Promise((resolve, reject)=>{
      if(this.executions.has(message.id))
      {
        this.executions.get(message.id)['resolve'] = resolve;
        this.executions.get(message.id)['reject'] = reject;
      }else{
        this.executions.set(message.id,{'resolve':resolve,'reject':reject});
      }
      this.processOperationFromClient(operation);
    });
    if(this.executions.has(message.id))
      this.executions.get(message.id)['promise'] = promise;
    else
      this.executions.set(message.id,{'promise':promise});
    return promise;
  }

  protected executeOperation(message):Promise<any>{
    return this.work(message.operation).then((value) =>{
      if(this.executions.has(message.operation.command_id)){
        this.emmiter.emit("result", value);
        return this.executions.get(message.operation.command_id)['resolve'](value);
      }else
      {
        let promise = Promise.resolve(value);
        this.executions.set(message.id,{'promise':promise});
        this.emmiter.emit("result", value);
        return promise;
      }
    });
  }

  public work(operation):Promise<any>{ return Promise.reject();}

}
