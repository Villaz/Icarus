Acceptor = exports? and exports or @Acceptor = {}

Q = require 'q'
Ballot = require('./ballot').Ballot
Map = require './map'
Network = require('./network')

class Acceptor.Acceptor

	id 				: "localhost"
	actualBallot 	: undefined
	mapOfValues 	: undefined
	network 		: undefined
	
	constructor:( ) ->
		@actualBallot = new Ballot()
		@mapOfValues = new Map.Map("acceptor")
		@network = new Network.AcceptorNetwork( )
		@network.on 'message' , @processRequests
	
	clear: ( ) ->
		@actualBallot = new Ballot()
		do @mapOfValues?.clear

	processRequests:( message ) =>
		switch message.type
			when 'P1A' then @processP1A message.body.ballot , message.body.leader
			when 'P2A' then @processP2A message.body


	processP1A:( ballot , to )->
		ballot = new Ballot  ballot.number , ballot.id 
		if ballot.isMayorThanOtherBallot @actualBallot
			@actualBallot = ballot
		@sendP1B @id , to

	
	sendP1B:( from , to ) ->
		send = ( values ) =>
			message =
				type: 'P1B',
				acceptor: @id,
				ballot : @actualBallot,
				values : values
			@network.send message

		@mapOfValues.getValues( from , to ).then send 


	processP2A:( value ) ->
		ballot = new Ballot value.ballot.number , value.ballot.id
		
		if ballot.isMayorOrEqualThanOtherBallot @actualBallot
			@actualBallot = ballot
			@mapOfValues.addValue value.slot , value.operation

		do @sendP2B


	sendP2B:( value )->
		message =
			type: 'P2B'
			acceptor: @id
			ballot: @actualBallot

		@network.send message