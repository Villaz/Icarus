///<reference path='../../typings/tsd.d.ts' />


import {Ballot} from "../../ballot";
import {Message} from "../../message";

var zmq = require('zmq')
import {Network, Type} from "../network";



export class ZMQNetwork extends Network {

  private publisher:any;
  private subscriber:any;
  protected subscriptions:Map<string,any> = new Map();

  constructor(discover:any, ports:{publisher:number, router:number}){
    super(discover);
    this.publisher = zmq.socket('pub');
    this.publisher.identity = `${process.pid}`;
    this.publisher.bindSync(`tcp://*:${ports.publisher}`);
  }

  public send(message:Message, type:Type){
    if(type === Type.PUB)
      this.publisher.send(this.generateBufferMessage(message));
 }

  public createSubscription(name:string, url: string, port: number){
    this.subscriptions.set(name, zmq.socket('sub'));

    this.subscriptions.get(name).setsockopt(31, 0); //only IPv4
    this.subscriptions.get(name).setsockopt(42, 1); //support IPv6
    this.subscriptions.get(name).identity = name + process.pid;
    this.subscriptions.get(name).subscribe('P1A');
    this.subscriptions.get(name).subscribe('P1B');
    this.subscriptions.get(name).subscribe('P2A');
    this.subscriptions.get(name).subscribe('P2B');
    this.subscriptions.get(name).subscribe('REC-A');
    this.subscriptions.get(name).subscribe('RECACK-A');
    this.subscriptions.get(name).subscribe('DECISION');
    this.subscriptions.get(name).subscribe('PROPOSE');
    this.subscriptions.get(name).on('message', (type, message) =>{this.processSubscriptionMessage(type.toString(), message)});
    this.subscriptions.get(name).connect(`tcp://${url}:${port}`);
  }

  private processSubscriptionMessage(type:string, message:Buffer){
    let data = JSON.parse(message.toString())
    if (!this.messagesReceived.has(data.from))
        this.messagesReceived.set(data.from,new Set())
    for (var obj of this.messagesReceived.get(data.from))
        if (obj.crc === data.crc && obj.timestamp == data.timestamp)
            return
    this.messagesReceived.get(data.from).add({ crc: data.crc, timestamp: data.timestamp })
    this.processMessage(data, type);
  }

  private processMessage(data:any, type:string) {
     var message = {
          "type": type,
          "operation": data.operation,
          "from": data.from
     }

     if( message.operation.ballot !== undefined)
       message.operation.ballot = new Ballot({ number: message.operation.ballot.number, id: message.operation.ballot.id })
     this.emit(type, message);

 }

 protected _upNode(node:any) {
    let address:string;
    if(typeof node.addresses === "string") address = node.addresses
    else address = node.addresses[0]
    this.createSubscription(node.name, address, node.data.ports.split(",")[0]);
 }
}
