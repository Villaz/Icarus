///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot");
var map = require("./map").Map;
var winston = require('winston');
var Network = require('./network').ReplicaNetwork;
var shuffle = require('shuffle-array');
import * as Message from "./message";


export class Replica{
  slot_num:number = 0;
  proposals:any = undefined;
  decisions:any = undefined;
  performed:any = undefined;

  operationsProposed:any = undefined;
  operationsDecided:any = undefined

  lastEmpltySlotInProposals:any = undefined
  lastEmpltySlotInDecisions:any = undefined

  promisesPerSlot:any = undefined

  network:any;

  id:string;
  test:boolean;

  constructor(params?: { name:string, test?: boolean, network?:{ discover: any, ports: any }}){
    this.id = params.name
    this.slot_num = 0;
    this.proposals = new map();
    this.decisions = new map();
    this.performed = new map();

    this.operationsProposed = new map();
    this.operationsDecided  = new map();

    this.promisesPerSlot  = {};

    this.lastEmpltySlotInDecisions = 0;
    this.lastEmpltySlotInProposals = 0;

    if(params !== undefined && params.test !== undefined) this.test = params.test
    else this.test = false

    if (!this.test) {
        try {
            winston.add(winston.transports.File, { filename: 'replica' + this.id + '.log' });
        } catch (e){ }
      if(params !== undefined && params.network !== undefined)
        winston.info("Replica %s started in port %s ",this.id, params.network.ports.port);
    }
    if (params !== undefined && !this.test && params.network !== undefined) this.startNetwork(params.network);
  }


  private startNetwork(params: { discover: Discover, ports:any }) {
      this.network = new Network(params.discover, params.ports)
      var self = this
      this.network.on('message', (message) => {
          message = message[0]
          switch (message.type) {
              case 'DECISION':
                  self.decision( "" , "" )
                  break
          }
      });
  }

  private propose(operation:any){
    var key = {id:operation.id, client:operation.client}
    var decided  = this.operationsDecided.getValue(key)
    var proposed = this.operationsProposed.getValue(key)

    if ( decided === undefined ){
      let slot = this.nextEmpltySlot()
      if (proposed === undefined || proposed.indexOf(proposed) < 0){
        this.proposals.addValues( slot, operation );
        this.operationsProposed.addValues( key, slot );
        this.lastEmpltySlotInProposals++;
        //TODO: send propose to leader
      }
    }
  }

  private decision( slot, operation ){
    if (this.lastEmpltySlotInDecisions > slot)
      return;
    this.decisions.addValue( slot, operation )
    var key = {id:operation.id,client:operation.client};
    this.operationsDecided.addValues( key , operation );
    this.lastEmpltySlotInDecisions++;

    let whileDecisionsInSlot = ( ) => {
      let value = this.decisions.getValue( this.slot_num );
      if ( value !== undefined ){
        this.reproposeOperation( operation );
        this.perform( operation );
        whileDecisionsInSlot();
      }
    }
    whileDecisionsInSlot();
  }

  private perform( operation ) {
    var slots = this.operationSlotInDecided(operation);
    this.slot_num++;
    if (!this.slotsHaveMenorThanSlotNum( slots , this.slot_num )){
      //TODO Execute the operation
    }

  }

  private reproposeOperation( operation:any ){
    let proposals = this.proposals.getValue(this.slot_num);
    let operationsToRepropose = [];
    if (proposals === undefined) return;
    for (var proposal of proposals ){
      if (proposal.id !== operation.id || proposal.client !== operation.client){
        operationsToRepropose.push( proposal );
      }
    }
    for (var proposal of operationsToRepropose) this.propose( proposal );
    if (operationsToRepropose.length > 0) this.proposals.remove( this.slot_num );
  }


 private nextEmpltySlot(){
    if (this.lastEmpltySlotInDecisions == this.lastEmpltySlotInProposals)
      return this.lastEmpltySlotInDecisions;
    if (this.lastEmpltySlotInDecisions < this.lastEmpltySlotInProposals)
      return this.lastEmpltySlotInDecisions;
    else
      return this.lastEmpltySlotInProposals;
  }


  private isOperationInProposed( operation ) {
    var search = {id:operation.id,client:operation.client};
    return this.operationsProposed.getValue(search);
  }


  private operationSlotInDecided( operation:any ){
    var search = {id:operation.id,client:operation.client};
    return this.operationsDecided.getValue(search);
  }


  private slotsHaveMenorThanSlotNum( slots , slot_num ){
    if (slots === undefined)
      return false;

    for(let slot of slots){
      if (slot < slot_num) return true;
    }
    return false;
  }

}
