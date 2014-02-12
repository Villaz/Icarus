Network = exports? and exports or @Network = {}


zmq 	 = require 'zmq'
Discover = require('./discover').Discover
Ballot 	 = require('./ballot').Ballot
MetricServer = require('./metrics/metricServer').MetricServer


{EventEmitter} = require 'events'

class Network.Network extends EventEmitter

	socketPub  : undefined
	socketSubs : []

	metricServer = undefined

	replicas = new Array()
	leaders = new Array()
	acceptors = new Array()
	
	constructor:( port = 9999 ) ->

		@metricServer = new MetricServer(3100)
		@socketPub = zmq.socket 'pub'
		@socketPub.identity = "publisher#{process.pid}"
		try
			@socketPub.bindSync("tcp://*:#{port}")
		catch e
			console.log e
			throw new Error(e)
		

	close:( ) ->
		
		do @socketPub?.close
		do socket.close for socket in @socketSubs
		
	startClient:( url ) ->
		

	send:( message ) ->
		@socketPub.send "#{message.type} #{JSON.stringify message}"
		@metricServer.addMetric message.type
	
	upNode:( service ) ->
		if not socketSubs[service.address]?
			@socketSubs[service.address] = @startClient "tcp://#{service.address}:#{service.data.ATL}"


	downNode:( service ) ->
		@socketSubs[service.address]?.close()

class Network.AcceptorNetwork extends Network.Network 

	recuperationSubs : undefined

	constructor:( port = 9999 ) ->
		super( port )
		@recuperationSubs = new Array()

	close:( ) ->
		super( )
		if not @recuperationSubs?
			do socket.close for socket in @recuperationSubs

	_startClient:( url ) ->
		socket = zmq.socket 'sub'
		socket.identity = "subscriber#{@socketSubs.length}#{process.pid}"
		socket.subscribe 'P1A'
		socket.subscribe 'P2A'
		
		socket.connect url
		socket.on 'message' , ( data ) =>

			type = data.toString().substr 0 , data.toString().indexOf("{")-1
			data = data.toString().substr data.toString().indexOf("{")
			
			message =
				"type":type,
				"body":JSON.parse data
			
			@metricServer.addMetric type
			
			ballot = new Ballot(message.body.ballot.number,message.body.ballot.id)
			message.body.ballot = ballot
			@emit 'message' , message

		return socket

	upNode:( service ) ->
		if (service.data.roles.indexOf('A') isnt -1 ) and ( not @recuperationSubs[service.address]? ) and ( service.data.ATA? )
			@recuperationSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.ATA}"

		if (service.data.roles.indexOf('L') isnt -1) and ( not @socketSubs[service.address]? ) and ( service.data.LTA? )
			@socketSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.LTA}"		