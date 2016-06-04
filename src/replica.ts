///<reference path='./typings/tsd.d.ts' />


var winston = require('winston');
var shuffle = require('shuffle-array');

import * as Ballot from "./ballot";
import * as Message from "./message";
import * as Rol from "./rol";
import {InternalMap as Map2} from "./map";



export class Replica extends Rol.Rol{
  slot_num:number = 0;
  proposals:Map<number,Set<any>>;
  decisions:any = undefined;

  operationsProposed:any = undefined;
  operationsDecided:any = undefined

  lastEmpltySlotInProposals:any = undefined
  lastEmpltySlotInDecisions:any = undefined

  promisesPerSlot:any = undefined

  constructor(params?: { name:string, test?: boolean, external?:boolean, network?:{ discover: any, ports: any, network:any }}){
    super('replica', params);

    this.slot_num = 0;
    this.proposals = new Map();
    this.decisions = new Map2();

    this.operationsProposed = new Map2();
    this.operationsDecided  = new Map2();

    this.promisesPerSlot  = {};

    this.lastEmpltySlotInDecisions = 0;
    this.lastEmpltySlotInProposals = 0;

  }


  protected _startNetwork( ) {
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

  protected propose(operation:any){
    var key = {id:operation.command_id, client:operation.client_id}
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
      winston.info("Decided operation for slot %s", slot)

    if (this.lastEmpltySlotInDecisions > slot) return Promise.resolve();
    this.decisions.set( slot, operation )
    var key = {id:operation.command_id,client:operation.client_id};
    this.operationsDecided.set( key , slot );
    this.lastEmpltySlotInDecisions++;

    let whileDecisionsInSlot = ( ) => {
      if (!this.decisions.has(this.slot_num))
        return Promise.resolve();
      let operationInSlot = this.decisions.get(this.slot_num);
      this.checkOperationsToRepropose( operationInSlot );
      return this.perform( operationInSlot ).then(()=>{
        this.decisions.delete(this.slot_num - 1);
        if (!this.test)
          winston.info("performed slot %s", this.slot_num - 1)
        return whileDecisionsInSlot();
      });


    }
    return whileDecisionsInSlot();
  }

  private perform( operation ) {
    var slot = this.operationSlotInDecided(operation);
    this.slot_num++;
    if ( slot < this.slot_num ){
      var message = new Message.Message(
        {
          from: '',
          type: 'OPERATION',
          command_id: operation.command_id,
          operation: operation
        });

      if(!this.external){
        return this.executeOperation(message);
      }else{
        return this.network.sendToOperation(message).then((message) =>{
            let msg = {client: operation.client,
               id: operation.command_id,
               result:'OK'}
            return this.network.responde(msg);
        });
      }
    }else
      return Promise.resolve();
  }

  private checkOperationsToRepropose(operation:any){
      if (!this.proposals.has(this.slot_num)) return;
      var values = this.proposals.get(this.slot_num).values();
      var value = values.next();
      while (!value.done){
        let op = value.value;
        if ( op.client_id !== operation.client_id || op.command_id !== operation.command_id){
            this.operationsProposed.delete({id:op.command_id, client:op.client_id})
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
    var search = {id:operation.command_id,client:operation.client_id};
    return this.operationsProposed.get(search);
  }


  private operationSlotInDecided( operation:any ){
    var search = {id:operation.command_id,client:operation.client_id};
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

  protected executeOperation(message:any){
    return Promise.reject("Not implemented");
  }

}
