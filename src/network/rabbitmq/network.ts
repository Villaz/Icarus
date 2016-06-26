///<reference path='../../typings/tsd.d.ts' />

/*
import {Ballot} from "../../ballot";
import * as Message from "../../message";
import {Network} from "../network";

var map = require("../../map").Map
var winston = require('winston')
var zmq = require('zmq')
var amqp = require('amqplib/callback_api');
var Promise = require("bluebird")
var Discover = require('../../discover')
var Gmetric = require('gmetric');
import * as Emitter from "../../icarus_utils";

var winston = require('winston');
var Elasticsearch = require('winston-elasticsearch');

var esTransportOpts = {
  level: 'warning',
};
winston.add(winston.transports.Elasticsearch, esTransportOpts);


export class RabbitMQNetwork extends Network {

  private channel:any;
  private ready:any;

  constructor(discover:any, connection: { port: number , host:string }) {
      super(discover);
      this.startPublisher(connection.port, connection.host);
  }

  protected startPublisher(port: number, name:string) {
    this.ready = new Promise((resolve, reject) => {
      amqp.connect('amqp://'+ name, (err, conn) => {
        if (err){
          console.error(err);
          process.exit(-1);
        }
        conn.createChannel((err, ch) => {
          ch.assertExchange('messages', 'direct', {durable: false});
          this.channel = ch;
          resolve(ch);
        });
      });
    });
  }

  protected subscription(params: { url: string, port: number, name: string, subscriptions: Array<string>}){
    let self = this;
    this.ready.then(()=>{
      this.channel.assertQueue('', {exclusive: true}, (err, q) =>{
        for (let subscription of params.subscriptions){
          this.channel.bindQueue(q.queue, "messages", subscription);
        }
        this.channel.consume(q.queue, (msg) => {
          let content = JSON.parse(msg.content);
          let type = msg.fields.routingKey;
          if (!self.messagesReceived[content.from])
              self.messagesReceived[content.from] = []
          for (var obj of self.messagesReceived[content.from])
            if (obj.crc === content.crc && obj.timestamp == content.timestamp)
                return
          self.messagesReceived[content.from].push({ crc: content.crc, timestamp: content.timestamp })
          self.processMessage(content, type);
         }, {noAck: true});
       });
     });
  }

  public send(name: string, message:Message.Message) {
    var msg = JSON.stringify(message);
    this.channel.publish("messages", message.type, new Buffer(msg));
    winston.debug(message.type);
  }
}


export class AcceptorNetwork extends RabbitMQNetwork {

    private acceptorSubscriber: any
    receivedMessages: Array<any>
    private counter:number=0

    constructor(discover: any, connection: { port: number , host:string}) {
        super(discover, connection)
        this.receivedMessages = []
        this.subscription({ name: '', subscriptions: ['P1A', 'P2A','REC'], url: '', port: 0})
    }

    public sendToLeaders(message: any) {
        this.send('ATLP', message);
    }

    public sendToAcceptors(message: any) {
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
}

export class ReplicaNetwork extends RabbitMQNetwork {

    private clientRouter:any;
    private operationSocket:any;
    private operationPort: number;
    private clients = {};
    private connected: boolean;

    constructor(discover: any, connection: { port: number, client:number, operation:number , host:string }) {
        super(discover, connection)
        this.subscription({ name: '', subscriptions: ['DECISION'], url: '', port: 0})
        this.startRouter(connection.client);
        this.operationPort = connection.operation;
        this.operationSocket = zmq.socket('req');
        this.connected = false;
    }

    private startRouter(port:number) {
        this.clientRouter = zmq.socket('router');
        this.clientRouter.bind(`tcp://*:${port}`);
        this.clientRouter.on('message', (envelope, b, message) => {
            message = JSON.parse(message);
            this.clients[`${message.client}-${message.operation_id}`] = envelope
            this.emit('propose', message);
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

    public sendToLeaders(operation:any) {
        var message = new Message.Message({from:'1',
                                           type:'PROPOSE',
                                           command_id:0,
                                           operation:operation});
        this.send("RTLP", message);
    }
}


export class LeaderNetwork extends RabbitMQNetwork {

    constructor(discover: any, connection: { port: number , replica:number , host:string }) {
        super(discover, connection)
        this.subscription({ name: '', subscriptions: ['P1B', 'P2B','PROPOSE'], url: '', port: 0})

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
}
*/
