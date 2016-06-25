/// <reference path="./typings/tsd.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var winston = require('winston')
var underscore = require("underscore")

//import Emitter = require('./icarus_utils')
import * as Message from "./message";
import * as Emitter from "./icarus_utils";
import {InternalMap as Map} from "./map";

//import * as Emitter from "./icarus_utils";
/**
 * Class Scout
 * @class Scout
 */
export class Scout extends Emitter.Emitter{

  acceptors: any;
  acceptorsResponsed : Array<string>
  pvalues : Array<any>
  slotsOfValues : Array<any>
  adopted:boolean
  ballot:Ballot
  lastSlotReceived:any
  network:any

  constructor(params:{ballot:Ballot; lastSlotReceived:any; network?:any}){
    super()
    this.slotsOfValues = []
    this.pvalues = []
    this.acceptorsResponsed = []
    this.acceptors = params.network.acceptors
    this.adopted = false
    this.ballot = params.ballot
    this.lastSlotReceived = params.lastSlotReceived
    this.network = params.network
    this.network.on('P1B', (message) => { this.process(message[0]) })

  }

  start( ){
      var operation = {
          leader: this.ballot.id,
          ballot: this.ballot,
          lastSlotReceived: this.lastSlotReceived
      };
    var message = new Message.Message({ type: 'P1A', from: this.ballot.id, command_id: 0, operation: operation });
    this.network.sendToAcceptors(message);
    return message;
  }


  private process(message: any) {
    if (this.adopted) return;
    if (message.type == 'P1B') var ballot = message.operation.ballot;
    if(this.ballot.isEqual(ballot)){
        this.updateAcceptedValuesAndAcceptorsResponse(message);
        this.ifResponseMayorOfAcceptorsSendAdopted();
    }else if(!this.ballot.isEqual(ballot) || this.adopted){
        this.sendPreemptedMessage(ballot);
    }
  }

  private updateAcceptedValuesAndAcceptorsResponse(message:any){
    this.addAcceptedToPValues(message.operation.accepted)
    if (this.acceptorsResponsed.indexOf(message.from) < 0 && this.acceptors.has(message.from))
      this.acceptorsResponsed.push(message.from)
  }

  private ifResponseMayorOfAcceptorsSendAdopted(){

    var acceptors = () => {
      let counter = 0;
      for(let key of this.acceptors)
        counter++;
      return counter;
    }

    var numberAcceptors = acceptors();
    if (numberAcceptors == 2)
      numberAcceptors = 3
    if (this.acceptorsResponsed.length >= Math.round( numberAcceptors / 2 )){
      this.adopted = true
      this.acceptorsResponsed = []

      var pvaluesMap = new Map()
      var pvaluesInSlotMap = new Map()

      for(var pvalue of this.pvalues){
        pvaluesMap.set(pvalue.slot , pvalue)
        pvaluesInSlotMap.set(pvalue , pvalue.slot)
      }
      var body = {
        ballot: this.ballot,
        pvalues: pvaluesMap,
        pvaluesSlot: pvaluesInSlotMap
      }
      this.emit('adopted', body);
      this.network.removeAllListeners('message');
    }
  }

  private sendPreemptedMessage(ballot:Ballot){
      var body = {
          ballot: ballot,
          pvalues: this.pvalues
      };
    this.adopted = true;
    this.emit('preempted', body);
    this.network.removeAllListeners('message');
  }

  private addAcceptedToPValues(accepted:any){
    for(var accept of accepted){
      if(this.slotsOfValues.indexOf(accept.slot) < 0){
        this.pvalues.push(accept)
        this.slotsOfValues.push(accept.slot)
      }
    }
  }
}
