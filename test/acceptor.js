"use strict";

var should = require('should');
var Acceptor = require('../lib/acceptor.js').Acceptor;
var RecAcceptor = require('../lib/acceptor.js').RecAcceptor;
var Ballot = require('../lib/ballot.js').Ballot;

describe('Acceptor tests', function(){

    var network = {
        acceptors : new Map(),
        sendToLeaders : function () { },
        sendToAcceptors : function () { }
    }


    var acceptor = undefined
    var recAcceptor = undefined;

    beforeEach(function(){
        acceptor = new Acceptor({name:'test', test: true })
        recAcceptor = new RecAcceptor(acceptor,true);
        network.acceptors = new Map();
        network.acceptors.set('lyr', []);
        network.acceptors.set('anu', []);
        network.acceptors.set('balar', []);
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
      var value1 = acceptor.mapOfValues.get(1)
      var value2 = acceptor.mapOfValues.get(2)
      value1.should.be.exactly("hola")
      value2.should.be.exactly("hola2")
  })

  it('Process equals P2A operations', function(){
    var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
    acceptor.processP2A(value)
    acceptor.processP2A(value)
    var value1 = acceptor.mapOfValues.get(1)
    value1.should.be.exactly("hola")
    acceptor.mapOfValues.size.should.be.exactly(1)
  })

    it('clear', function(){
      var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
      acceptor.processP2A(value)
      acceptor.actualBallot.number.should.be.exactly(1)
      acceptor.mapOfValues.size.should.be.exactly(1)
      acceptor.clear()
      acceptor.actualBallot.number.should.be.exactly(-1)
      acceptor.mapOfValues.size.should.be.exactly(0)
    })

    it('sendRecuperationMessage from 0 with no end', ()=>{
      let message = recAcceptor.sendRecuperationMessage(8888);
      message.operation.port.should.be.exactly(8888);
      for( let acceptor in message.operation.intervals){
          let interval = message.operation.intervals[acceptor]
          interval.begin.should.be.oneOf(0, NaN);
      }
    });

    it('sendRecuperationMessage with operations with begin no end', ()=>{
      let message = recAcceptor.sendRecuperationMessage(8888, 10);
      message.operation.port.should.be.exactly(8888);
      for( let acceptor in message.operation.intervals){
          let interval = message.operation.intervals[acceptor]
          interval.begin.should.be.oneOf(10, NaN);
      }
    });

    it('sendRecuperationMessage with operations no begin, with end', ()=>{
      let message = recAcceptor.sendRecuperationMessage(8888, 0, 10);
      message.operation.port.should.be.exactly(8888);
      for( let acceptor in message.operation.intervals){
          let interval = message.operation.intervals[acceptor]
          interval.begin.should.be.oneOf(0, 3, 4, 7, 8, 10);
      }
    });

    it('sendACKRecuperationMessage with no intervals, no operations', () =>{
      let message = recAcceptor.sendACKRecuperationMessage('balar', {port:5555, intervals:{test:{begin:0, to:NaN}}});
      message.operation.ballot.number.should.be.exactly(-1);
      message.operation.values.should.be.empty();
    });

    it('sendACKRecuperationMessage with no intervals, with operations', () =>{
      var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
      acceptor.processP2A(value)
      let message = recAcceptor.sendACKRecuperationMessage('balar', {port:5555, intervals:{test:{begin:0, to:NaN}}});

      message.operation.ballot.number.should.be.exactly(1);
      message.operation.values.should.not.be.empty();
      message.operation.values.should.containEql({slot:1, operation:"hola"});
    });


    it('sendACKRecuperationMessage with intervals, with operations', () =>{
      var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
      acceptor.processP2A(value)
      let message = recAcceptor.sendACKRecuperationMessage('balar', {port:5555, intervals:{test:{begin:2, to:NaN}}});
      message.operation.ballot.number.should.be.exactly(1);
      message.operation.values.should.be.empty();
    });

    it('sendACKRecuperationMessage with intervals, with operations', () =>{
      var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
      var value2 = {slot:2,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola2"}
      var value3 = {slot:3,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola3"}
      acceptor.processP2A(value)
      acceptor.processP2A(value2)
      acceptor.processP2A(value3)
      let message = recAcceptor.sendACKRecuperationMessage('balar', {port:5555, intervals:{test:{begin:1, to:NaN}}});
      message.operation.ballot.number.should.be.exactly(1);
      message.operation.values.should.be.containEql({slot:1, operation:"hola"},{slot:2, operation:"hola2"},{slot:3, operation:"hola3"});
    });

    it('sendACKRecuperationMessage with intervals, with operations 2', () =>{
      var value = {slot:1,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola"}
      var value2 = {slot:2,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola2"}
      var value3 = {slot:3,ballot:new Ballot({number:1, id:"localhost"}),operation:"hola3"}
      acceptor.processP2A(value)
      acceptor.processP2A(value2)
      acceptor.processP2A(value3)

      let message = recAcceptor.sendACKRecuperationMessage('balar', {port:5555, intervals:{test:{begin:1, to:2}}});
      message.operation.ballot.number.should.be.exactly(1);
      message.operation.values.should.be.containEql({slot:1, operation:"hola"},{slot:2, operation:"hola2"});
    });

    it('Process recuperation with all acceptors responsed', ()=>{
      var operation = {ballot:new Ballot({number:1, id:"localhost"}),values:[{slot:1,operation:'hola'},{slot:2,operation:'hola2'}]};
      var message = {from: "balar",
                     to: `tcp://1.1.1.1:9999`,
                    type: 'RECACK',
                    command_id: 0,
                    operation: operation
                  };
      recAcceptor.received_acceptors = ['lyr','anu'];
      recAcceptor.sended_acceptors = ['lyr', 'anu', 'balar'];
      recAcceptor.processRecuperation(message);
      acceptor.actualBallot.number.should.be.exactly(1)
      acceptor.mapOfValues.size.should.be.exactly(2)

    });

    it('Process recuperation with all acceptors responsed', (done)=>{
      var operation = {ballot:new Ballot({number:1, id:"localhost"}),values:[{slot:1,operation:'hola'},{slot:2,operation:'hola2'}]};
      var message = {from: "balar",
                     to: `tcp://1.1.1.1:9999`,
                    type: 'RECACK',
                    command_id: 0,
                    operation: operation
                  };
      recAcceptor.received_acceptors = ['lyr'];
      recAcceptor.sended_acceptors = ['lyr', 'anu', 'balar'];
      acceptor.active.should.be.exactly(false);
      recAcceptor.processRecuperation(message);

      setTimeout(()=>{
        acceptor.actualBallot.number.should.be.exactly(1)
        acceptor.mapOfValues.size.should.be.exactly(2)
        recAcceptor.pending_messages.length.should.be.exactly(0);
        recAcceptor.recived_rec.should.be.exactly(true);
        acceptor.active.should.be.exactly(false);
        done();
      }, 1000);
    });

})
