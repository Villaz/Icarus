should = require 'should'
Q = require 'q'
Ballot = require('../lib/ballot.coffee').Ballot
Map = require('../lib/map.coffee').Map

#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
  Scout = require('../lib-cov/scout.js').Scout
else
  Scout = require('../lib/scout.coffee').Scout

describe 'Tests Scout' , ->

  check = (done,f) ->
    try
      f()
      done()
    catch e
      done(e)

  timeout = ( time , done ) -> setTimeout( done , time )

  it 'Constructor' , ( ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    scout = new Scout ballot , 1 
    
    should.exists scout.ballot
    scout.lastSlotReceived.should.be.exactly 1
    scout.ballot.number.should.be.exactly 1
    scout.ballot.id.should.be.exactly '127.0.0.1'
    scout.adopted.should.be.exactly false


  it 'start' , ( ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    scout = new Scout  ballot , 1 
    
    message = do scout.start
    message.type.should.be.exactly 'P1A'
    message.body.leader.should.be.exactly '127.0.0.1'
    message.body.ballot.number.should.be.exactly ballot.number
    message.body.ballot.id.should.be.exactly ballot.id
    message.body.lastSlotReceived.should.be.exactly 1
        


  it 'Process Preempted message' , ( done ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    ballot2 = new Ballot 2, '127.0.0.1'
    scout = new Scout ballot , 1 
    
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' ] 

    scout.on 'preempted' , ( body ) =>
      body.ballot.number.should.be.exactly 2
      body.ballot.id.should.be.exactly '127.0.0.1'
      done()

    message =
      type:'P1B',
      body:
        ballot:ballot2

    scout.process message


  it 'Process accepted message' , (  ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    scout = new Scout ballot , 1 
    
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' , '127.0.0.3' ]
    
    message =
      type:'P1B',
      body:
        ballot:ballot,
        accepted:[
          {slot:1},{slot:2}
        ]

    scout.process message
    scout.pvalues.length.should.be.exactly 2
    scout.slotsOfValues.length.should.be.exactly 2
    scout.slotsOfValues.indexOf(1).should.be.exactly 0
    scout.adopted.should.be.exactly false


  it 'Process accepted message and adopted' , ( done ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    scout = new Scout ballot , 1 
    
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' , '127.0.0.3' ]

    scout.on 'adopted', ( body )=>
      body.ballot.id.should.be.exactly ballot.id
      body.ballot.number.should.be.exactly ballot.number
      body.pvalues.length.should.be.exactly 2
      scout.adopted.should.be.exactly true
      done()

    message1 =
      type:'P1B',
      from:'127.0.0.2',
      body:
        ballot:ballot,
        accepted:[
          {slot:1}
        ]
    message2 =
      type:'P1B',
      from:'127.0.0.3',
      body:
        ballot:ballot,
        accepted:[
          {slot:2}
        ]

    scout.process message1
    scout.process message2


  it 'if unknown acceptor sends message, should not process it' , ( done ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    scout = new Scout ballot , 1
    
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' , '127.0.0.3' ]
    
    scout.on 'adopted', ( body )=>
      body.ballot.id.should.be.exactly ballot.id
      body.ballot.number.should.be.exactly ballot.number
      body.pvalues.length.should.be.exactly 2
      scout.adopted.should.be.exactly true
      done('Fail')

    message1 =
      type:'P1B',
      from:'127.0.0.2',
      body:
        ballot:ballot,
        accepted:[
          {slot:1}
        ]
    message2 =
      type:'P1B',
      from:'127.0.0.4',
      body:
        ballot:ballot,
        accepted:[
          {slot:2}
        ]

    scout.process message1
    scout.process message2
    timeout 1500 , done()


  it 'Preempted if adopted is true' , ( done ) ->
    ballot = new Ballot 1 , '127.0.0.1'
    scout = new Scout ballot , 1 
    
    scout.acceptors = [ '127.0.0.1', '127.0.0.2' ]
    scout.adopted = true
    scout.pvalues = [{slot:1},{slot:2}]
    
    scout.on 'preempted' , ( body ) =>
      body.ballot.number.should.be.exactly 1
      body.ballot.id.should.be.exactly '127.0.0.1'
      body.pvalues.length.should.be.exactly 2
      done()

    message =
      type:'P1B',
      body:
        ballot:ballot

    scout.process message