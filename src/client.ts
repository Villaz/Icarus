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
    this.startServerOperation();
    this.internalExecution();
    this.executions = new Map();
  }

  private startServerOperation(){
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
      this.operationSocket.send(this.generateBufferMessage(msg))
    });
  }

  private internalExecution(){
    this.executionSocket = zmq.socket('req');
    this.executionSocket.connect('tcp://127.0.0.1:9995');
    let self = this;
    this.executionSocket.on('message', function(){
      let args = Array.apply(null, arguments);
      let message = JSON.parse(Buffer.concat(args).toString())
      self.executions.get(message.id)[0](message);
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
      let a = this.generateBufferMessage(message);
      this.executions.set(message.id,[resolve, reject])
      this.executionSocket.send(this.generateBufferMessage(message));
    });
  }

  private generateBufferMessage(message){
    let CHUNK = 1024 * 1024;
    let bufferArray = new Array<Buffer>();
    var buffer = new Buffer(JSON.stringify(message));
    if (buffer.length > CHUNK){
      for (let pos=0; pos < buffer.length; pos += CHUNK){
        let aux = new Buffer(CHUNK);
        let copied = buffer.copy(aux, 0, pos, pos + CHUNK);
        if (copied < CHUNK){
          let cutted = new Buffer(copied);
          aux.copy(cutted, 0 , 0, copied);
          bufferArray.push(cutted)
        }else{
          bufferArray.push(aux)
        }
      }
    }else{
      bufferArray.push(buffer);
    }
    return bufferArray;
  }
}

var a = new Client('bli');

var i = 0;
var j = 1;

let call_ = () =>{
  var fs = require("fs");
  var content = fs.readFileSync('/Users/luis/data.json').toString('base64')
  j++
  a.execute({type:'SUM', args:content}).then((message)=>{
    console.log(message)
    if ( j <= 1000)
      call_()
  })
}

call_()
