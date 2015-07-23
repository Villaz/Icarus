var should = require('should')
var Ballot = require('../lib/ballot').Ballot
var Map = require('../lib/map').Map
var Scout = require('../lib/scout').Scout


describe('Tests Scout', function(){

  it('Constructor', function( ){
    var ballot = new Ballot({number:1, id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})

    should.exists(scout.ballot)
    scout.lastSlotReceived.should.be.exactly(1)
    scout.ballot.number.should.be.exactly(1)
    scout.ballot.id.should.be.exactly('127.0.0.1')
    scout.adopted.should.be.exactly(false)
  });


  it('start', function( ){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})

    var message = scout.start()
    message.type.should.be.exactly('P1A')
    message.body.leader.should.be.exactly('127.0.0.1')
    message.body.ballot.number.should.be.exactly(ballot.number)
    message.body.ballot.id.should.be.exactly(ballot.id)
    message.body.lastSlotReceived.should.be.exactly(1)
  });


  it('Process Preempted message', function(done){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var ballot2 = new Ballot({number:2 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' ]

    scout.on('preempted' , function( body ){
      body = body[0]
      body.ballot.number.should.be.exactly(2)
      body.ballot.id.should.be.exactly('127.0.0.1')
      done()
    });

    var message = {
      type:'P1B',
      body:{
        ballot:ballot2
      }
    }
    scout.process(message)
  });


  it('Process accepted message' , function( ){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' , '127.0.0.3' ]

    var message = {
      type:'P1B',
      body:{
        ballot:ballot,
        accepted:[
          {slot:1},{slot:2}
        ]
      }
    }
    scout.process(message)
    scout.pvalues.length.should.be.exactly(2)
    scout.slotsOfValues.length.should.be.exactly(2)
    scout.slotsOfValues.indexOf(1).should.be.exactly(0)
    scout.adopted.should.be.exactly(false)
  });


  it('Process accepted message and adopted', function(done){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' , '127.0.0.3' ]

    scout.on('adopted', function( body ){
      body = body[0]
      body.ballot.id.should.be.exactly(ballot.id)
      body.ballot.number.should.be.exactly(ballot.number)
      body.pvalues.count().should.be.exactly(2)
      scout.adopted.should.be.exactly(true)
      done()
    });

    var message1 ={
      type:'P1B',
      from:'127.0.0.2',
      body:{
        ballot:ballot,
        accepted:[
          {slot:1}
        ]
      }
    }

    var message2 = {
      type:'P1B',
      from:'127.0.0.3',
      body:{
        ballot:ballot,
        accepted:[
          {slot:2}
        ]
      }
    }
    scout.process(message1)
    scout.process(message2)
  });


  it('Process accepted message and adopted with 2 acceptors', function(done){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' ]

    scout.on('adopted', function( body ){
      body = body[0]
      body.ballot.id.should.be.exactly(ballot.id)
      body.ballot.number.should.be.exactly(ballot.number)
      body.pvalues.count().should.be.exactly(2)
      scout.adopted.should.be.exactly(true)
      done()
    });

    var message1 ={
      type:'P1B',
      from:'127.0.0.2',
      body:{
        ballot:ballot,
        accepted:[
          {slot:1}
        ]
      }
    }

    var message2 = {
      type:'P1B',
      from:'127.0.0.1',
      body:{
        ballot:ballot,
        accepted:[
          {slot:2}
        ]
      }
    }
    scout.process(message1)
    scout.process(message2)
  });


  it('if unknown acceptor sends message, should not process it' ,function(done){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' , '127.0.0.3' ]

    scout.on('adopted', function( body ){
      body.ballot.id.should.be.exactly(ballot.id)
      body.ballot.number.should.be.exactly(ballot.number)
      body.pvalues.length.should.be.exactly(2)
      scout.adopted.should.be.exactly(true)
      done('Fail')
    });

    var message1 ={
      type:'P1B',
      from:'127.0.0.2',
      body:{
        ballot:ballot,
        accepted:[
          {slot:1}
        ]
      }
    }
    var message2 ={
      type:'P1B',
      from:'127.0.0.4',
      body:{
        ballot:ballot,
        accepted:[
          {slot:2}
        ]
      }
    }

    scout.process(message1)
    scout.process(message2)
    setTimeout(done,1500)
  });


  it('Preempted if adopted is true', function( done ){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' ]
    scout.adopted = true
    scout.pvalues = [{slot:1},{slot:2}]

    scout.on('preempted', function( body ){
      body = body[0]
      body.ballot.number.should.be.exactly(1)
      body.ballot.id.should.be.exactly('127.0.0.1')
      body.pvalues.length.should.be.exactly(2)
      done()
    });

    var message ={
      type:'P1B',
      body:{
        ballot:ballot
      }
    }

    scout.process(message)
  });


  it('updateAcceptedValuesAndAcceptorsResponse',function(){
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' ]
    var message = {
      type:'P1B',
      from:'127.0.0.1',
      body:{
        ballot:ballot,
        accepted:[{slot:1},{slot:2}],
      }
    }

    scout.acceptorsResponsed.length.should.be.exactly(0)
    scout.updateAcceptedValuesAndAcceptorsResponse(message)
    scout.acceptorsResponsed.length.should.be.exactly(1)
    scout.pvalues.length.should.be.exactly(2)
    scout.slotsOfValues.length.should.be.exactly(2)
  });

  it('addAcceptedToPValues', function(){
    var accepted1 = [{slot:1},{slot:2},{slot:3}]
    var accepted2 = [{slot:2},{slot:3},{slot:4}]
    var ballot = new Ballot({number:1 , id:'127.0.0.1'})
    var scout = new Scout({ballot:ballot, lastSlotReceived:1})
    scout.addAcceptedToPValues(accepted1)
    scout.addAcceptedToPValues(accepted2)

    scout.pvalues.length.should.be.exactly(4)
    scout.pvalues[0].slot.should.be.exactly(1)
    scout.pvalues[1].slot.should.be.exactly(2)
    scout.pvalues[2].slot.should.be.exactly(3)
    scout.pvalues[3].slot.should.be.exactly(4)

  })
});
