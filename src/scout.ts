/// <reference path="./typings/tsd.d.ts"/>

import events = require("events");

import * as Message from "./message";
import {Type as Type} from "./network/network";

/**
 * Class Scout
 * @class Scout
 */
export class Scout extends events.EventEmitter {

  private acceptors: any;
  private acceptorsResponsed: Array<string>;
  private pvalues: Array<any>;
  private slotsOfValues: Array<any>;
  private adopted: boolean = false;
  private ballot: Ballot;
  private network: any;


  constructor(params: {ballot: Ballot, network?: any}) {
    super();
    this.slotsOfValues = [];
    this.pvalues = [];
    this.acceptorsResponsed = [];
    this.acceptors = params.network.acceptors;
    this.adopted = false;
    this.ballot = params.ballot;
    this.network = params.network;
    this.network.on("P1B", (message) => {
       this.process(message);
     });
  }

  start( ) {
      let operation = {
          leader: this.ballot.id,
          ballot: this.ballot,
      };
    let message = new Message.Message({ type: "P1A",
                                        from: this.ballot.id,
                                        command_id: 0,
                                        operation: operation });
    this.network.send(message, Type.PUB);
    return message;
  }


  private process(message: Message.Message) {
    if (this.adopted) return;
    const ballot = message.operation.ballot;
    if (this.ballot.isEqual(ballot)) {
        this.updateAcceptedValuesAndAcceptorsResponse(message);
        this.ifResponseMayorOfAcceptorsSendAdopted();
    }else if (!this.ballot.isEqual(ballot) || this.adopted) {
        this.sendPreemptedMessage(ballot);
    }
  }

  private updateAcceptedValuesAndAcceptorsResponse(message: Message.Message) {
    this.addAcceptedToPValues(message.operation.accepted);
    if (this.acceptorsResponsed.indexOf(message.from) < 0 && this.acceptors.has(message.from))
      this.acceptorsResponsed.push(message.from);
  }

  private ifResponseMayorOfAcceptorsSendAdopted() {

    let numberAcceptors = this.acceptors.size;
    if (numberAcceptors === 2)
      numberAcceptors = 3;
    if (this.acceptorsResponsed.length >= Math.round( numberAcceptors / 2 )) {
      this.adopted = true;
      this.acceptorsResponsed = [];

      let pvaluesMap = new Map();
      let pvaluesInSlotMap = new Map();

      for (let pvalue of this.pvalues){
        pvaluesMap.set(pvalue.slot , pvalue);
        pvaluesInSlotMap.set(pvalue , pvalue.slot);
      }
      let body = {
        ballot: this.ballot,
        pvalues: pvaluesMap,
        pvaluesSlot: pvaluesInSlotMap
      };
      this.emit("adopted", body);
      this.network.removeAllListeners("message");
    }
  }

  private sendPreemptedMessage(ballot: Ballot) {
      let body = {
          ballot: ballot,
          pvalues: this.pvalues
      };
    this.adopted = true;
    this.emit("preempted", body);
    this.network.removeAllListeners("message");
  }

  private addAcceptedToPValues(accepted: any) {
    for (let accept of accepted){
      if (this.slotsOfValues.indexOf(accept.slot) < 0) {
        this.pvalues.push(accept);
        this.slotsOfValues.push(accept.slot);
      }
    }
  }
}
