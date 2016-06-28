"use strict"

var should = require('should');
var Commander = require('../lib/commander.js').Commander;
var Leader = require('../lib/leader.js').Leader;
var Ballot = require('../lib/ballot.js').Ballot;


describe('Tests Commander' , function() {

  var acceptors = new Map();
  acceptors.set('lyr', new Set());
  acceptors.set('anu', new Set());
  acceptors.set('balar', new Set());

  var network ={
    acceptors : acceptors,
    send : function () { },
    on : function(){}
  }

  let leader = {
    Network: network,
    Test: true,
    name: 'test'
  }
  let commander = undefined;

  beforeEach(function(){
        commander = new Commander(leader);
  });

  it('Constructor' , function( ){
    var operation = {
      client:{op:1, id:'127.0.0.1'},
      ballot:new Ballot( {number:1 , id:'127.0.0.2'} ),
      operation:'%$·'
    }
    commander.leader.Network.acceptors.size.should.be.exactly(3)
    commander.leader.Network.acceptors.should.equal(network.acceptors)
  })


  it('on sendP2A preempted operation with an existent slot',function(done){
    var params = {operation:{operation:'%$', slot:1}, ballot:new Ballot({id:'127.0.0.1',number:1})}

    commander.slots.set(params.operation.slot, {
      ballot: new Ballot({id:'127.0.0.1',number:2}),
      operation: params.operation,
      decided: false,
      acceptorsResponse:[],
      acceptors: network.acceptors
    })

    commander.on('preempted',function(ballot){
      ballot.id.should.be.exactly('127.0.0.1')
      ballot.number.should.be.exactly(2)
      done()
    })
    commander.sendP2A(params)
  })


  it('on sendP2A send message to acceptors', function(){
    var params = {operation:{operation:'%$', slot:1}, ballot:new Ballot({id:'127.0.0.1',number:1})}

    commander.sendP2A(params);
    commander.slots.get(params.operation.slot).ballot.id.should.be.exactly('127.0.0.1')
    commander.slots.get(params.operation.slot).ballot.number.should.be.exactly(1)
    commander.slotsDecided.has(params.operation.slot).should.be.false()
  })


  it('on receiveP2B receive a message with slot that not exists', function(){
    var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}

    commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
    commander.slots.get(params.slot).ballot.id.should.be.exactly('127.0.0.1')
    commander.slots.get(params.slot).ballot.number.should.be.exactly(1)
    commander.slotsDecided.has(params.slot).should.be.false()
  })


  it('on receiveP2B receive duplicate message from acceptor', function(){
    var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}

    commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
    commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})

    commander.slots.get(params.slot).ballot.id.should.be.exactly('127.0.0.1')
    commander.slots.get(params.slot).ballot.number.should.be.exactly(1)
    commander.slots.get(params.slot).acceptorsResponse.size.should.be.exactly(1)
    commander.slotsDecided.has(params.slot).should.be.false()
    commander.slots.size.should.be.exactly(1)
  })


    it('on receiveP2B add new acceptor to received', function(){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}

      commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})

      commander.slots.get(params.slot).acceptorsResponse.size.should.be.exactly(1)
      commander.slots.get(params.slot).acceptorsResponse.has('lyr').should.be.ok
    })


    it('on receiveP2B received mayority of acceptors', function(done){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}

      commander.on('decision', function(decision){
        decision.slot.should.be.exactly(1)
        decision.operation.should.be.exactly('%$')
        commander.slotsDecided.has(params.slot).should.be.true()
        done()
      });
      commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
      commander.receiveP2B({acceptor:'anu', ballot:params.ballot, slot:params.slot , operation:params.operation})
    });


    it('on receivedP2B received from unknown acceptor', function(){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}

      commander.receiveP2B({acceptor:'strange', ballot:params.ballot, slot:params.slot , operation:params.operation})
      commander.slots.should.not.have.property('strange')
    })


  it('on receivedP2B receive a greater ballot', function(done){
    var operation ={
      client:'127.0.0.1',
      client_op:1,
      ballot:new Ballot({number:1 , id:'127.0.0.2'} ),
      operation:'%$·'
    }
    var ballot = new Ballot({number:1 , id:'127.0.0.3'})
    commander.on('preempted' , function( ballotReceive ){
      ballotReceive.number.should.equal(2)
      ballotReceive.id.should.equal('127.0.0.4')
      done()
    });

    commander.receiveP2B({acceptor:'lyr', ballot:ballot, slot: 3 , operation:operation})
    commander.receiveP2B({acceptor:'balar', ballot:new Ballot({number:2,id:'127.0.0.4'}), slot: 3 , operation:operation})
  });
})
