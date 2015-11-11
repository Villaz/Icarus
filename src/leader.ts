/// <reference path="./typings/tsd.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var winston = require('winston')
var commander = require('./commander')
var Network = require('./network').LeaderNetwork
var Scout = require('./scout').Scout

import {InternalMap as Map} from "./map";

/**
 * Class Leader
 * @class Leader
 */
export class Leader{

  id:string
  ballot:Ballot
  active:boolean
  proposals : Map<any,any>;
  proposalsInSlot : any
  scout :any
  commander :any
  lastSlotReceived:any
  network :any
  actualLeader:any
  started: boolean = false
  test:boolean = false

  constructor(params?: { name: string, test?: boolean, network?: { discover: any, ports: any } }) {
      this.id = params.name
      this.ballot = new ballot.Ballot({ number: 1, id: params.name })
      this.active = false
      this.proposals = new Map<any,any>()
      this.proposalsInSlot = {}

      if(params !== undefined && params.test !== undefined)
        this.test = params.test
      if (!params.test) {
          try {
              winston.add(winston.transports.File, { filename: 'leader' + this.id + '.log' })
              winston.add(require('winston-graylog2'), {
                name: 'Graylog',
                level: 'debug',
                silent: false,
                handleExceptions: false,
                graylog: {
                  servers: [{host: '127.0.0.1', port: 12201}],
                  hostname: this.id,
                  facility: "leader",
                  bufferSize: 1400
                }
              });
          } catch (e) { }
          winston.info("Leader %s started on port %s", params.name, params.network.ports.port);
      }

      process.on('decision',(message:{slot:number,operation:any})=>{
        process.emit('decision', message)
      })

      if(!params.test && params.network !== undefined) this.startNetwork(params.network)
  }

  private startNetwork(params: { discover: any, ports: any }){
    this.network = new Network(params.discover, params.ports)
    var self = this;
    this.network.on('acceptor', (info) => {
        if (!self.started) {
            self.started = true
            setTimeout(() => { this.start() }, 5000)
        }
    });
    this.network.on('leaderDown', (name) => {
        if (!this.test) winston.info("Leader %s down!!", name[0]);
        winston.info("The actual leader was %s", this.actualLeader);
        if (this.actualLeader === name[0]) {
            if (!this.test) winston.info("The actual leader %s is down, try to win!", name);
            this.spawnScout();
        }
    });
  }

  public start(){
      this.spawnScout()
      this.spawnCommander()
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
        if(!this.test)
            winston.info("%s is the new leader; ballot %s adopted", body.ballot.id, JSON.stringify(body.ballot))
    })
    this.scout.start()

  }

  private spawnCommander(params?:{key:any, operation:any}){
    this.commander = new commander.Commander({network:this.network})
  }


  public propose(params:{slot:number; operation:any}){
      if(!this.test)
        winston.info("Proposing for slot %s operation %s", params.slot, JSON.stringify(params.operation))

      var value:any = this.proposals.get(params.slot)
      if(value === undefined){
        this.proposalsInSlot[params.operation] = params.slot
        this.proposals.set(params.slot, params.operation)
        if(this.active)
          this.commander.sendP2A(params.slot, params.operation, this.ballot)
      }
  }


  public adopted(params:{ballot:Ballot; pvalues:any , pvaluesSlot:any}){
        var promise1 = params.pvalues.update(this.proposals)
        var promise2 = params.pvaluesSlot.update(this.proposalsInSlot)

        Promise.all([promise1,promise2]).then(()=>{
            this.proposals = params.pvalues
            this.proposalsInSlot = params.pvaluesSlot
            this.sendToCommanderAllproposals(this.proposals.keys);
            this.active = true
            if(!this.test)
                winston.info("Leader %s is active!!!", this.id)
        })
  }

  private sendToCommanderAllproposals(keys:Iterator<any>){
      let entry = keys.next();
      while(!entry.done){
        let key = entry.value;
        var operation:any = this.proposals.get(key)
        this.commander.sendP2A({key:key,operation:operation,ballot:this.ballot})
        this.spawnCommander({key:key, operation:operation})
      }
  }


  private preempted(params:ParamsLeader){
      if(params.ballot.isMayorThanOtherBallot(this.ballot)){
          this.active = false
          this.ballot.number = params.ballot.number + 1
          this.actualLeader = params.ballot.id
          if(params.slot !== undefined)
              process.emit('preempted', { slot:params.slot, operation:params.operation, replica:params.ballot.id})
          if (!this.test)
              winston.info("Leader %s is preempted, the actual leader is %s", this.id, this.actualLeader);
      }
  }


  public p1b( message:any ){
      this.scout.process(message)
  }

  public p2b( message:any ){
      this.commander.receiveP2B(message)
  }

}
