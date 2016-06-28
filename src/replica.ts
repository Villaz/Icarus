///<reference path='./typings/tsd.d.ts' />


var winston = require('winston');

import * as Ballot from "./ballot";
import * as Message from "./message";
import * as Rol from "./rol";
import * as Acceptor from "./acceptor";
import {Commander as Commander} from "./commander";
import {Scout as Scout} from "./scout";

export class Replica extends Rol.Rol{

  private ballot:Ballot;
  private isCoordinator:boolean = false;
  private actualCoordinator:string;

  private acceptor:Acceptor;
  private scout :Scout;
  private commander :Commander;

  private slotToExecute:number = 0;
  private nextSlotInProposals: number = 0;
  private nextSlotInDecisions: number = 0;
  private proposals:Map<number,Set<Operation>> = new Map();
  private decisions:Map<number,Operation> = new Map();

  /**
  * Constructor of replica
  * Receives as parameters the name of the process,
  * a reference to the network
  * a boolean indicanting if the instance is running in test mode
  * and the conection type with the client (external true or false)
  */
  constructor(params?: {name:string, test?:boolean, external?:boolean, network?:any}){
    super('replica', params);

    this.ballot = new Ballot.Ballot({id:params.name, number:1});
    this.acceptor = new Acceptor.Acceptor(this);
    this.scout = new Scout({ballot:this.ballot, network:this.network});
    this.commander = new Commander(this);

    if(!this.test){
      setTimeout(()=>{
      this.scout.start();
      this.scout.on('adopted', (message)=>{
        this.adoptBallot(message);
      });
      this.commander.on('decision', (message)=>{ console.log(message);})
    }, 5000);
    }
  }

  /**
  * Method executed when the client sends an operation to the replica
  * checks if the operation has been processed before and starts the consensus
  * problem to resolve the order of executeOperation
  */
  public processOperationFromClient(operation:Operation):void{
    if(!this.isOperationInProposalsOrDecisions(operation)){
      operation.slot = this.nextEmpltySlot();
      this.addOperationToProposals(operation);
      this.nextSlotInProposals = operation.slot + 1;
      this.propose(operation);
    }
  }

  protected propose(operation:Operation):void{
    this.commander.sendP2A({operation:operation, ballot:this.ballot});
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


  private adoptBallot(message:{ballot:Ballot; pvalues:Map<any,number> , pvaluesSlot:Map<number,number>}){
    //message.pvalues.update(this.proposals)
    //this.proposals = message.pvalues
    //this.sendToCommanderAllproposals(this.proposals.keys);
    this.actualCoordinator = this.id;
    this.isCoordinator = true;
    if(!this.test)
      winston.info("Leader %s is active!!!", this.id);
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

  protected executeOperation(message:any){
    return Promise.reject("Not implemented");
  }

  get Decisions():Map<number,Operation>{
    return this.decisions;
    //return Array.from(new Set(this.decisions.values()));
  }
}
