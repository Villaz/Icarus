"use strict"

var should = require('should');
var Replica = require('../lib/replica.js').Replica;
var Ballot = require('../lib/ballot.js').Ballot;

describe('Replica tests', function(){

    var network = {
        acceptors : { 'lyr': {}, 'anu': {}, 'balar': {} },
        sendToLeaders : function () { },
        sendToOperation : function() {return Promise.resolve()},
        responde : function() {return Promise.resolve();
        }
    }
    var replica = undefined

    beforeEach(function(){
        replica = new Replica({name:'test', test: true })
        replica.network = network
        replica.executeOperation = function(message){return Promise.resolve();}
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


    it('Decision operation', function( done ){
        var op1 = {command_id:1,client_id:1,op:{name:'hello'}, slot:0}
        replica.decision(op1).then(function(){
          replica.nextSlotInDecisions.should.be.exactly(1);
          replica.decisions.get(0).should.be.exactly(op1);
          replica.decisions.size.should.be.exactly(1);
          done();
        });
    });

    it('Decide and repropose operations', function( done ){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}, slot:0}
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}, slot:0}

      replica.propose(op1);
      replica.propose(op2);

      replica.decision(op1).then(function(){
        done();
      });
    });

    it('Decide operation with empty slots', function(done){
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

    xit('Send GAP message no operations', function(){
       var slots = new Set(replica.checkSendGAP());
       slots.has(0).should.be.true()
    });

    xit('Send GAP message with operation', function(done){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      replica.decision(0 , op1).then(function(){
       var slots = new Set(replica.checkSendGAP());
       slots.has(0).should.be.false();
       slots.has(1).should.be.true();
       done();
     });
    });

    xit('Send GAP message with operation and space', function(done){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      replica.decision(1 , op1).then(function(){
       var slots = new Set(replica.checkSendGAP());
       slots.has(0).should.be.true();
       slots.has(1).should.be.false();
       done();
     });
    });

    xit('Send GAP message with operations and multiple spaces', function(done){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      var op1 = {command_id:2,client_id:2,op:{name:'hello2'}}
      replica.decision(1 , op1).then(function(){
       replica.decision(3 , op1).then(function(){
         var slots = new Set(replica.checkSendGAP());
         slots.has(0).should.be.true();
         slots.has(1).should.be.false();
         slots.has(2).should.be.true();
         slots.has(3).should.be.false();
         done();
       });
     });
    });
  });
