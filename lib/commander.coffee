Commander = exports? and exports or @Commander = {}

Q = require 'q'
Map = require './map'
Ballot = require('./ballot').Ballot

{EventEmitter} = require 'events'
class Commander.Commander extends EventEmitter

  acceptorsResponse : undefined
  ballot : undefined
  decided: false

  constructor:(@acceptors , @slot , @operation ) ->
    @acceptorsResponse = []
    @ballot = @operation.ballot

  receiveP2B:( acceptor , ballot )->
    return if acceptor not in @acceptors or @decided
    if @ballot.isEqual( ballot )
      @acceptorsResponse.push acceptor if acceptor not in @acceptorsResponse
      if @acceptorsResponse.length >= Math.round(( @acceptors.length ) / 2)
        @decided = true
        @emit 'decision' , {slot:@slot , operation:@operation}
    else
      @decidided = true
      @emit 'preempted' , ballot

