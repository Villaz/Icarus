///<reference path='../../typings/tsd.d.ts' />


import {Ballot} from "../../ballot";
import * as Message from "../../message";

var map = require("../../map").Map
var winston = require('winston')
var zmq = require('zmq')
var Discover = require('../../discover')
import {Network} from "../network";
import * as Emitter from "../../icarus_utils";

export class ZMQNetwork extends Network {

  constructor(discover:any){
    super(discover);
  }

  protected startPublisher(port: number, name:string) {
      var publisher = zmq.socket('pub');
      publisher.identity = `${name}${process.pid}`;
      publisher.bindSync('tcp://*:' + port);
      this.publishers[name] = publisher;
  }

  protected subscription(params: { url: string, port: number, name: string, subscriptions: Array<string>}) {
      if (this.subscriptions[params.name] === undefined) {
          this.subscriptions[params.name] = this.createSubscription(params.name, params.subscriptions, params.url, params.port)
      }
      this.subscriptions[params.name].connect(`tcp://${params.url}:${params.port}`);
  }

  protected createSubscription(name: string, subscriptions: Array<string>, url: string, port: number) {
      let subscriber = zmq.socket('sub')
      subscriber.setsockopt(31, 0) //only IPv4
      subscriber.setsockopt(42, 1) //support IPv6
      subscriber.identity = name + process.pid
      for (var sub of subscriptions) {
          subscriber.subscribe(sub)
      }

      var self = this;
      subscriber.on('message', function(){
          var args = Array.apply(null, arguments);
          var messageType = args.shift().toString();
          var buffer = Buffer.concat(args);

          let data = JSON.parse(buffer.toString())
          if (!self.messagesReceived[data.from])
              self.messagesReceived[data.from] = []
          for (var obj of self.messagesReceived[data.from])
              if (obj.crc === data.crc && obj.timestamp == data.timestamp)
                  return
          self.messagesReceived[data.from].push({ crc: data.crc, timestamp: data.timestamp })
          self.processMessage(data, messageType);
      });
      return subscriber;
  }

  public send(name: string, message:Message.Message) {
      let buffer = this.generateBufferMessage(message);
      this.publishers[name].send(buffer);
  }

