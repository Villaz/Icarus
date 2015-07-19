/// <reference path="./typings/node/node.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var map = require("./map").Map
var winston = require('winston')
var underscore = require("underscore")

import Emitter = require('./icarus_utils')

/**
 * Class Commander
 * @class Commander
 */
export class Commander extends Emitter.Emitter{

  private slots:Object
  private network:any

  constructor( params:{network:any} ){
    super()
    this.network = params.network
  }

  public sendP2A( params:ParamsLeader ){
      if(this.slots[params.slot] !== undefined)
        this.emit('preempted', {ballot:this.slots[params.slot].ballot})
      else{
        this.slots[params.slot] = {
          ballot: params.ballot,
          operation: params.operation,
          decided: false,
          acceptorsResponse:[],
          acceptors: this.network.acceptors
        }

        var message:P2AMessage = {
          from: params.ballot.id,
          type:'P2A',
          body:{
            slot: params.slot,
            operation: params.operation,
            ballot: params.ballot
          }
        }
        this.network.sendMessageToAllAcceptors(message)
      }
    }

    public receiveP2B( params:{acceptor:any; ballot:Ballot; slot:number , operation:any} ){
        if(this.slots[params.slot] === undefined){
          this.slots[params.slot] = {
              ballot: params.ballot,
              operation: params.operation,
              decided: false,
              acceptorsResponse:[],
              acceptors: this.network.acceptors}
        }
        var exists = underscore._.find(this.slots[params.slot].acceptors,(a:any)=>{ return a === params.acceptor })
        if(exists < 0 || this.slots[params.slot].decided) return

        if(this.slots[params.slot].ballot.isEqual(params.ballot)){
          var exists = underscore._.find(this.slots[params.slot].acceptorsResponse,(a:any)=>{ return a === params.acceptor })
          if(exists < 0)
            this.slots[params.slot].acceptorsResponse.push(params.acceptor)
        }

        if(this.slots[params.slot].acceptorsResponse.length >= Math.round(( this.slots[params.slot].acceptors.length ) / 2)){
            this.slots[params.slot].decided = true
            this.emit('decision', {slot:params.slot , operation: params.operation})
        }else{
            this.slots[params.slot].decidided = true
            this.emit('preempted', {ballot:ballot})
        }
      }
}
