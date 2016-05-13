var should = require('should');
var crc = require('crc');
var Leader = require('../lib/leader.js').Leader;
var Ballot = require('../lib/ballot.js').Ballot;
var map = require('../lib/map.js').InternalMap;

describe('Leader tests', function(){

    var network = {
        acceptors : { 'lyr': {}, 'anu': {}, 'balar': {} },
        sendToLeaders : function () { },
        sendToAcceptors : function () { }
    }

    var commander = {
      sendP2A : function(){ }
    };

    var leader = undefined

    beforeEach(function(){
        leader = new Leader({name:'test', test: true , network:network});
        leader.commander = commander;
        leader.spawnCommander = function(){}
    });

    it('Constructor' , function( ){
  		should.exists(leader.ballot)
  		should.exists(leader.proposals)
  		leader.active.should.be.exactly(false)
    });

    it('Propose value', function( ){
  		var slot = 1
  		var operation = {
  			client_id:'1',
  			operation_id:'1',
  			operation:"test"
      }
      leader.propose({slot:slot, operation:operation});
      leader.proposals.get(slot).should.be.exactly(operation);
    });

    it('Propose value to not empty slot' ,function( ){

  		var slot = 1
  		var operation1 = {
  			client_id:'1',
  			operation_id:'1',
  			operation:"test"
      }
  		var operation2 = {
  			client_id:'1',
  			operation_id:'2',
  			operation:"test"
      }
      leader.propose({slot:slot , operation:operation1})
      leader.propose({slot:slot , operation:operation2})
      leader.proposals.get(slot).should.be.exactly(operation1)
    });


    it('Adopted' , function( ){
  		var ballot = new Ballot({number:1, id:'localhost'})
  		var slot = 1
  		var operation = {
  			client_id:'1',
  			operation_id:'1',
  			operation:"test"
      }
      var pvals = new map()
  		var pvalsSlot = new map()

      leader.propose({slot:slot, operation:operation})
      leader.adopted({ballot:ballot, pvalues:pvals, pvaluesSlot:pvalsSlot})
      leader.proposals.get(slot).should.be.exactly(operation)
    });

    it('Adopted duplicated' , function( ){
  		var ballot = new Ballot({number:1, id:'localhost'})
  		var slot = 1
  		var operation = {
  			client_id:'1',
  			operation_id:'1',
  			operation:"test"
      }
  		var operation2 = {
  			client_id:'1',
  			operation_id:'1',
  			operation:"test2"
      }

  		pvals = new map()
  		pvalsSlot = new map()

  		pvals.set(1 , operation);
  		pvalsSlot.set(crc.crc32(JSON.stringify(operation)) , 1);

      leader.propose({slot:slot,operation:operation2})
      leader.adopted({ballot:ballot, pvalues:pvals, pvaluesSlot:pvalsSlot})
      leader.proposals.get(1).should.be.exactly(operation)
      leader.proposals.size.should.be.exactly(1)
    });


    it('Adopted Duplicated Operation diferent Slot' , function( ){
  		var ballot = new Ballot({number:1, id:'localhost'})
  		var slot = 1
  		var operation = {
  			client_id:'1',
  			operation_id:'1'
      }
  		var operation2 = {
  			client_id:'1',
  			operation_id:'1'
      }

  		var pvals = new map()
  		var pvalsSlot = new map()

  		pvals.set(2 , operation)
  		pvalsSlot.set(crc.crc32(JSON.stringify(operation)) , 2)

      leader.propose({slot:slot, operation:operation2})
      leader.adopted({ballot:ballot, pvalues:pvals, pvaluesSlot:pvalsSlot})

      //should.not.exists(leader.proposals.get(1))
      leader.proposals.get(2).should.be.exactly(operation)
      leader.proposals.size.should.be.exactly(2)
  	});

    it('Preempted', function(){
      var ballot = new Ballot({number:1,id:'localhostTest'})
  		var slot = 1
  		var operation = {
  			client_id:'1',
  			operation_id:'1'
      }

      leader.preempted({ballot:ballot, slot:slot, operation:operation})
      leader.active.should.be.exactly(false)
      leader.ballot.number.should.be.exactly(2)
      leader.actualLeader.should.be.exactly('localhostTest')
    });
});
