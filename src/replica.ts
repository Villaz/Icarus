///<reference path='./typings/tsd.d.ts' />


var winston = require('winston');
var shuffle = require('shuffle-array');
var moment = require('moment');

import * as Ballot from "./ballot";
import * as Message from "./message";
import * as Rol from "./rol";
import {Leader as Leader} from "./leader";

export class Replica extends Rol.Rol{


  greaterSlotDecided:number = -1;
  lastDecidedMessage:any = undefined;

  private slotToExecute:number = 0;
  private nextSlotInProposals: number = 0;
  private nextSlotInDecisions: number = 0;
  private proposals:Map<number,Set<Operation>> = new Map();
  private decisions:Map<number,Operation> = new Map();
  private leader:any;


  constructor(params?: {name:string, test?:boolean, external?:boolean, network?:any}){
    super('replica', params);
    if(!this.test){
      this.leader = new Leader({name:params.name, test:params.test, replica:this, network:params.network });
      setTimeout(()=>{this.leader.start()}, 5000);
      //setInterval(()=>{this.checkSendGAP()},10000);
    }
  }

  public processOperationFromClient(operation:Operation):void{
    if(!this.isOperationInProposalsOrDecisions(operation)){
      operation.slot = this.nextEmpltySlot();
      this.addOperationToProposals(operation);
      this.nextSlotInProposals = operation.slot + 1;
      this.propose(operation);
    }
  }

  protected propose(operation:Operation):void{
    return null;
  }

  private decision(operation:Operation):Promise<void>{
    if (this.nextSlotInDecisions > operation.slot)
      return Promise.reject("Slot already decided");
    this.decisions.set(operation.slot, operation);

    //Updates the value to the last emplty slot
    if(this.nextSlotInDecisions === operation.slot)
      do
        this.nextSlotInDecisions++;
      while(this.decisions.has(this.nextSlotInDecisions))

    const whileDecisionsInSlot = ( ) => {
      if (!this.decisions.has(this.slotToExecute)) return Promise.resolve();
      const operationInSlot = this.decisions.get(this.slotToExecute);
      this.checkOperationsToRepropose( operationInSlot );
      return this.perform( operationInSlot ).then(()=>{
        if (!this.test)
          winston.info("performed slot %s", this.slotToExecute - 1);
        return whileDecisionsInSlot();
      });
    }
    return whileDecisionsInSlot();
  }


  private perform( operation ) {
    this.slotToExecute++;
    if ( operation.slot < this.slotToExecute ){
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
            const msg = {client: operation.client,
               id: operation.command_id,
               result:message}
            return this.network.responde(msg);
        });
      }
    }else
      return Promise.resolve();
    }


  private isOperationInProposalsOrDecisions(operation:Operation):boolean{
    if( new Set(this.decisions.values()).has(operation)) return true;
    for( var [key, value] of this.proposals.entries())
      if(value.has(operation)) return true;
    return false;
  }

  private addOperationToProposals(operation:Operation):void{
    if(!this.proposals.has(operation.slot))
      this.proposals.set(operation.slot, new Set());
    this.proposals.get(operation.slot).add(operation);
  }

  private checkOperationsToRepropose(operation:Operation):void{
    if(!this.proposals.has(this.slotToExecute)) return;
    for(const op of this.proposals.get(this.slotToExecute).values()){
      this.proposals.get(this.slotToExecute).delete(op);
      if(this.proposals.get(this.slotToExecute).size === 0)
        this.proposals.delete(this.slotToExecute);
      if(op.sha !== operation.sha)
        this.processOperationFromClient(op);
    }
  }

  private nextEmpltySlot():number{
    return this.nextSlotInProposals && this.nextSlotInDecisions;
  }


  private checkSendGAP( ):Array<number>{
    const actual = moment().unix()
    let slots:Array<number> = [];
    if( this.lastDecidedMessage === undefined || actual - this.lastDecidedMessage > 10 ){
      if(this.nextSlotInDecisions === this.slotToExecute && this.decisions.size === 0)
        slots.push(this.slotToExecute);
      else{
        for(var i = this.nextSlotInDecisions; i <= this.greaterSlotDecided; i++){
          if(!this.decisions.has(i))
            slots.push(i);
        }
      }
    }
    //this.network.sendToLeaders({slots:slots, port:this.network.routerPort}, this.id, 'GAP');
    return slots;
  }

  protected executeOperation(message:any){
    return Promise.reject("Not implemented");
  }
}