  private generateBufferMessage(message:Message.Message){
    let CHUNK = 1024 * 1024;
    let bufferArray = new Array<Buffer>();
    bufferArray.push(new Buffer(message.type));
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

export class AcceptorNetwork extends ZMQNetwork {

    subscriber: any
    private acceptorSubscriber: any
    private clientRecuperation: any;
    receivedMessages: Array<any>
    private counter:number=0

    constructor(discover: any, connection: { port: number, recuperation:number, recuperation2:number }) {
        super(discover)
        this.startPublisher(connection.port, 'ATLP')
        this.startPublisher(connection.recuperation, 'ATA')
        this.startRecuperationRouter(connection.recuperation2);
        this.subscriber = undefined
        this.receivedMessages = []
    }

    private startRecuperationRouter(port:number) {
        this.clientRecuperation = zmq.socket('router');
        this.clientRecuperation.identity = `recuperationA${process.pid}`;
        this.clientRecuperation.bindSync(`tcp://*:${port}`);

        let self = this;
        this.clientRecuperation.on('message', (blank, message) => {
            self.emit('message', JSON.parse(message.toString()));
        });
    }

    public sendToLeaders(message: any) {
        this.send('ATLP', message);
    }

    public sendToAcceptors(message: any) {
      if( message.type == 'RECACK'){
          let dealer = zmq.socket('dealer');
          dealer.connect(message.to);
          dealer.send(JSON.stringify(message));
      }else{
        this.send('ATA', message);
      }
    }

    protected processMessage(data:any, type:string) {
       var message = {
            "type": type,
            "operation": data.operation,
            "from": data.from
       }
       if(type !== 'REC')
            message.operation.ballot = new Ballot({ number: message.operation.ballot.number, id: message.operation.ballot.id })
       this.emit('message', message)
   }

    protected _upNode(type: string, url:string, port:any) {
        switch (type) {
            case 'L':
                this.subscription({ name: "subscriberLeader", subscriptions: ['P1A', 'P2A'], url: url, port: port.split(',')[0]});
                break;
            case 'A':
                this.subscription({ name: "subscriberAceptor", subscriptions: ['REC'], url: url, port: port.split(',')[1] });
                break;
        }
    }
}

export class ReplicaNetwork extends ZMQNetwork {

    private clientRouter:any;
    private operationSocket:any;
    private operationPort: number;
    private clients = {};
    private connected: boolean;

    constructor(discover: any, connection: { port: number, client:number, operation:number }) {
        super(discover)
        this.startPublisher(connection.port, 'RTLP');
        this.startRouter(connection.client);
        this.operationPort = connection.operation;
        this.operationSocket = zmq.socket('req');
        this.connected = false;
    }

    private startRouter(port:number) {
        this.clientRouter = zmq.socket('router');
        this.clientRouter.identity = `acceptorrouter`;
        this.clientRouter.bind(`tcp://*:${port}`);
        let self = this;
        this.clientRouter.on('message', function() {
            var args = Array.apply(null, arguments);
            var envelope = args.shift();
            var blank = args.shift();
            var fs = require("fs")
            var message = JSON.parse(Buffer.concat(args).toString());
            self.clients[`${message.client}-${message.operation_id}`] = envelope
            self.emit('propose', message);
        });
    }

    public responde(message) {
        let envelope = this.clients[`${message.client}-${message.operation_id}`];
        this.clientRouter.send([envelope, "", JSON.stringify(message)]);
        return Promise.resolve();
    }

    protected processMessage(data: any, type: string) {
        var message = {
            type: type,
            from: data.from,
            operation: data.operation
        }
        this.emit('message', message)
    }

    public sendToOperation( message:Message.Message ){
        if (!this.connected)
          this.operationSocket.connect(`tcp://127.0.0.1:${this.operationPort}`)
        return new Promise((resolve, reject)=>{
          this.operationSocket.on('message',( message )=>{
            resolve();
          });
          this.operationSocket.send(JSON.stringify(message));
        });
    }

    public sendToLeaders(operation:any, from:string) {
        var message = new Message.Message({from:from,
                                           type:'PROPOSE',
                                           command_id:0,
                                           operation:operation});
        this.send("RTLP", message);
    }


    protected _upNode(type: string, url:string, port:any) {
        switch (type) {
            case 'L':
                this.subscription({ name: "subscriberLeader", subscriptions: ['DECISION'], url: url, port: port.split(',')[1]});
                break;
        }
    }
}


export class LeaderNetwork extends ZMQNetwork {

    constructor(discover: any, connection: { port: number , replica:number }) {
        super(discover)
        this.startPublisher(connection.port, "LTAP");
        this.startPublisher(connection.replica, "LTRP");
    }

    public sendToAcceptors(message:Message.Message) {
        this.send("LTAP", message);
    }

    public sendToReplicas(message: Message.Message) {
        this.send("LTRP", message);
    }

    protected processMessage(data: any, type: string) {
        var message = {
            type: type,
            from: data.from,
            operation: data.operation
        }
        if (type !== 'PROPOSE'){
            message.operation.ballot = new Ballot({ number: message.operation.ballot.number, id: message.operation.ballot.id })
            this.emit(type, message);
        }else{
          this.emit('propose', message);
        }
    }

    protected _upNode(type: string, url:string, port:any) {
        switch (type) {
            case 'A':
                this.subscription({ name: "acceptorSubscriber", subscriptions: ['P1B', 'P2B'], url: url, port:  port.split(',')[0]});
                this.emit('acceptor', url);
                break;
            case 'R':
                this.subscription({ name: "replicaSubscriber", subscriptions: ['PROPOSE'], url: url, port: port.split(',')[0]});
                break;
        }
    }
}
