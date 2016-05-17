/// <reference path="./typings/tsd.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var winston = require('winston')
var commander = require('./commander')
var Scout = require('./scout').Scout
var crc = require('crc');
import * as Message from "./message";

import {InternalMap as Map} from "./map";
import {Rol} from "./rol";

/**
 * Class Leader
 * @class Leader
 */
export class Leader extends Rol{

  ballot:Ballot
  active:boolean
  proposals : Map<number,any>;
  scout :any
  commander :any
  lastSlotReceived:any
  actualLeader:any
  started: boolean = false

  constructor(params?: { name: string, test?: boolean, network?: { discover: any, ports: any, network:any } }) {
      super('leader', params);
      this.ballot = new ballot.Ballot({ number: 1, id: params.name })
      this.active = false
      this.proposals = new Map<number,any>()
  }

  protected _startNetwork(){
    var self = this;
    this.network.on('acceptor', (info) => {
        if (!self.started) {
            self.started = true
            setTimeout(() => { this.start() }, 5000)
        }
    });
    this.network.on('propose', (message) => {
        message = message[0];
        this.propose({operation:message.operation, slot:message.operation.slot});
    });
    this.network.on('leaderDown', (name) => {
        if (!this.test) winston.info("Leader %s down!!", name[0]);
        winston.info("The actual leader is %s", this.actualLeader);
        if (this.actualLeader === name[0] || this.network.leaders.indexOf(this.actualLeader) < 0) {
            if (!this.test) winston.info("The actual leader %s is down, try to win!", name);
            this.spawnScout();
        }
    });
  }

  public start(){
      this.spawnScout()
      this.commander = new commander.Commander(this);
      this.commander.on('decision', (result) =>{
        result = result[0];

        if(!this.test)
          winston.info("Decided operation for slot %s", result.slot)

        var message:Message.Message = new Message.Message({
            type: 'DECISION',
            from: this.ballot.id,
            command_id: 0,
            operation:result
        })
        this.network.sendToReplicas(message);
        //Once the message is sended to all replicas, the leader can remove
        //the operation from proposals
        this.proposals.delete(result.slot);
      });
  }

  private spawnScout() {
      if (this.scout !== undefined) {
          delete this.scout;
      }
    this.scout = new Scout({ballot:this.ballot, slot:this.lastSlotReceived, network:this.network})

    this.scout.on('preempted', ( body:any ) =>{
        this.preempted({ballot:body[0].ballot})
    })
    this.scout.on('adopted', (body: any) => {
        body = body[0]
        this.adopted(body)
        this.actualLeader = body.ballot.id;
        if(!this.test)
            winston.info("%s is the new leader; ballot %s adopted", body.ballot.id, JSON.stringify(body.ballot))
    })
    this.scout.start()

  }

  public propose(params:{slot:number; operation:any}){
      if(!this.test)
        winston.info("Proposing operation for slot %s", params.slot)

      if(this.proposals.get(params.slot) === undefined){
        this.proposals.set(params.slot, params.operation)
        if(this.active)
          this.commander.sendP2A({slot:params.slot, operation:params.operation, ballot:this.ballot})
      }
  }


  public adopted(params:{ballot:Ballot; pvalues:Map<any,number> , pvaluesSlot:Map<number,number>}){
        params.pvalues.update(this.proposals)
        this.proposals = params.pvalues
        this.sendToCommanderAllproposals(this.proposals.keys);
        this.actualLeader = this.id;
        this.active = true;
        if(!this.test)
          winston.info("Leader %s is active!!!", this.id);
  };

  private sendToCommanderAllproposals(keys:Iterator<any>){
      let entry = keys.next();
      while(!entry.done){
        let slot:number = parseInt(entry.value);
        var operation:any = this.proposals.get(slot)
        this.commander.sendP2A({ slot:slot,
                                 operation:operation,
                                 ballot:this.ballot});
        entry = keys.next();
      }
  }


  private preempted(params:ParamsLeader){
      if(params.ballot.isMayorThanOtherBallot(this.ballot)){
          this.active = false
          this.ballot.number = params.ballot.number + 1
          this.actualLeader = params.ballot.id
          if (!this.test)
              winston.info("Leader %s is preempted, the actual leader is %s", this.id, this.actualLeader);
      }
  }

}
