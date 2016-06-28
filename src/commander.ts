/// <reference path="./typings/tsd.d.ts"/>


var winston = require('winston')
import events = require('events');

import * as Message from "./message";


/**
 * Class Commander
 * @class Commander
 */
export class Commander extends events.EventEmitter{

  private slots:Map<Number,CommanderSlot> = new Map();
  private slotsDecided:Set<number> = new Set();
  private operation:Object;
  private leader:any;

  constructor( leader:any ){
    super()
    this.leader = leader;
    this.leader.Network.on('P2B', (message) => { this.process(message) })
  }

  public process( message:Message.Message){
    if (message.type == 'P2B' && this.leader.isCoordinator){
      this.receiveP2B({
        acceptor: message.from,
        ballot: message.operation.ballot,
        slot: message.operation.slot,
        operation:message.operation.operation
      });
    }
  }

  public sendP2A( params:{ballot:Ballot, operation:Operation} ){
      if(this.slotsDecided.has(params.operation.slot)) return;
      if (this.slots.has(params.operation.slot)){
        this.emit('preempted', this.slots.get(params.operation.slot).ballot)
        return
      }
      else{
        this.slots.set(params.operation.slot, {
          ballot: params.ballot,
          operation: params.operation,
          acceptorsResponse: new Set(),
          acceptors: this.leader.Network.acceptors
        });

        var message = new Message.Message({
          from: params.ballot.id,
          type:'P2A',
          command_id:0,
          operation:params
        });
        this.leader.Network.send(message)
      }
    }

    public receiveP2B( params:{acceptor:any; ballot:Ballot; slot:number , operation:any} ){
        if(!this.leader.Network.acceptors.has(params.acceptor)) return
        if(this.slotsDecided.has(params.slot)) return

        if (!this.slots.has(params.slot)){
          this.slots.set(params.slot, {
              ballot: params.ballot,
              operation: params.operation,
              acceptorsResponse: new Set(),
              acceptors: this.leader.Network.acceptors
            });
        }
        var slot = this.slots.get(params.slot);
        if(!slot.acceptors.has(params.acceptor)) return;

        if (slot.ballot.isEqual(params.ballot))
          this.slots.get(params.slot).acceptorsResponse.add(params.acceptor)
        if (params.ballot.isMayorThanOtherBallot(slot.ballot)){
            this.emit('preempted', params.ballot)
            return
        }

        //if the mayority of acceptors have accepted the operation, the
        //commander adopts the operation and emits a message to the leader.
        if (slot.acceptorsResponse.size >= Math.round((slot.acceptors.size ) / 2)){
            //removes the operation from slots
            this.slots.delete(params.slot);
            this.slotsDecided.add(params.slot);
            this.emit('decision', {slot:params.slot , operation: params.operation})
        }
      }
}
