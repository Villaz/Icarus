///<reference path='./typings/tsd.d.ts' />


var winston = require('winston');
var Network = require('./network').ReplicaNetwork;
var shuffle = require('shuffle-array');

import * as Ballot from "./ballot";
import * as Message from "./message";
import {InternalMap as Map} from "./map";


export class Replica{
  slot_num:number = 0;
  proposals:any = undefined;
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
    this.decisions = new Map();
    this.performed = new Map();

    this.operationsProposed = new Map();
    this.operationsDecided  = new Map();

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
    var decided  = this.operationsDecided.get(key)
    var proposed = this.operationsProposed.get(key)
    if ( decided === undefined ){
      let slot = this.nextEmpltySlot()
      if (proposed === undefined){
        this.proposals.set( slot, operation );
        this.operationsProposed.set( key, slot );
        this.lastEmpltySlotInProposals++;
        operation.slot = slot;
        this.network.sendToLeaders(operation);
      }
    }
  }

  private decision( slot, operation ){
    if(!this.test)
      winston.info("Decided for slot %s operation %s", slot, JSON.stringify(operation))

    if (this.lastEmpltySlotInDecisions > slot)
      return;
    this.decisions.set( slot, operation )
    var key = {id:operation.id,client:operation.client};
    this.operationsDecided.set( key , operation );
    this.lastEmpltySlotInDecisions++;

    let whileDecisionsInSlot = ( ) => {
      let value = this.decisions.get( this.slot_num );
      if ( value !== undefined ){
        this.reproposeOperation( operation );
        this.perform( operation );
        whileDecisionsInSlot();
      }
    }
    whileDecisionsInSlot();
  }

  private perform( operation ) {
    var slots = this.operationSlotInDecided(operation);
    this.slot_num++;
    if (!this.slotsHaveMenorThanSlotNum( slots , this.slot_num )){
      if(!this.test)
        winston.info("performed slot %s", this.slot_num - 1)
    }

  }

  private reproposeOperation( operation:any ){
    let proposals = this.proposals.get(this.slot_num);
    let operationsToRepropose = [];
    if (proposals === undefined) return;
    if (Array.isArray(proposals)){
      for (var proposal of proposals ){
        if (proposal.id !== operation.id || proposal.client !== operation.client){
          operationsToRepropose.push( proposal );
        }
      }
    }else{
      if (proposals.id !== operation.id || proposals.client !== operation.client){
        operationsToRepropose.push( proposals );
      }
    }
    for (var proposal of operationsToRepropose) this.propose( proposal );
    if (operationsToRepropose.length > 0) this.proposals.delete( this.slot_num );
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
