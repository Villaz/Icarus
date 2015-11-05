var should = require('should');
var Acceptor = require('../lib/acceptor.js').Acceptor;
var Ballot = require('../lib/ballot.js').Ballot;

describe('Acceptor tests', function(){
    
    var network = {
        acceptors : { 'lyr': {}, 'anu': {}, 'balar': {} },
        sendToLeaders : function () { },
        sendToAcceptors : function () { }
    }
    var acceptor = undefined

    beforeEach(function(){
        acceptor = new Acceptor({name:'test', test: true })
        acceptor.network = network
    })

  	it('constructor', function(){
  		acceptor.actualBallot.number.should.be.exactly(-1)
  		should.not.exists(acceptor.actualBallot.id)
  		should.exists(acceptor.mapOfValues)
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
      var value1 = acceptor.mapOfValues.getValue(1)
      var value2 = acceptor.mapOfValues.getValue(2)
      value1.should.be.exactly("hola")
      value2.should.be.exactly("hola2")
  })

  it('Process equals P2A operations', function(){
    var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
    acceptor.processP2A(value)
    acceptor.processP2A(value)
    var value1 = acceptor.mapOfValues.getValue(1)
    value1.should.be.exactly("hola")
    acceptor.mapOfValues.count().should.be.exactly(1)
  })

    it('clear', function(){
      var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
      acceptor.processP2A(value)
      acceptor.actualBallot.number.should.be.exactly(1)
      acceptor.mapOfValues.count().should.be.exactly(1)
      acceptor.clear()
      acceptor.actualBallot.number.should.be.exactly(-1)
      acceptor.mapOfValues.count().should.be.exactly(0)
    })
})
