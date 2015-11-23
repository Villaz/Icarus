///<reference path='./typings/tsd.d.ts' />
var zmq = require('zmq');
var Promise = require('bluebird');
import * as Message from "./message";


class Client{

  private operationSocket;
  private id:string;
  private operations:number;
  private executionSocket;
  private executions:Map<number,any>;

  constructor(identifier){
    this.id = identifier;
    this.operationSocket = zmq.socket('rep');

    this.operations = 1;
    this.startOperation();
    this.startExecution();
    this.executions = new Map();
  }

  private startOperation(){
    this.operationSocket.identity = `${this.id}${process.pid}`;
    this.operationSocket.bindSync('tcp://*:9000');
    this.operationSocket.on('message', (message) =>{
      message = JSON.parse(message.toString());
      let msg = new Message.Message({
          from: '',
          type: 'DONE',
          command_id: 0,
          operation: {slot: message.operation.slot, result:'OK'}
        });
      this.operationSocket.send(JSON.stringify(msg))
    });
  }

  private startExecution(){
    this.executionSocket = zmq.socket('req');
    this.executionSocket.connect('tcp://127.0.0.1:9995');
    this.executionSocket.on('message', (message) =>{
      message = JSON.parse(message);
      console.log(message);
      this.executions.get(message.id)[0]();
    });
  }

  public execute(operation){
    var message = {client:this.id,
        id:this.operations++,
        operation:operation
    }
    var resolve = undefined;
    var reject = undefined;
    var self = this;
    return new Promise((resolve, reject)=>{
      this.executions.set(message.id,[resolve, reject])
      this.executionSocket.send(JSON.stringify(message));

    });

  }
}

var a = new Client('bli');

var i = 0;
var j = 1;

let call_ = () =>{
  a.execute({type:'SUM', args:[i++,j++]}).then((message)=>{
    call_()
  })
}

call_()
