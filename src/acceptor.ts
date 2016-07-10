///<reference path='./typings/tsd.d.ts' />

const winston = require("winston");

import * as Ballot from "./ballot";
import * as Message from "./message";
import {Rol} from "./rol";
import {Type as Type} from "./network/network";


export class Acceptor {

  actualBallot: Ballot;
  messages_sended: number = 0;
  last_slot: number;

  active: boolean = false;
  recived_rec: boolean = false;
  pending_messages: Array<any>;

  recuperation: any;

  private replica: Replica;

  constructor(replica: Replica) {
    this.replica = replica;
    this.actualBallot = new Ballot.Ballot();

    this.replica.Network.on("P1A", (message) => {
       this.processP1A(message.operation.ballot);
    });

    this.replica.Network.on("P2A", (message) => {
        this.processP2A({slot: message.operation.operation.slot,
                       operation: message.operation.operation,
                      ballot: message.operation.ballot
                    });
    });
  }

  public processP1A(ballot: Ballot) {
    if (ballot.isMayorThanOtherBallot(this.actualBallot)) {
      winston.info("%s P1A Updated ballot to %s", this.replica.Id, JSON.stringify(ballot));
      this.actualBallot = ballot;
    }
    this.sendP1B();
  }


  public sendP1B() {
    let operation = {
        ballot: this.actualBallot,
        accepted: Array.from(this.replica.Decisions.values())
    };
    let message = new Message.Message(
      {type: "P1B",
       from: this.replica.Id,
       command_id: 0,
       operation: operation});
    this.replica.Network.send(message, Type.PUB);
  }

  public processP2A(value: {slot: number; operation: any; ballot: Ballot}) {
      if (value.slot > this.last_slot) this.last_slot = value.slot;
      else {
        let operation = this.replica.Decisions.get(value.slot);
        if (operation !== undefined && operation.operation.client === value.operation.client && operation.operation.id === value.operation.id) return;
      }

      if (value.ballot.isMayorOrEqualThanOtherBallot(this.actualBallot)) {
          winston.info("P2A Updated ballot to %s" , JSON.stringify(value.ballot));
          this.actualBallot = value.ballot;
          // TODO checks if replica is running, if it's running dont save the value
          this.replica.Decisions.set(value.slot, value.operation);
          winston.info("P2A Added operation to slot %s", value.slot);
      }
      this.sendP2B(value.slot, value.operation);

  }

  public sendP2B(slot: number , operation: any ) {
      let message = new Message.Message({
          type: "P2B",
          from: this.replica.Id,
          command_id: 0,
          operation: {
              ballot: this.actualBallot,
              slot: slot,
              operation: operation
          }
      });
      this.replica.Network.send(message, Type.PUB);
  }
}

/*
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

  public start( ){
    setInterval(() => {
       this.recived_rec = false;
       this.sendRecuperationMessage(this.acceptor.last_slot + 1)
     },30000);
    setTimeout(() => {this.sendRecuperationMessage( )}, 1000);
  }

  public processMessages(message){
    switch (message.type) {
        case 'REC-A':
            this.sendACKRecuperationMessage(message.from, message.operation);
            break;
        case 'RECACK-A':
            this.processRecuperation(message);
            break;
        default:
            winston.info("Received message but %s is inactive", this.acceptor.Id);
            this.pending_messages.push(message);
    }
  }

  public sendRecuperationMessage(from:number=0) {
      if(from < 0) from = 0;
      this.sended_acceptors = []

      let body = {
          from: from
      }

      var message = new Message.Message({from:this.acceptor.Id, type: 'REC-A', command_id: this.acceptor.messages_sended++, operation: body })
      this.received_acceptors = [];
      this.acceptor.Network.send(message, Type.PUB);
      //if the acceptor does not receive messages in 10 seconds, it is the only one in the system
      //and becomes active
      setTimeout(()=>{
         if(!this.recived_rec){
           for(let petition of this.pending_messages)
             this.acceptor.processMessages(petition, false);
          this.pending_messages.splice(0,this.pending_messages.length);
          this.acceptor.active = true;
         }
       }, 10000);
      return message;
  }


  public sendACKRecuperationMessage(from:string, operation:{port:number, from:any}) {
    let values = [];

    for(let value of this.acceptor.mapOfValues.keys){

      value = parseInt(value);
      if(value >= operation.from)
        values.push({slot:value, operation:this.acceptor.mapOfValues.get(value)});
    }

    let ipConnection = this.acceptor.Network.acceptors.get(from)

    var message = new Message.Message({
      from: this.acceptor.Id,
      to: `tcp://${[...ipConnection][0]}:${operation.port}`,
      type: 'RECACK-A',
      command_id: this.acceptor.messages_sended++,
      operation:{
        ballot: this.acceptor.actualBallot,
        values:values
      }
    });
    this.acceptor.Network.send(message, Type.PUB);
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

    if(this.sended_acceptors.every((v,i)=> this.received_acceptors.indexOf(v) >= 0)){
      for(let petition of this.pending_messages)
        this.acceptor.processMessages(petition, false);
      this.pending_messages.splice(0,this.pending_messages.length)
      this.acceptor.active = true;
      this.recived_rec = false;
    }
  }
}*/
