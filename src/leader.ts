/// <reference path="./typings/node/node.d.ts"/>


var Promise = require("bluebird")
var ballot = require("./ballot")
var map = require("./map").Map
var winston = require('winston')
var commander = require('commander')
var Network = require('./network').LeaderNetwork
var Scout = require('./scout')

/**
 * Class Leader
 * @class Leader
 */
export class Leader{

  ballot:Ballot
  active:boolean
  proposals : any
  proposalsInSlot : any
  scout :any
  commander :any
  lastSlotReceived:any
  network :any
  actualLeader:any

  test:boolean = false

  constructor(params?:{test?:boolean, network?:{ip:string, membership:number,publisher:number}}){
      this.ballot = new ballot.Ballot(1, params.network.ip)
      this.active = false
      this.proposals = new Map()
      this.proposalsInSlot = {}

      if(params !== undefined && params.test !== undefined)
        this.test = params.test
      if(!params.test) winston.info("Leader started")

      process.on('preempted',(message:ParamsLeader)=>{
        this.preempted(message)
      })

      process.on('decision',(message:{slot:number,operation:any})=>{
        process.emit('decision', message)
      })
      
      if(!params.test && params.network !== undefined) this.startNetwork(params.network)
  }

  private startNetwork(params:{membership:number,publisher:number}){
    this.network = new Network({membership:8887,publisher:8788})
    this.network.on('acceptor',(info)=>{
      if(this.network.acceptors.length > 0)
        this.start()
    })
  }

  public start(){
      this.spawnScout()
      this.spawnCommander()
  }

  private spawnScout(){
    this.scout = new Scout({ballot:this.ballot, slot:this.lastSlotReceived, network:this.network})

    this.scout.on('preempted', ( body:any ) =>{
        this.preempted({ballot:body.ballot})
    })
    this.scout.on('adopted', ( body:any ) => {
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

      var value:any = this.proposals.getValue(params.slot)
      if(value === undefined){
        this.proposalsInSlot[params.operation] = params.slot
        this.proposals.addValue(params.slot, params.operation)
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
            var promise:any = this.sendToCommanderAllproposals(this.proposals.getAllKeys())
            promise.then(()=>{
                this.active = true
                if(!this.test)
                  winston.info("Leader %s is active!!!", this.network.ip)
            })

        })
  }

  private sendToCommanderAllproposals(keys:Array<any>){
      for(var key of keys){
        var operation:any = this.proposals.getValue(key)
        this.commander.sendP2A({key:key,operation:operation,ballot:this.ballot})
        this.spawnCommander({key:key, operation:operation})
      }
  }


  private preempted(params:ParamsLeader){
      if(params.ballot.isMayorThanOtherBallot(this.ballot)){
          this.active = false
          this.ballot.number = ballot.number + 1
          this.actualLeader = ballot.id
          this.spawnScout()
          if(params.slot !== undefined)
              process.emit('preempted', { slot:params.slot, operation:params.operation, replica:params.ballot.id})
          if(!this.test)
            winston.info("Leader is preempted, the actual leader is %s", JSON.stringify(ballot))
      }
  }


  public p1b( message:any ){
      this.scout.process(message)
  }

  public p2b( message:any ){
      this.commander.receiveP2B(message)
  }

}

var l = new Leader({test:false,network:{ip:'127.0.0.1',membership:8887,publisher:8886}})