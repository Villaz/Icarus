///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot").Ballot
var map = require("./map").Map
var winston = require('winston')

class Acceptor{

  private id:number
  private actualBallot:Ballot
  private mapOfValues:Map
  private network:any


  constructor(){
    this.actualBallot = new ballot()
    this.mapOfValues = new map()
    winston.add(winston.transports.File, { filename: 'acceptor.log' })
    winston.info("Acceptor %s started in port %s ",this.id, "")
  }

  public clear(){
    this.actualBallot = new ballot()
    this.mapOfValues = new map()
  }

  public processP1A(ballot:any, to:any){
    ballot = new Ballot({number:ballot.number, id:ballot.id})
    if(ballot.isMayorThanOtherBallot(this.actualBallot))
    {
      winston.info("P1A Updated ballot to %s", JSON.stringify(ballot))
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

      winston.info("Received P2A: %s", JSON.stringify(value))
      var ballot = new Ballot({number:value.ballot.number , id:value.ballot.id})
      if(ballot.isMayorOrEqualThanOtherBallot(this.actualBallot)){
          winston.info("P2A Updated ballot to %s" ,JSON.stringify(ballot))
          this.actualBallot = ballot
          this.mapOfValues.addValue(value.slot, value.operation)
          winston.info("P2A Added operation  %s  to slot %s", JSON.stringify(value.operation), value.slot)
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
