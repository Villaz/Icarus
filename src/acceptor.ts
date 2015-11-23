///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot")
var winston = require('winston')

var shuffle = require('shuffle-array')

import * as Message from "./message";
import {InternalMap as Map} from "./map";


var nconf = require('nconf');
nconf.argv()
   .env()
   .file({ file: './conf/icarus.conf' });

var Network = require('./network/'+nconf.get('network')+'/network').AcceptorNetwork

export class Acceptor{

  private id:string;
  private actualBallot:Ballot;
  private mapOfValues:Map<number, any>;
  private network:any;

  private messages_sended: number = 0
  private test:boolean


  constructor(params?: { name:string, test?: boolean, network?:{ discover: any, ports: any }}){
    this.actualBallot = new ballot.Ballot()
    this.mapOfValues = new Map<number, any>();

    this.id = params.name
    if(params !== undefined && params.test !== undefined) this.test = params.test
    else this.test = false

    if (!this.test) {
        try {
            winston.add(winston.transports.File, { filename: 'acceptor' + this.id + '.log' })
            winston.add(require('winston-graylog2'), {
              name: 'Graylog',
              level: 'debug',
              silent: false,
              handleExceptions: false,
              graylog: {
                servers: [{host: '127.0.0.1', port: 12201}],
                hostname: this.id,
                facility:"acceptor",
                bufferSize: 1400
              }
            });
        } catch (e){ }
      if(params !== undefined && params.network !== undefined)
        winston.info("Acceptor %s started in port %s ",this.id, params.network.ports.port)
    }
    if (params !== undefined && !this.test && params.network !== undefined) this.startNetwork(params.network)
    setTimeout(() => { this.sendRecuperation() },3000)
  }

  private startNetwork(params: { discover:Discover, ports:any }) {
      this.network = new Network(params.discover, params.ports)
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
                  self.recuperation()
                  break
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

      var operation = this.mapOfValues.getValues({start:value.slot})[0]

      if(operation !== undefined && operation.client === value.operation && operation.id === value.operation.client.id) return

      if(!this.test) winston.info("Received P2A: %s", JSON.stringify(value))

      if(value.ballot.isMayorOrEqualThanOtherBallot(this.actualBallot)){
          if(!this.test) winston.info("P2A Updated ballot to %s" ,JSON.stringify(value.ballot))
          this.actualBallot = value.ballot;
          this.mapOfValues.set(value.slot, value.operation, true);
          if(!this.test) winston.info("P2A Added operation  %s  to slot %s", JSON.stringify(value.operation), value.slot)
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

  private sendRecuperation(from:number=0,to?:number) {
      let acceptors = []
      let acceptorsMap = {}
      for (var acceptor in this.network.acceptors) {
          if(acceptor !== this.id) acceptors.push(acceptor)
      }
      var interval = (to - from) / acceptors.length
      var begin = from

      for (var acceptor of shuffle(acceptors)) {
          acceptorsMap[acceptor] = { begin: begin, to: begin + interval }
          begin += interval
      }
      var body = {
          port: 7777,
          intervals: acceptorsMap
      }

      var message = new Message.Message({from:this.id, type: 'REC', command_id: this.messages_sended++, operation: body })
      this.network.sendToAcceptors(message)
      return message;
  }

  private recuperation() {
  }

}
