/// <reference path="./typings/node/node.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var map = require("./map").Map
var winston = require('winston')
var underscore = require("underscore")

import Emitter = require('./icarus_utils')
//import * as Emitter from "./icarus_utils";
/**
 * Class Scout
 * @class Scout
 */
export class Scout extends Emitter.Emitter{

  acceptors: Array<string>
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
    this.acceptors = []
    this.adopted = false
    this.ballot = params.ballot
    this.lastSlotReceived = params.lastSlotReceived
    this.network = params.network

  }

  start( ){
    var message = {
      type:'P1A',
      body:{
        leader: this.ballot.id,
        ballot: this.ballot,
        lastSlotReceived: this.lastSlotReceived
      }
    }
    //network.sendMessageToAllAcceptors(message)
    return message
  }


  process(message:any){
    if(message.type == 'P1B') var ballot = message.body.ballot
    if(this.ballot.isEqual(ballot) && !this.adopted){
      this.updateAcceptedValuesAndAcceptorsResponse(message)
      this.ifResponseMayorOfAcceptorsSendAdopted()
    }else if(!this.ballot.isEqual(ballot) || this.adopted){
      this.sendPreemptedMessage(ballot)
    }
  }

  private updateAcceptedValuesAndAcceptorsResponse(message:any){
    this.addAcceptedToPValues(message.body.accepted)
    if(this.acceptorsResponsed.indexOf(message.from) < 0 && this.acceptors.indexOf(message.from) >= 0)
      this.acceptorsResponsed.push(message.from)
  }

  private ifResponseMayorOfAcceptorsSendAdopted(){
    var numberAcceptors = this.acceptors.length
    if(this.acceptors.length == 2)
      numberAcceptors = 3

    if(this.acceptorsResponsed.length >= Math.round( numberAcceptors / 2 )){
      this.adopted = true
      this.acceptorsResponsed = []

      var pvaluesMap = new map()
      var pvaluesInSlotMap = new map()

      for(var pvalue of this.pvalues){
        pvaluesMap.addValue(pvalue.slot , pvalue)
        pvaluesInSlotMap.addValue(pvalue , pvalue.slot)
      }
      var body = {
        ballot: this.ballot,
        pvalues: pvaluesMap,
        pvaluesSlot: pvaluesInSlotMap
      }
      this.emit('adopted', body)
    }
  }

  private sendPreemptedMessage(ballot:Ballot){
    var body = {
      ballot: ballot,
      pvalues: this.pvalues
    }
    this.emit('preempted', body)
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
