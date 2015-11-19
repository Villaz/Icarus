var should = require('should');
var Commander = require('../lib/commander.js').Commander;
var Ballot = require('../lib/ballot.js').Ballot;


describe('Tests Commander' , function() {

  var network ={
    acceptors :['lyr','anu','balar'],
    sendToAcceptors : function () { },
    on : function(){}
    }

  it('Constructor' , function( ){
    var operation = {
      client:{op:1, id:'127.0.0.1'},
      ballot:new Ballot( {number:1 , id:'127.0.0.2'} ),
      operation:'%$·'
    }

    var commander = new Commander ({network:network})
    commander.network.acceptors.length.should.be.exactly(3)
    commander.network.acceptors.should.equal(network.acceptors)
  })


  it('on sendP2A preempted operation with an existent slot',function(done){
    var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
    var commander = new Commander ({network:network})

    commander.slots[params.slot] = {
      ballot: new Ballot({id:'127.0.0.1',number:2}),
      operation: params.operation,
      decided: false,
      acceptorsResponse:[],
      acceptors: network.acceptors
    }

    commander.on('preempted',function(ballot){
      ballot = ballot[0]
      ballot.id.should.be.exactly('127.0.0.1')
      ballot.number.should.be.exactly(2)
      done()
    })
    commander.sendP2A(params)
  })


  it('on sendP2A send message to acceptors', function(){
    var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
    var commander = new Commander ({network:network})
    commander.sendP2A(params)

    commander.slots[params.slot].ballot.id.should.be.exactly('127.0.0.1')
    commander.slots[params.slot].ballot.number.should.be.exactly(1)
    commander.slots[params.slot].decided.should.be.not.ok
  })


  it('on receiveP2B receive a message with slot that not exists', function(){
    var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
    var commander = new Commander ({network:network})
    commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
    commander.slots[params.slot].ballot.id.should.be.exactly('127.0.0.1')
    commander.slots[params.slot].ballot.number.should.be.exactly(1)
    commander.slots[params.slot].decided.should.be.not.ok
  })


  it('on receiveP2B receive duplicate message from acceptor', function(){
    var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
    var commander = new Commander ({network:network})
    commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
    commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})

    commander.slots[params.slot].ballot.id.should.be.exactly('127.0.0.1')
    commander.slots[params.slot].ballot.number.should.be.exactly(1)
    commander.slots[params.slot].decided.should.be.not.ok
    Object.keys(commander.slots).length.should.be.exactly(1)
  })


    it('on receiveP2B add new acceptor to received', function(){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
      var commander = new Commander ({network:network})
      commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})

      commander.slots[params.slot].acceptorsResponse.length.should.be.exactly(1)
      commander.slots[params.slot].acceptorsResponse[0].should.be.exactly('lyr')
    })


    it('on receiveP2B received mayority of acceptors', function(done){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
      var commander = new Commander ({network:network})

      commander.on('decision', function(decision){
        decision = decision[0]
        decision.slot.should.be.exactly(1)
        decision.operation.should.be.exactly('%$')
        done()
      })

      commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
      commander.receiveP2B({acceptor:'anu', ballot:params.ballot, slot:params.slot , operation:params.operation})
    })


    it('on receivedP2B received from unknown acceptor', function(){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:1})}
      var commander = new Commander ({network:network})
      commander.receiveP2B({acceptor:'strange', ballot:params.ballot, slot:params.slot , operation:params.operation})
      commander.slots.should.not.have.property('strange')
    })

    it('on receivedP2B received accepted slot', function(){
      var params = {slot:1, operation:'%$', ballot:new Ballot({id:'127.0.0.1',number:2})}
      var commander = new Commander ({network:network})

      commander.slots[params.slot] = {
        ballot: new Ballot({id:'127.0.0.1',number:2}),
        operation: params.operation,
        decided: true,
        acceptorsResponse:[],
        acceptors: network.acceptors
      }

      commander.receiveP2B({acceptor:'lyr', ballot:params.ballot, slot:params.slot , operation:params.operation})
      commander.slots[params.slot].decided.should.be.ok

    })


  it('on receivedP2B receive a greater ballot', function(done){
    var commander = new Commander({network:network})
    var operation ={
      client:'127.0.0.1',
      client_op:1,
      ballot:new Ballot({number:1 , id:'127.0.0.2'} ),
      operation:'%$·'
    }
    var ballot = new Ballot({number:1 , id:'127.0.0.3'})
    commander.on('preempted' , function( ballotReceive ){
      ballotReceive[0].number.should.equal(2)
      ballotReceive[0].id.should.equal('127.0.0.4')
      done()
    })

    commander.receiveP2B({acceptor:'lyr', ballot:ballot, slot: 3 , operation:operation})
    commander.receiveP2B({acceptor:'balar', ballot:new Ballot({number:2,id:'127.0.0.4'}), slot: 3 , operation:operation})

  })
})
