"use strict"

var should = require('should');
var Replica = require('../lib/replica.js').Replica;
var Ballot = require('../lib/ballot.js').Ballot;

describe('Replica tests', function(){

    var network = {
        acceptors : { 'lyr': {}, 'anu': {}, 'balar': {} },
        send : function () { },
        sendToOperation : function() {return Promise.resolve()},
        responde : function() {return Promise.resolve();},
        on: function(){}
    }
    var replica = undefined

    beforeEach(function(){
        replica = new Replica({name:'test', test: true, network:network });
        replica.proposed = new Map();
    });


    it('processOperationFromClient', function(){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}};
      replica.processOperationFromClient(op1);
      var ops = replica.proposals.get(0);
      ops.size.should.be.exactly(1);

      var op = ops.values().next().value;
      op.command_id.should.be.exactly(1);
      op.client_id.should.be.exactly(1);
      replica.nextSlotInProposals.should.be.exactly(1);
    });


    it('processOperationFromClient same slot', function(){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}};
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}};

      replica.processOperationFromClient(op1);
      replica.processOperationFromClient(op2);

      var ops = replica.proposals.get(0);
      ops.size.should.be.exactly(2);
      var values = ops.values();
      var op = values.next().value;
      op.command_id.should.be.exactly(1);
      op = values.next().value;
      op.command_id.should.be.exactly(2);
    });

    it('propose operation no coordinador no redirect', ( ) => {
      let counter = 0;
      replica.network.send = ( ) => {
        counter++;
      }
      replica.isCoordinator = false;
      replica.propose({slot:1, operation:"1"}, false);
      counter.should.be.exactly(0);
      replica.proposed.size.should.be.exactly(0);
    });


    it('propose operation no coordinador, true redirect', ( ) => {
      let counter = 0;
      replica.network.send = ( ) => {
        counter++;
      }
      replica.isCoordinator = false;
      replica.propose({slot:1, operation:"1"}, true);
      counter.should.be.exactly(1);
      replica.proposed.size.should.be.exactly(0);
    });


    it('propose operation true coordinador', ( ) => {
      let counter = 0;
      replica.commander.sendP2A = ( ) => {
        counter++;
      }
      replica.isCoordinator = true;
      replica.propose({slot:1, operation:"1"});
      counter.should.be.exactly(1);
      replica.proposed.size.should.be.exactly(1);
      replica.proposed.has(1).should.be.ok();
    });


    it('propose duplicated operation', ( ) => {
      replica.proposed.set(1, "1");
      let counter_p2a = 0;
      let counter_leader = 0;
      replica.sendP2A = ( ) => {
        counter_p2a++;
      }
      replica.network.send = ( ) => {
        counter_leader++;
      }
      replica.isCoordinator = true;
      replica.propose({slot:1, operation:"1"});
      counter_p2a.should.be.exactly(0);
      counter_leader.should.be.exactly(0);
    });


    it('Decision operation', function( done ){
        replica.executeOperation = function(message){return Promise.resolve();}
        var op1 = {command_id:1,client_id:1,op:{name:'hello'}, slot:0}
        replica.decision(op1).then(function(){
          replica.nextSlotInDecisions.should.be.exactly(1);
          replica.decisions.get(0).should.be.exactly(op1);
          replica.decisions.size.should.be.exactly(1);
          done();
        });
    });

    it('Decide and repropose operations', function( done ){
      replica.executeOperation = function(message){return Promise.resolve();}
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}, slot:0}
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}, slot:0}

      replica.propose(op1);
      replica.propose(op2);

      replica.decision(op1).then(function(){
        done();
      });
    });

    it('Decide operation with empty slots', function(done){
      replica.executeOperation = function(message){return Promise.resolve();}
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}, slot:1}
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}, slot:0}

      let key1 = JSON.stringify({id:op1.command_id,client:op1.client_id});
      let key2 = JSON.stringify({id:op2.command_id,client:op2.client_id});

      replica.decision(op1).then(function(){
        replica.nextSlotInDecisions.should.be.exactly(0);
        replica.decisions.get(1).should.be.exactly(op1);
        replica.decisions.size.should.be.exactly(1);

        replica.decision(op2).then(function(){
          replica.nextSlotInDecisions.should.be.exactly(2);
          replica.decisions.get(0).should.be.exactly(op2);
          replica.decisions.get(1).should.be.exactly(op1);
          replica.decisions.size.should.be.exactly(2);
          done();
        });
      });
    });

    it('decision already decided', ( done ) => {
      replica.nextSlotInDecisions = 2;
      replica.decision({slot:1}).catch(( ) => { done(); } );
    });


    it('no perform', ( done ) => {
      replica.slotToExecute = 1;
      replica.perform({slot:2, command_id:1, operation:{client:""} }).then(( ) => {  done(); });
    });

    it(' perform external', ( done ) => {
      replica.external = true;
      replica.slotToExecute = 1;
      replica.perform({slot:1, command_id:1, operation:{client:""} }).then( ( ) => { done(); });
    });


    it('reproposeOperation' , function(  ){
        var op1 = {command_id:1,client_id:1,op:'hello', sha:'123'};
        var op2 = {command_id:2,client_id:1,op:'hello2', sha:'124'};

        replica.proposals.set(0, new Set([op1]) );
        replica.nextSlotInProposals = 1;
        replica.nextSlotInDecisions = 1;
        replica.slotToExecute = 0;

        replica.checkOperationsToRepropose(op2);
        replica.nextSlotInProposals.should.be.exactly(2);
        should.not.exists(replica.proposals.get(0));
        replica.proposals.get(1).values().next().value.command_id.should.be.exactly(1)
    });

    it('repropose same operation' , function( ){
        var op1 = {command_id:1,client_id:1,op:'hello', sha:'1234'};

        replica.proposals.set(0 , new Set([op1]));
        replica.nextSlotInProposals = 1;
        replica.nextSlotInDecisions = 1;
        replica.slotToExecute = 0;
        replica.checkOperationsToRepropose(op1);
        replica.nextSlotInProposals.should.be.exactly(1);
        should.not.exists(replica.proposals.get(0));
    });

    it('nextEmpltySlot' , function(){
        replica.nextSlotInProposals = 0
        replica.nextSlotInDecisions = 0
        replica.nextEmpltySlot().should.be.exactly(0)

        replica.nextSlotInProposals = 1
        replica.nextSlotInDecisions = 1
        replica.nextEmpltySlot().should.be.exactly(1)

        replica.nextSlotInProposals = 0
        replica.nextSlotInDecisions = 1
        replica.nextEmpltySlot().should.be.exactly(0)

        replica.nextSlotInProposals = 1
        replica.nextSlotInDecisions = 0
        replica.nextEmpltySlot().should.be.exactly(0)
      });


    it('map', function(){
      let m1 = new Map();
      let m2 = new Map();

      m1.set(1, "1");
      m2.set(2, "2");
      m1.set(3, "3");
      m2.set(4, "4");

      replica.updateMap(m1, m2);
      m1.size.should.be.exactly(2);
      m2.size.should.be.exactly(4);
      m2.has(1).should.be.ok();
      m2.has(2).should.be.ok();
      m2.has(3).should.be.ok();
      m2.has(4).should.be.ok();
    });

    it("map2", function(){
      let m1 = new Map();
      let m2 = new Map();

      m1.set(1, "1");
      m2.set(1, "2");
      m1.set(2, "2");
      m2.set(3, "3");

      replica.updateMap(m1, m2);
      m1.size.should.be.exactly(2);
      m2.size.should.be.exactly(3);
      m2.has(1).should.be.ok();
      m2.has(2).should.be.ok();
      m2.has(3).should.be.ok();
      m2.get(1).should.be.exactly("2");
    });


    it('sendToCommanderAllProposed', () =>{
      let counter = 0;
      replica.commander.sendP2A = ( ) => {
        counter++;
      }

      replica.proposed.set(1, "1");
      replica.proposed.set(2, "2");
      replica.proposed.set(3, "3");
      replica.slotToExecute = 1;

      replica.sendToCommanderAllProposed();
      counter.should.be.exactly(3);

    });


    it('sendToCommanderAllProposed 2', () =>{
      let counter = 0;
      let operations = new Set();
      replica.commander.sendP2A = ( operation ) => {
        counter++;
        operations.add(operation.operation);
      }

      replica.proposed.set(1, "1");
      replica.proposed.set(2, "2");
      replica.proposed.set(3, "3");
      replica.slotToExecute = 2;

      replica.sendToCommanderAllProposed();
      counter.should.be.exactly(2);
      operations.has("2").should.be.ok();
      operations.has("3").should.be.ok();
      operations.has("1").should.be.false();
    });


    it('sendToCommanderAllProposed 3', () =>{
      let counter = 0;
      let operations = new Set();
      replica.commander.sendP2A = ( operation ) => {
        counter++;
        operations.add(operation.operation);
      }

      replica.proposed.set(1, "1");
      replica.proposed.set(2, "2");
      replica.proposed.set(3, "3");
      replica.slotToExecute = 4;

      replica.sendToCommanderAllProposed();
      counter.should.be.exactly(0);
      operations.size.should.be.exactly(0);
    });


    it('adopt ballot', ( ) => {
      replica.sendToCommanderAllProposed = () => {};

      let m1 = new Map();
      m1.set(1, "h");
      let message = {ballot:{id:"a", number:1}, pvalues:m1 };
      replica.adoptBallot(m1);
      replica.actualCoordinator.should.be.exactly(replica.id);
      replica.isCoordinator.should.be.true();
    });

    it('get decisions', ( ) => {
      replica.decisions.set(1, "1");
      replica.Decisions.has(1).should.be.ok();
    });

    it('executeOperation', ( done ) => {
      var promise = replica.executeOperation();
      promise.catch((v) =>{ done() ;});

    });
  });
