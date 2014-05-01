should = require 'should'
Q = require 'q'
Ballot = require('../lib/ballot.coffee').Ballot
Map = require('../lib/map.coffee').Map

#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
  Commander = require('../lib-cov/commander.js').Commander
else
  Commander = require('../lib/commander.coffee').Commander

describe 'Tests Commander' , ->

  check = (done,f) ->
    try
      f()
      done()
    catch e
      done(e)

  timeout = ( time , done ) -> setTimeout( done , time )


  it 'Constructor' , ( ) ->
    acceptors = ['lyr','anu','balar']
    operation =
      client:'127.0.0.1',
      client_op:1,
      ballot:new Ballot( 1 , '127.0.0.2' ),
      operation:'%$·'

    commander = new Commander acceptors , 1 , operation
    commander.acceptors.length.should.be.exactly 3
    commander.acceptors.should.equal acceptors
    should.exists commander.operation
    commander.ballot.id.should.be.exactly '127.0.0.2'
    commander.ballot.number.should.be.exactly 1
    commander.operation.client.should.be.exactly '127.0.0.1'


  it 'Receive P2B with different ballot' , ( done ) ->
    acceptors = ['lyr','anu','balar']
    ballot = new Ballot 3 , '127.0.0.3'
    operation =
      client:'127.0.0.1',
      client_op:1,
      ballot:new Ballot( 1 , '127.0.0.2' ),
      operation:'%$·'

    commander = new Commander acceptors , 1 , operation
    commander.on 'preempted' , ( ballotReceive ) =>
      ballotReceive.should.equal ballot
      do done

    commander.receiveP2B 'lyr' , ballot


  it 'Receive P2B with different ballot and unknown acceptor' , ( done ) ->
    acceptors = ['lyr','anu','balar']
    ballot = new Ballot 3 , '127.0.0.3'
    operation =
      client:'127.0.0.1',
      client_op:1,
      ballot:new Ballot( 1 , '127.0.0.2' ),
      operation:'%$·'

    commander = new Commander acceptors , 1 , operation
    commander.on 'preempted' , ( ballotReceive ) =>
      done 'Fatal'

    commander.receiveP2B 'mel' , ballot
    timeout 1500 , ( ) ->
      do done


  it 'Send decision' , ( done ) ->
    acceptors = ['lyr','anu','balar']
    ballot = new Ballot 1 , '127.0.0.2'
    operation =
      client:'127.0.0.1',
      client_op:1,
      ballot:new Ballot( 1 , '127.0.0.2' ),
      operation:'%$·'

    commander = new Commander acceptors , 1 , operation
    commander.on 'decision' , ( operation ) =>
      operation.slot.should.be.exactly 1
      operation.operation.operation.should.be.exactly '%$·'
      do done

    commander.receiveP2B 'lyr' , ballot
    commander.receiveP2B 'balar' , ballot