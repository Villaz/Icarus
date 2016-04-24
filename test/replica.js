var should = require('should');
var Replica = require('../lib/replica.js').Replica;
var Ballot = require('../lib/ballot.js').Ballot;
var Promise = require('bluebird');

describe('Replica tests', function(){

    var network = {
        acceptors : { 'lyr': {}, 'anu': {}, 'balar': {} },
        sendToLeaders : function () { },
        sendToOperation : function() {return Promise.resolve()},
        responde : function() {return Promise.resolve();}
    }
    var replica = undefined

    beforeEach(function(){
        replica = new Replica({name:'test', test: true })
        replica.network = network
    });

    it('Propose operation', function(){
      var op1 = {id:1,client:1,op:{name:'hello'}}
      replica.propose(op1);
      var ops = replica.proposals.get(0);
      ops.size.should.be.exactly(1)

      var op = ops.values().next().value
      op.id.should.be.exactly(1)
      op.client.should.be.exactly(1)
    });

    it('Propose operation same slot', function(){
      var op1 = {id:1,client:1,op:{name:'hello'}}
      var op2 = {id:2,client:1,op:{name:'hello2'}}

      replica.propose(op1);
      replica.propose(op2);

      var ops = replica.proposals.get(0);
      ops.size.should.be.exactly(2)
      var values = ops.values()
      var op = values.next().value;
      op.id.should.be.exactly(1)
      op = values.next().value
      op.id.should.be.exactly(2)
    });

    it('Decision operation', function( done ){
        var op1 = {id:1,client:1,op:{name:'hello'}}
        replica.decision(0 , op1).then(function(){
          replica.lastEmpltySlotInDecisions.should.be.exactly(1);
          var value = replica.decisions.get(0);
          value.id.should.be.exactly(1)
          value.client.should.be.exactly(1)
          done();
        });
    });

    it('Decide and repropose operations', function( done ){
      var op1 = {id:1,client:1,op:{name:'hello'}}
      var op2 = {id:2,client:1,op:{name:'hello2'}}

      replica.propose(op1);
      replica.propose(op2);

      replica.decision(0 , op1).then(function(){
        done();
      });
    });


    it('reproposeOperation' , function(  ){
        var op1 = {id:1,client:1,op:'hello'}
        var op2 = {id:2,client:1,op:'hello2'}

        replica.proposals.set( 0 , new Set([op1]) )
        replica.lastEmpltySlotInProposals = 1
        replica.lastEmpltySlotInDecisions = 1
        replica.slot_num = 0

        replica.checkOperationsToRepropose(op2)
        replica.lastEmpltySlotInProposals.should.be.exactly(2)
        should.not.exists(replica.proposals.get(0))
        replica.proposals.get(1).values().next().value.id.should.be.exactly(1)
    });

    it('repropose same operation' , function( ){
        var op1 = {id:1,client:1,op:'hello'}

        replica.proposals.set(0 , new Set([op1]))
        replica.lastEmpltySlotInProposals = 1
        replica.lastEmpltySlotInDecisions = 1
        replica.slot_num = 0

        replica.checkOperationsToRepropose(op1)
        replica.lastEmpltySlotInProposals.should.be.exactly(1)
        replica.proposals.get(0).values().next().value.id.should.be.exactly(1)
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
  });
