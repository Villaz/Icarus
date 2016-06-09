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

    it('Propose operation', function(){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      replica.propose(op1);
      var ops = replica.proposals.get(0);
      ops.size.should.be.exactly(1)

      var op = ops.values().next().value
      op.command_id.should.be.exactly(1)
      op.client_id.should.be.exactly(1)
    });

    it('Propose operation same slot', function(){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}}

      replica.propose(op1);
      replica.propose(op2);

      var ops = replica.proposals.get(0);
      ops.size.should.be.exactly(2)
      var values = ops.values()
      var op = values.next().value;
      op.command_id.should.be.exactly(1)
      op = values.next().value
      op.command_id.should.be.exactly(2)
    });

    it('Decision operation', function( done ){
        var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
        replica.decision(0 , op1).then(function(){
          replica.lastEmpltySlotInDecisions.should.be.exactly(1);
          var value = replica.operationsDecided.get({id:op1.command_id,client:op1.client_id});
          value.should.be.exactly(0);
          replica.decisions.size.should.be.exactly(0);
          done();
        });
    });

    it('Decide and repropose operations', function( done ){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}}

      replica.propose(op1);
      replica.propose(op2);

      replica.decision(0 , op1).then(function(){
        done();
      });
    });

    it('Decide operation with empty slots', function(done){
      var op1 = {command_id:1,client_id:1,op:{name:'hello'}}
      var op2 = {command_id:2,client_id:1,op:{name:'hello2'}}
      replica.decision(1 , op1).then(function(){
        replica.lastEmpltySlotInDecisions.should.be.exactly(0);
        var value = replica.operationsDecided.get({id:op1.command_id,client:op1.client_id});
        value.should.be.exactly(1);
        replica.decisions.size.should.be.exactly(1);
        replica.decision(0 , op2).then(function(){
          replica.lastEmpltySlotInDecisions.should.be.exactly(2);
          var value = replica.operationsDecided.get({id:op1.command_id,client:op1.client_id});
          value.should.be.exactly(1);
          replica.operationsDecided.get({id:op2.command_id,client:op2.client_id}).should.be.exactly(0);
          //the operations has been performed
          replica.decisions.size.should.be.exactly(0);
          done();
        });
      });
    });


    it('reproposeOperation' , function(  ){
        var op1 = {command_id:1,client_id:1,op:'hello', sha:'123'}
        var op2 = {command_id:2,client_id:1,op:'hello2', sha:'124'}

        replica.proposals.set( 0 , new Set([op1]) )
        replica.lastEmpltySlotInProposals = 1
        replica.lastEmpltySlotInDecisions = 1
        replica.slot_num = 0

        replica.checkOperationsToRepropose(op2)
        replica.lastEmpltySlotInProposals.should.be.exactly(2)
        should.not.exists(replica.proposals.get(0))
        replica.proposals.get(1).values().next().value.command_id.should.be.exactly(1)
    });

    it('repropose same operation' , function( ){
        var op1 = {command_id:1,client_id:1,op:'hello', sha:'1234'}

        replica.proposals.set(0 , new Set([op1]))
        replica.lastEmpltySlotInProposals = 1
        replica.lastEmpltySlotInDecisions = 1
        replica.slot_num = 0
        replica.checkOperationsToRepropose(op1)
        replica.lastEmpltySlotInProposals.should.be.exactly(1)
        replica.proposals.get(0).values().should.be.empty()
    });

    it('nextEmpltySlot' , function(){
        replica.lastEmpltySlotInDecisions = 0
        replica.lastEmpltySlotInProposals = 0
        replica.nextEmpltySlot().should.be.exactly(0)

        replica.lastEmpltySlotInDecisions = 1
        replica.lastEmpltySlotInProposals = 1
        replica.nextEmpltySlot().should.be.exactly(1)

        replica.lastEmpltySlotInDecisions = 0
        replica.lastEmpltySlotInProposals = 1
        replica.nextEmpltySlot().should.be.exactly(0)

        replica.lastEmpltySlotInDecisions = 1
        replica.lastEmpltySlotInProposals = 0
        replica.nextEmpltySlot().should.be.exactly(0)
      });

    it('slotsHaveMenorThanSlotNum', function(){
        var slots = [2,3,4]
        replica.slotsHaveMenorThanSlotNum(slots,1).should.be.false
        replica.slotsHaveMenorThanSlotNum(slots,2).should.be.false
        replica.slotsHaveMenorThanSlotNum(slots,5).should.be.true
    });

    it('Send GAP message', function(){

    });
  });
