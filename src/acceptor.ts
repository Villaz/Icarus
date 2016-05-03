///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot")
var winston = require('winston')

var shuffle = require('shuffle-array')

import * as Message from "./message";
import {InternalMap as Map} from "./map";
import {Rol} from "./rol"



export class Acceptor extends Rol{

  private actualBallot:Ballot;
  private mapOfValues:Map<number, any>;

  private messages_sended: number = 0
  private last_slot:number;

  constructor(params?: { name:string, test?: boolean, network?:{ discover: any, ports: any, network:any }}){
    super('acceptor', params);
    this.actualBallot = new ballot.Ballot()
    this.mapOfValues = new Map<number, any>();
    this.last_slot = -1;
    if(!params.test)
      setTimeout(() => { this.sendRecuperationPetition(params.network.ports.recuperation2) },3000)
  }

  protected _startNetwork() {
      var self = this
      this.network.on('message', (message) => {
          message = message[0]
          switch (message.type) {
              case 'P1A':
                  self.processP1A(message.operation.ballot, message.operation.from)
                  break
              case 'P2A':
                  self.processP2A(
                    {slot:message.operation.slot,
                     operation:message.operation.operation,
                     ballot:message.operation.ballot
                   });
                  break;
              case 'REC':
                  self.sendRecuperation(message.from, message.operation)
                  break;
              case 'RECACK':
                  self.processRecuperation(message.operation)
          }
      })
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
        var operation = this.mapOfValues.getValues({start:value.slot})[0]
        if (operation !== undefined && operation.client === value.operation && operation.id === value.operation.client.id) return
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

  private getIntervalsFromMap(from:number, to?:number){

  }

  private sendRecuperationPetition(recuperation:number,from:number=0,to?:number) {
      let acceptors:Array<any> = []
      let acceptorsMap = {}
      for (var acceptor of this.network.acceptors) {
          if(acceptor[0] !== this.id) acceptors.push(acceptor[0])
      }
      var interval = Math.round((to - from) / acceptors.length)
      var begin = from

      for (let acceptor of shuffle(acceptors)) {
          acceptorsMap[acceptor] = { begin: begin, to: begin + interval + 1 > to ? to : begin + interval  }
          begin += interval + 1
      }
      var body = {
          port: recuperation,
          intervals: acceptorsMap
      }

      var message = new Message.Message({from:this.id, type: 'REC', command_id: this.messages_sended++, operation: body })
      this.network.sendToAcceptors(message)
      return message;
  }

  private sendRecuperation(from:string, operation:{port:number, intervals:any}) {
    let intervals = operation.intervals[this.id];
    let values = [];

    for(let value of this.mapOfValues.keys){
      value = parseInt(value);
      if(value >= intervals.begin && (isNaN(intervals.to) || intervals.to >= value || intervals.to === null))
        values.push({slot:value, operation:this.mapOfValues.get(value)});
    }

    let ipConnection = this.network.acceptors.get(from)

    var message = new Message.Message({
      from: this.id,
      to: `tcp://${[...ipConnection][0]}:${operation.port}`,
      type: 'RECACK',
      command_id: this.messages_sended++,
      operation:{
        ballot: this.actualBallot,
        values:values
      }
    })
    this.network.sendToAcceptors(message);
    return message;
  }


  private processRecuperation(operation:any){
    let opBallot = new ballot.Ballot(operation.ballot);
    if(opBallot.isMayorThanOtherBallot(this.actualBallot))
    {
      if(!this.test) winston.info("REC Updated ballot to %s", JSON.stringify(opBallot))
      this.actualBallot = opBallot
    }
    console.log(operation);
    for(var value of operation.values){
      winston.info(value.slot);
      this.mapOfValues.set(value.slot, value.operation, true);
    }
  }

}
