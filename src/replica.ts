///<reference path='./typings/tsd.d.ts' />


var winston = require('winston');
var shuffle = require('shuffle-array');

import * as Ballot from "./ballot";
import * as Message from "./message";
import {InternalMap as Map2} from "./map";

var nconf = require('nconf');
nconf.argv()
   .env()
   .file({ file: './conf/icarus.conf' });
var Network = require('./network/'+nconf.get('network')+'/network').ReplicaNetwork

export class Replica{
  slot_num:number = 0;
  proposals:Map<number,Set<any>>;
  decisions:any = undefined;
  performed:any = undefined;

  operationsProposed:any = undefined;
  operationsDecided:any = undefined

  lastEmpltySlotInProposals:any = undefined
  lastEmpltySlotInDecisions:any = undefined

  promisesPerSlot:any = undefined

  network:any;

  id:string;
  test:boolean;

  constructor(params?: { name:string, test?: boolean, network?:{ discover: any, ports: any }}){
    this.id = params.name
    this.slot_num = 0;
    this.proposals = new Map();
    this.decisions = new Map2();
    this.performed = new Map2();

    this.operationsProposed = new Map2();
    this.operationsDecided  = new Map2();

    this.promisesPerSlot  = {};

    this.lastEmpltySlotInDecisions = 0;
    this.lastEmpltySlotInProposals = 0;

    if(params !== undefined && params.test !== undefined) this.test = params.test
    else this.test = false

    if (!this.test) {
        try {
            winston.add(winston.transports.File, { filename: 'replica' + this.id + '.log' });
        } catch (e){ }
      if(params !== undefined && params.network !== undefined)
        winston.info("Replica %s started in port %s ",this.id, params.network.ports.port);
    }
    if (params !== undefined && !this.test && params.network !== undefined) this.startNetwork(params.network);
  }


  private startNetwork(params: { discover: Discover, ports:any }) {
      this.network = new Network(params.discover, params.ports)
      var self = this
      this.network.on('message', (message) => {
          message = message[0]
          switch (message.type) {
              case 'DECISION':
                  self.decision( message.operation.slot , message.operation.operation )
                  break
          }
      });
      this.network.on('propose', (message) =>{
        this.propose(message[0]);
      });
  }

  private propose(operation:any){
    var key = {id:operation.id, client:operation.client}
    if ( !this.operationsDecided.has(key) && !this.operationsProposed.has(key)){
      let slot = this.nextEmpltySlot()
      operation.slot = slot;

      if (!this.proposals.has(slot))
          this.proposals.set(slot, new Set());
      this.proposals.get(slot).add(operation);
      this.operationsProposed.set( key, slot );
      this.lastEmpltySlotInProposals++;
      this.network.sendToLeaders(operation);
    }
  }

  private decision( slot, operation ){
    if(!this.test)
      winston.info("Decided for slot %s operation %s", slot, JSON.stringify(operation))

    if (this.lastEmpltySlotInDecisions > slot) return Promise.resolve();

    this.decisions.set( slot, operation )
    var key = {id:operation.id,client:operation.client};
    this.operationsDecided.set( key , operation );
    this.lastEmpltySlotInDecisions++;

    let whileDecisionsInSlot = ( ) => {
      if (!this.decisions.has(this.slot_num))
        return Promise.resolve();
      this.checkOperationsToRepropose( operation );
      return this.perform( operation ).then(()=>{
        if (!this.test)
          winston.info("performed slot %s", this.slot_num - 1)
        return whileDecisionsInSlot();
      });


    }
    return whileDecisionsInSlot();
  }

  private perform( operation ) {
    var slots = this.operationSlotInDecided(operation);
    this.slot_num++;
    if (!this.slotsHaveMenorThanSlotNum( slots , this.slot_num )){
      var message = new Message.Message(
        {
          from: '',
          type: 'OPERATION',
          command_id: 0,
          operation: operation
        });
        return this.network.sendToOperation(message).then((message) =>{
            let msg = {client: operation.client,
               id: operation.id,
               result:'OK'}
            return this.network.responde(msg);
        });
    }
  }

  private checkOperationsToRepropose(operation:any){
      if (!this.proposals.has(this.slot_num)) return;
      var values = this.proposals.get(this.slot_num).values();
      var value = values.next();
      while (!value.done){
        let op = value.value;
        if ( op.client_id !== operation.client_id || op.id !== operation.id){
            this.proposals.get(this.slot_num).delete(op);
            if (this.proposals.get(this.slot_num).size == 0)
              this.proposals.delete(this.slot_num);
            this.propose(op);
        }
        value = values.next();
      }
  }

  private nextEmpltySlot(){
    if (this.lastEmpltySlotInDecisions == this.lastEmpltySlotInProposals)
      return this.lastEmpltySlotInDecisions;
    if (this.lastEmpltySlotInDecisions < this.lastEmpltySlotInProposals)
      return this.lastEmpltySlotInDecisions;
    else
      return this.lastEmpltySlotInProposals;
  }


  private isOperationInProposed( operation ) {
    var search = {id:operation.id,client:operation.client};
    return this.operationsProposed.get(search);
  }


  private operationSlotInDecided( operation:any ){
    var search = {id:operation.id,client:operation.client};
    return this.operationsDecided.get(search);
  }


  private slotsHaveMenorThanSlotNum( slots , slot_num ){
    if (slots === undefined)
      return false;

    for(let slot of slots){
      if (slot < slot_num) return true;
    }
    return false;
  }

}
