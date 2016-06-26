///<reference path='./typings/tsd.d.ts' />


var winston = require('winston');
var shuffle = require('shuffle-array');
var moment = require('moment');

import * as Ballot from "./ballot";
import * as Message from "./message";
import * as Rol from "./rol";
import {Leader as Leader} from "./leader";

export class Replica extends Rol.Rol{

  slot_num:number = 0;

  operationsToProposeBySlot:Map<number,Set<any>> = new Map();

  operationsProposedBySlot:Map<number,Set<any>> = new Map();
  operationsProposedByOperation:Map<string,any> = new Map();

  operationsDecidedBySlot:Map<number,Set<any>> = new Map();
  operationsDecidedByOperation:Map<string, number> = new Map();

  lastEmpltySlotInProposals:number = 0;
  lastEmpltySlotInDecisions:number = 0;
  greaterSlotDecided:number = -1;
  lastDecidedMessage:any = undefined;

  private leader:any;

  constructor(params?: {name:string, test?:boolean, external?:boolean, network?:any}){
    super('replica', params);
    if(!this.test){
      this.leader = new Leader({name:params.name, test:params.test, replica:this, network:params.network });
      setTimeout(()=>{this.leader.start()}, 5000);
      setInterval(()=>{this.checkSendGAP()},10000);
    }
  }


  protected _startNetwork( ) {
      var self = this
      this.network.on('message', (message) => {
          message = message[0]
          switch (message.type) {
              case 'DECISION':
                  //self.decision( message.operation.slot , message.operation.operation )
                  break
          }
      });
      this.network.on('propose', (message) =>{
        this.propose(message[0]);
      });
  }

  protected propose(operation:any){
    var key = JSON.stringify({id:operation.command_id, client:operation.client_id});
    if ( !this.operationsDecidedByOperation.has(key) && !this.operationsProposedByOperation.has(key)){
      let slot = this.nextEmpltySlot()
      operation.slot = slot;

      if (!this.operationsToProposeBySlot.has(slot))
          this.operationsToProposeBySlot.set(slot, new Set());
      this.operationsToProposeBySlot.get(slot).add(operation);
      this.operationsProposedByOperation.set( key, slot );
      this.lastEmpltySlotInProposals++;
      //this.network.sendToLeaders(operation, this.id);
    }
  }

  private decision( slot, operation ){
    if(!this.test)
      winston.info("Decided operation for slot %s", slot);

    let key = JSON.stringify({id:operation.command_id,client:operation.client_id});
    //The operation was decided before
    if (this.lastEmpltySlotInDecisions > slot) return Promise.resolve();

    //Adds the operation to decisions
    this.operationsDecidedBySlot.set( slot, operation )
    this.operationsDecidedByOperation.set( key , slot );

    if(this.greaterSlotDecided < slot) this.greaterSlotDecided = slot;

    //Updates the value to the last emplty slot
    if(this.lastEmpltySlotInDecisions === slot)
      do{
        this.lastEmpltySlotInDecisions++;
      }while(this.operationsDecidedBySlot.has(this.lastEmpltySlotInDecisions))


    let whileDecisionsInSlot = ( ) => {
      if (!this.operationsDecidedBySlot.has(this.slot_num))
        return Promise.resolve();
      let operationInSlot = this.operationsDecidedBySlot.get(this.slot_num);
      this.checkOperationsToRepropose( operationInSlot );
      return this.perform( operationInSlot ).then(()=>{
        this.operationsDecidedBySlot.delete(this.slot_num - 1);
        if (!this.test)
          winston.info("performed slot %s", this.slot_num - 1);
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

  private checkSendGAP( ):Array<number>{
    let actual = moment().unix()
    let slots:Array<number> = new Array();
    if( this.lastDecidedMessage === undefined || actual - this.lastDecidedMessage > 10 ){
      if(this.lastEmpltySlotInDecisions === this.slot_num && this.operationsDecidedBySlot.size == 0)
        slots.push(this.slot_num);
      else{
        for(var i = this.lastEmpltySlotInDecisions; i <= this.greaterSlotDecided; i++){
          if(!this.operationsDecidedBySlot.has(i))
            slots.push(i);
        }
      }
    }
    //this.network.sendToLeaders({slots:slots, port:this.network.routerPort}, this.id, 'GAP');
    return slots;
  }

  private nextEmpltySlot(){
    if (this.lastEmpltySlotInDecisions == this.lastEmpltySlotInProposals)
      return this.lastEmpltySlotInDecisions;
    if (this.lastEmpltySlotInDecisions < this.lastEmpltySlotInProposals)
      return this.lastEmpltySlotInDecisions;
    else
      return this.lastEmpltySlotInProposals;
  }

  private checkOperationsToRepropose(operation:any){
      if (!this.operationsToProposeBySlot.has(this.slot_num)) return;
      var values = this.operationsToProposeBySlot.get(this.slot_num).values();
      var value = values.next();
      while (!value.done){
        let op = value.value;
        let key = JSON.stringify({id:op.command_id, client:op.client_id});
        if (op.sha === operation.sha)
          this.operationsToProposeBySlot.get(this.slot_num).delete(op);
        else{
            this.operationsProposedByOperation.delete(key);
            this.operationsToProposeBySlot.get(this.slot_num).delete(op);
            if (this.operationsToProposeBySlot.get(this.slot_num).size == 0)
              this.operationsToProposeBySlot.delete(this.slot_num);
            this.propose(op);
        }
        value = values.next();
      }
  }

  private operationSlotInDecided( operation:any ){
    var search = JSON.stringify({id:operation.command_id,client:operation.client_id});
    return this.operationsDecidedByOperation.get(search);
  }

  protected executeOperation(message:any){
    return Promise.reject("Not implemented");
  }
}
