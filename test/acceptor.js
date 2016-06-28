"use strict";

var should = require('should');
var Acceptor = require('../lib/acceptor.js').Acceptor;
var RecAcceptor = require('../lib/acceptor.js').RecAcceptor;
var Ballot = require('../lib/ballot.js').Ballot;

describe('Acceptor tests', function(){

    var network = {
        acceptors : new Map(),
        send : function () { },
        on: function() {}
    }

    var replica = {
      Network: network,
      Test: true,
      Decisions: new Map(),
      Id: 'test'
    }

    var acceptor = undefined

    beforeEach(function(){
        replica.Decisions.clear();
        acceptor = new Acceptor(replica);
        network.acceptors = new Map();
        network.acceptors.set('lyr', []);
        network.acceptors.set('anu', []);
        network.acceptors.set('balar', []);
        acceptor.network = network
    })

  	it('constructor', function(){
  		acceptor.actualBallot.number.should.be.exactly(-1);
  		should.not.exists(acceptor.actualBallot.id);
  		should.exists(acceptor.replica);
    })

  	it('processP1A' , function(){

  		var ballot = new Ballot({number:1, id:"localhost"})
  		acceptor.processP1A(ballot)
  		acceptor.actualBallot.number.should.be.exactly(1)
  		acceptor.actualBallot.id.should.be.exactly("localhost")

  		ballot = new Ballot({number:1, id:"local"})
  		acceptor.processP1A(ballot)
  		acceptor.actualBallot.number.should.be.exactly(1)
  		acceptor.actualBallot.id.should.be.exactly("localhost")

  		ballot = new Ballot({number:2 , id:"localhost"})
  		acceptor.processP1A(ballot)
  		acceptor.actualBallot.number.should.be.exactly(2)
  		acceptor.actualBallot.id.should.be.exactly("localhost")
    })


  	it('processP2A',function( ){
  		var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
  		acceptor.processP2A(value)

  		value.slot = 2
  		value.operation = "hola2"
  		acceptor.processP2A(value)
      var value1 = acceptor.replica.Decisions.get(1)
      var value2 = acceptor.replica.Decisions.get(2)
      value1.should.be.exactly("hola")
      value2.should.be.exactly("hola2")
  });

  it('Process equals P2A operations', function(){
    var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:{operation:"hola", client:1, operation_id:1} }
    acceptor.processP2A(value)
    acceptor.processP2A(value)
    var value1 = acceptor.replica.Decisions.get(1)
    value1.operation.should.be.exactly("hola")
    acceptor.replica.Decisions.size.should.be.exactly(1)
  });
});
