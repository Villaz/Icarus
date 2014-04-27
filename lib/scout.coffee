Scout = exports? and exports or @Scout = {}

Q = require 'q'
Map = require './map'
Ballot = require('./ballot').Ballot

{EventEmitter} = require 'events'

class Scout.Scout extends EventEmitter

  acceptorsResponsed : undefined
  pvalues : undefined
  slotsOfValues : undefined

  adopted : false

  constructor:( @ballot , @lastSlotReceived , @acceptors ) ->
    @slotsOfValues = []
    @pvalues = []
    @acceptorsResponsed = []

  start:( )->
    body =
      leader : @ballot.id,
      ballot: @ballot,
      lastSlotReceived : @lastSlotReceived,
    @emit 'P1A' , body


  process:( message ) =>
    if message.type is 'P1B'
      ballot = message.body.ballot

    if @ballot.isEqual( ballot ) and not @adopted
      @_updateAcceptedValuesAndAcceptorsResponse message
      @_ifResponseMayorOfAcceptorsSendAdopted()
    else
      @_sendPreemptedMessage message.body.ballot


  _updateAcceptedValuesAndAcceptorsResponse:( msg ) =>
    @_addAcceptedToPValues msg.body.accepted
    @acceptorsResponsed.push msg.from if @acceptorsResponsed.indexOf(msg.from) < 0 and msg.from in @acceptors


  _addAcceptedToPValues: ( accepted ) ->
    for accept in accepted when @slotsOfValues.indexOf(accept.slot) < 0
      @pvalues.push accept
      @slotsOfValues.push accept.slot


  _ifResponseMayorOfAcceptorsSendAdopted:( ) =>
    if @acceptorsResponsed.length >= Math.round(( @acceptors.length ) / 2)
      @adopted = true
      @acceptorsResponsed = []

      body =
        ballot: @ballot,
        pvalues: @pvalues

      this.emit 'adopted' , body


  _sendPreemptedMessage: ( ballot ) =>
    body =
      ballot: ballot
      pvalues: @pvalues

    this.emit 'preempted' , body