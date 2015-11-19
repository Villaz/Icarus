/// <reference path="./typings/tsd.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var winston = require('winston')
var underscore = require("underscore")
import * as Message from "./message";

//import Emitter = require('./icarus_utils')
import * as Emitter from "./icarus_utils";

/**
 * Class Commander
 * @class Commander
 */
export class Commander extends Emitter.Emitter{

  private slots:Object
  private operation:Object
  private network:any

  constructor( params:{network:any} ){
    super()
    this.network = params.network
    this.slots = {}

    this.network.on('P2B', (message) => { this.process(message[0]) })
  }

  public process( message:Message.Message){
    if (message.type == 'P2B'){
      this.receiveP2B({
        acceptor: message.from,
        ballot: message.operation.ballot,
        slot: message.operation.slot,
        operation:message.operation.operation
      });
    }
  }

  public sendP2A( params:ParamsLeader ){
      if(this.slots[params.slot] !== undefined){
        this.emit('preempted', this.slots[params.slot].ballot)
        return
      }
      else{
        this.slots[params.slot] = {
          ballot: params.ballot,
          operation: params.operation,
          decided: false,
          acceptorsResponse:[],
          acceptors: this.network.acceptors
        }

        var message = new Message.Message({
          from: params.ballot.id,
          type:'P2A',
          command_id:0,
          operation:{
            slot: params.slot,
            operation: params.operation,
            ballot: params.ballot
          }
        });
        this.network.sendToAcceptors(message)
      }
    }

    public receiveP2B( params:{acceptor:any; ballot:Ballot; slot:number , operation:any} ){
        if(!this.existsInArray(this.network.acceptors, params.acceptor))
            return

        if(this.slots[params.slot] === undefined){
          this.slots[params.slot] = {
              ballot: params.ballot,
              operation: params.operation,
              decided: false,
              acceptorsResponse:[],
              acceptors: this.network.acceptors}
        }
        var existsAcceptor = this.existsInArray(this.slots[params.slot].acceptors, params.acceptor)
        if(!existsAcceptor || this.slots[params.slot].decided) return

        if(this.slots[params.slot].ballot.isEqual(params.ballot)){
          if(!this.existsInArray(this.slots[params.slot].acceptorsResponse, params.acceptor))
            this.slots[params.slot].acceptorsResponse.push(params.acceptor)
        }

        if(params.ballot.isMayorThanOtherBallot(this.slots[params.slot].ballot)){
            this.emit('preempted', params.ballot)
            return
        }
        if (this.slots[params.slot].acceptorsResponse.length >= Math.round(( this.slots[params.slot].acceptors.length ) / 2)){
            this.slots[params.slot].decided = true
            this.emit('decision', {slot:params.slot , operation: params.operation})
        }
      }

    private existsInArray<T>(array:Array<T>, value:T){
      for (var val of array){
        if (val === value) return true
      }
      return false
    }
}
