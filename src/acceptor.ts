///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot")
var map = require("./map").Map
var winston = require('winston')
var Network = require('./network').AcceptorNetwork

export class Acceptor{

  private id:number
  private actualBallot:Ballot
  private mapOfValues:Map
  private network:any

  private test:boolean


  constructor(params?:{test?:boolean, network?:{membership:{ip:string,port:number},publisher:number}}){
    this.actualBallot = new ballot.Ballot()
    this.mapOfValues = new map()

    if(params !== undefined && params.test !== undefined) this.test = params.test
    else this.test = false
    
    if(!this.test){
      winston.add(winston.transports.File, { filename: 'acceptor.log' })
      if(params !== undefined && params.network !== undefined)
        winston.info("Acceptor %s started in port %s ",this.id, params.network.publisher)
    }
    if(params !== undefined && !this.test && params.network !== undefined) this.startNetwork(params.network)
  }

  private startNetwork(params:{membership:{ip:string,port:number},publisher:number}){
    this.network = new Network()
  }

  public clear(){
    this.actualBallot = new ballot.Ballot()
    this.mapOfValues = new map()
  }


  public processP1A(ballot:Ballot, to:any){
    if(ballot.isMayorThanOtherBallot(this.actualBallot))
    {
      if(!this.test) winston.info("P1A Updated ballot to %s", JSON.stringify(ballot))
      this.actualBallot = ballot
    }
    this.sendP1B(this.id, to)
  }


  public sendP1B( from:number , to:number ){
    var values = this.mapOfValues.getValues({start:from, end:to})
    var message = { type:'P1B',
                    from: from,
                    body:{
                      ballot:this.actualBallot,
                      accepted: values
                      }}
    //network.send(message)
  }

  public processP2A(value:{slot:number; operation:any; ballot:Ballot}){

      var operation = this.mapOfValues.getValues({start:value.slot})[0]
      if(operation !== undefined && operation.client === value.operation && operation.id === value.operation.client.id) return

      if(!this.test) winston.info("Received P2A: %s", JSON.stringify(value))

      if(value.ballot.isMayorOrEqualThanOtherBallot(this.actualBallot)){
          if(!this.test) winston.info("P2A Updated ballot to %s" ,JSON.stringify(value.ballot))
          this.actualBallot = value.ballot
          this.mapOfValues.addValue(value.slot, value.operation)
          if(!this.test) winston.info("P2A Added operation  %s  to slot %s", JSON.stringify(value.operation), value.slot)
      }
      this.sendP2B(value.slot, value.operation)

  }

  public sendP2B(slot:number , operation:any ){
      var message = {
          type: 'P2B',
          acceptor: this.id,
          ballot: this.actualBallot,
          slot: slot,
          operation: operation
        }
      //@network?.send message
    }

}

var a = new Acceptor({network:{membership:{ip:'127.0.0.1',port:8887},publisher:8889}})