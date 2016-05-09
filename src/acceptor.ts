///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot")
var winston = require('winston')

var shuffle = require('shuffle-array')

import * as Message from "./message";
import {InternalMap as Map} from "./map";
import {Rol} from "./rol"



export class Acceptor extends Rol{

  actualBallot:Ballot;
  mapOfValues:Map<number, any>;

  messages_sended: number = 0
  last_slot:number;

  active:boolean = false;
  recived_rec:boolean = false;
  pending_messages:Array<any>;

  recuperation:any;

  constructor(params?: { name:string, test?: boolean, network?:{ discover: any, ports: any, network:any }}){
    super('acceptor', params);
    this.actualBallot = new ballot.Ballot()
    this.mapOfValues = new Map<number, any>();
    this.last_slot = -1;
    this.pending_messages = new Array<any>();

    if(!params.test){
      this.recuperation = new RecAcceptor(this, params.test);
      this.recuperation.start(params.network.ports.recuperation2);
    }
  }

  get Network():any{
    return this.network;
  }

  get Id():string{
    return this.id;
  }


  protected _startNetwork() {
      var self = this

      this.network.on('message', (message) => {
          message = message[0]
          if(!this.active || message.type === 'REC' || message.type === 'RECACK')
            this.recuperation.processMessages(message);
          else
            self.processMessages(message);
      });
  }

  public processMessages(message){
    switch (message.type) {
        case 'P1A':
            this.processP1A(message.operation.ballot, message.operation.from)
            break
        case 'P2A':
            this.processP2A(
              {slot:message.operation.slot,
               operation:message.operation.operation,
               ballot:message.operation.ballot
             });
            break;
    }
  }

  public clear(){
    this.actualBallot = new ballot.Ballot()
    this.mapOfValues.clear();
  }


  public processP1A(ballot:Ballot, to:any){
    if(ballot.isMayorThanOtherBallot(this.actualBallot))
    {
      if(!this.test) winston.info("P1A Updated ballot to %s", JSON.stringify(ballot))
      this.actualBallot = ballot
    }
    this.sendP1B(0, to)
  }


  public sendP1B( from:number , to:number ){
    var values = this.mapOfValues.getValues({ start: from, end: to });
    var operation = {
        ballot: this.actualBallot,
        accepted: values
    };
    var message = new Message.Message(
      {type:'P1B',
       from:this.id,
       command_id:0,
       operation:operation});
    this.network.sendToLeaders(message);
  }

  public processP2A(value:{slot:number; operation:any; ballot:Ballot}){
      if (value.slot > this.last_slot) this.last_slot = value.slot
      else{
        var operation = this.mapOfValues.getValues({start:value.slot})[0];
        if (operation !== undefined && operation.operation.client === value.operation.client && operation.operation.id === value.operation.id) return
      }

      if(!this.test) winston.info("Received P2A")
      if(value.ballot.isMayorOrEqualThanOtherBallot(this.actualBallot)){
          if(!this.test) winston.info("P2A Updated ballot to %s" ,JSON.stringify(value.ballot))
          this.actualBallot = value.ballot;
          this.mapOfValues.set(value.slot, value.operation, true);
          if(!this.test) winston.info("P2A Added operation to slot %s", value.slot)
      }
      this.sendP2B(value.slot, value.operation)

  }

  public sendP2B(slot:number , operation:any ){
      var message = new Message.Message({
          type: 'P2B',
          from: this.id,
          command_id: 0,
          operation: {
              ballot: this.actualBallot,
              slot: slot,
              operation: operation
          }
      });
      this.network.sendToLeaders(message);
  }
}


export class RecAcceptor{

  private acceptor:Acceptor;
  private pending_messages:Array<any>;
  private recived_rec:boolean = false;

  private sended_acceptors:Array<any>;
  private received_acceptors:Array<any>;

  private test:boolean = false;

  constructor(acceptor:Acceptor, test:boolean=false){
    this.acceptor = acceptor;
    this.pending_messages = [];
    this.test = test;
  }

  public start(port){
    setInterval(() => {
       this.recived_rec = false;
       this.sendRecuperationMessage(port, this.acceptor.last_slot + 1)
     },60000);
    setTimeout(() => {this.sendRecuperationMessage(port)}, 1000);
  }

  public processMessages(message){
    switch (message.type) {
        case 'REC':
            this.sendACKRecuperationMessage(message.from, message.operation);
            break;
        case 'RECACK':
            this.processRecuperation(message);
            break;
        default:
            this.pending_messages.push(message);
    }
  }

  public sendRecuperationMessage(recuperation:number,from:number=0,to?:number) {
      if(from < 0) from = 0;
      this.sended_acceptors = []
      let acceptorsMap = {}

      for (var acceptor of this.acceptor.Network.acceptors) {
          if(acceptor[0] !== this.acceptor.Id) this.sended_acceptors.push(acceptor[0])
      }
      var interval = Math.round((to - from) / this.sended_acceptors.length)
      var begin = from

      for (let acceptor of shuffle(this.sended_acceptors)) {
          acceptorsMap[acceptor] = { begin: begin, to: begin + interval + 1 > to ? to : begin + interval  }
          begin += interval + 1
      }
      var body = {
          port: recuperation,
          intervals: acceptorsMap
      }

      var message = new Message.Message({from:this.acceptor.Id, type: 'REC', command_id: this.acceptor.messages_sended++, operation: body })
      this.received_acceptors = [];

      this.acceptor.Network.sendToAcceptors(message);
      setTimeout(()=>{
         if(!this.recived_rec){
          for(let petition of this.pending_messages)
            this.acceptor.processMessages(petition);
          this.pending_messages.splice(0,this.pending_messages.length);
          this.acceptor.active = true;
         }
       }, 10000);
      return message;
  }


  public sendACKRecuperationMessage(from:string, operation:{port:number, intervals:any}) {
    let intervals = operation.intervals[this.acceptor.Id];
    let values = [];

    for(let value of this.acceptor.mapOfValues.keys){
      value = parseInt(value);
      if(value >= intervals.begin && (isNaN(intervals.to) || intervals.to >= value || intervals.to === null))
        values.push({slot:value, operation:this.acceptor.mapOfValues.get(value)});
    }

    let ipConnection = this.acceptor.Network.acceptors.get(from)

    var message = new Message.Message({
      from: this.acceptor.Id,
      to: `tcp://${[...ipConnection][0]}:${operation.port}`,
      type: 'RECACK',
      command_id: this.acceptor.messages_sended++,
      operation:{
        ballot: this.acceptor.actualBallot,
        values:values
      }
    })
    this.acceptor.Network.sendToAcceptors(message);
    return message;
  }

  public processRecuperation(message:any){
    this.recived_rec = true;

    this.received_acceptors.push(message.from);

    let opBallot = new ballot.Ballot(message.operation.ballot);
    if(opBallot.isMayorThanOtherBallot(this.acceptor.actualBallot))
    {
      if(!this.test) winston.info("REC Updated ballot to %s", JSON.stringify(opBallot))
      this.acceptor.actualBallot = opBallot
    }

    for(var value of message.operation.values){
      if(!this.test) winston.info("Saving slot %s from REC" ,value.slot);
      this.acceptor.mapOfValues.set(value.slot, value.operation, true);
      this.acceptor.last_slot = value.slot;
    }

    if(this.sended_acceptors.every((v,i)=> v === this.received_acceptors[i])){
      for(let petition of this.pending_messages)
        this.acceptor.processMessages(petition);
      this.pending_messages.splice(0,this.pending_messages.length)
      this.acceptor.active = true;
      this.recived_rec = false;
    }
  }
}
