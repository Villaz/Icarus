///<reference path='./typings/tsd.d.ts' />


const winston = require("winston");

import * as Ballot from "./ballot";
import * as Message from "./message";
import {Rol as Rol} from "./rol";
import * as Acceptor from "./acceptor";
import {Commander as Commander} from "./commander";
import {Scout as Scout} from "./scout";
import {Type as Type} from "./network/network";

export class Replica extends Rol {

  private ballot: Ballot;
  private isCoordinator: boolean = false;
  private actualCoordinator: string;

  private acceptor: Acceptor;
  private scout: Scout;
  private commander: Commander;

  private slotToExecute: number = 0;
  private nextSlotInProposals: number = 0;
  private nextSlotInDecisions: number = 0;

  private proposals: Map<number, Set<Operation>> = new Map();
  private proposed: Map<number, Operation> = new Map();
  private listOfProposals: Set<Operation> = new Set();
  private listOfDecisions: Set<Operation> = new Set();
  private decisions: Map<number, Operation> = new Map();

  /**
  * Constructor of replica
  * Receives as parameters the name of the process,
  * a reference to the network
  * a boolean indicanting if the instance is running in test mode
  * and the conection type with the client (external true or false)
  */
  constructor(params?: {name: string, test?: boolean, external?: boolean, network?: any}) {
    super("replica", params);

    this.ballot = new Ballot.Ballot({id: params.name, number: 1});
    this.acceptor = new Acceptor.Acceptor(this);
    this.scout = new Scout({ballot: this.ballot, network: this.network});
    this.commander = new Commander(this);

    this.network.on("propose", (message) => {
      this.propose(message.operation, false);
    });
    setTimeout(() => {
      this.startScoutAndCommander();
    }, 5000);
  }

  private startScoutAndCommander() {
    this.scout.start();
    this.scout.on("adopted", (message) => {
      this.adoptBallot(message);
    });
    this.commander.on("decision", (message) => {
      this.decision(message.operation);
    });
  }

  /**
  * Method executed when the client sends an operation to the replica
  * checks if the operation has been processed before and starts the consensus
  * problem to resolve the order of executeOperation
  */
  public processOperationFromClient(operation: Operation): void {
    if (!this.isOperationInProposalsOrDecisions(operation)) {
      operation.slot = this.nextEmpltySlot();
      this.addOperationToProposals(operation);
      this.nextSlotInProposals = operation.slot + 1;
      this.propose(operation);
    }
  }

  protected propose(operation: Operation, redirect: boolean= false ): void {
    if (this.proposed.has(operation.slot)) return;
    if (this.isCoordinator) {
      this.proposed.set(operation.slot, operation);
      this.commander.sendP2A({operation: operation, ballot: this.ballot});
    }else {
      if (redirect) this.sendToLeaders(operation);
    }
  }

  private decision(operation: Operation): Promise<void> {
    if (this.nextSlotInDecisions > operation.slot)
      return Promise.reject("Slot already decided");
    this.decisions.set(operation.slot, operation);
    this.listOfDecisions.add(operation);
    // Updates the value to the last emplty slot
    if (this.nextSlotInDecisions === operation.slot)
      do
        this.nextSlotInDecisions++;
      while (this.decisions.has(this.nextSlotInDecisions));

    const whileDecisionsInSlot = ( ) => {
      if (!this.decisions.has(this.slotToExecute)) return Promise.resolve();
      const operationInSlot = this.decisions.get(this.slotToExecute);
      this.checkOperationsToRepropose( operationInSlot );
      return this.perform( operationInSlot ).then(() => {
        winston.info("performed slot %s", this.slotToExecute - 1);
        return whileDecisionsInSlot();
      });
    };
    return whileDecisionsInSlot();
  }


  private perform( operation ) {
    this.slotToExecute++;
    if ( operation.slot < this.slotToExecute ) {
      let message = new Message.Message(
        {
          from: "",
          type: "OPERATION",
          command_id: operation.command_id,
          operation: operation
        });

      if (!this.external) {
        return this.executeOperation(message);
      }else {
        return this.network.sendToOperation(message).then((message) => {
            const msg = {client: operation.client,
               id: operation.command_id,
               result: message};
            return this.network.responde(msg);
        });
      }
    }else
      return Promise.resolve();
  }


  private adoptBallot(message: {ballot: Ballot; pvalues: Map<number, Operation> , pvaluesSlot?: Map<number, number>}) {
    this.proposed = this.updateMap(this.proposed, message.pvalues);
    this.sendToCommanderAllProposed();
    this.actualCoordinator = this.id;
    this.isCoordinator = true;
    winston.info("Leader %s is active!!!", this.id);
  }


  private isOperationInProposalsOrDecisions(operation: Operation): boolean {
    return  this.listOfDecisions.has(operation) || this.listOfProposals.has(operation);
  }

  private addOperationToProposals(operation: Operation): void {
    if (!this.proposals.has(operation.slot))
      this.proposals.set(operation.slot, new Set());
    this.proposals.get(operation.slot).add(operation);
    this.listOfProposals.add(operation);
  }

  private checkOperationsToRepropose(operation: Operation): void {
    if (!this.proposals.has(this.slotToExecute)) return;
    for (const op of this.proposals.get(this.slotToExecute).values()){
      this.proposals.get(this.slotToExecute).delete(op);
      this.listOfProposals.delete(op);
      if (this.proposals.get(this.slotToExecute).size === 0)
        this.proposals.delete(this.slotToExecute);
      if (op.sha !== operation.sha)
        this.processOperationFromClient(op);
    }
  }

  private nextEmpltySlot(): number {
    return this.nextSlotInProposals && this.nextSlotInDecisions;
  }

  private updateMap(m1: Map<number, Operation>, m2: Map<number, Operation>): Map<number, Operation> {
    for (let [slot, operation] of m1.entries())
      if (!m2.has(slot)) m2.set(slot, operation);
    return m2;
  }

  private sendToCommanderAllProposed() {
    for (let [slot, operation] of this.proposed.entries())
      if (slot >= this.slotToExecute)
        this.commander.sendP2A({operation: operation, ballot: this.ballot});
  }

  private sendToLeaders(operation: Operation): void {
    let message = new Message.Message({from: this.id,
                                       command_id: 0,
                                       type: "PROPOSE",
                                       operation: operation});
    this.network.send(message, Type.PUB);
  }

  protected executeOperation(message: any): Promise<any> {
    return Promise.reject("Not implemented");
  }

  get Decisions(): Map<number, Operation>{
    return this.decisions;
  }
}
