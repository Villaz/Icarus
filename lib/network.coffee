Network = exports? and exports or @Network = {}


zmq 	 = require 'zmq'
Discover = require('./discover').Discover
Ballot 	 = require('./ballot').Ballot
MetricServer = require('./metrics/metricServer').MetricServer


{EventEmitter} = require 'events'

class Network.Network extends EventEmitter

	ip : undefined

	socketPub  : undefined
	socketSubs : []
	
	metricServer = undefined

	replicas : []
	acceptors : []
	
	constructor:( port = 9999 ) ->
		#@metricServer = new MetricServer 3100
		@socketPub = zmq.socket 'pub'
		@socketPub.identity = "publisher#{process.pid}"
		@ip = do @_getIP
		try
			@socketPub.bindSync("tcp://*:#{port}")
		catch e
			console.log e
			throw new Error(e.message)
		
	close:( ) ->
		try
			do @socketPub?.close
			do socket.close for socket in @socketSubs
		catch e
			#console.log e
		

	send:( message ) ->
		@socketPub.send "#{message.type} #{JSON.stringify message}"
		@metricServer?.addMetric message.type
	

	upNode:( service ) ->
		if not socketSubs[service.address]?
			@socketSubs[service.address] = @startClient "tcp://#{service.address}:#{service.data.ATL}"


	downNode:( service ) ->
		@socketSubs[service.address]?.close()


	_getIP:( ) ->
		os = require 'os'
		ifaces = do os.networkInterfaces
	
		for dev , addresses of ifaces 
			for address in addresses when address.family is 'IPv4' and address.internal is false
				return address.address



class Network.AcceptorNetwork extends Network.Network 

	recuperationSubs : undefined

	constructor:( port = 9998 ) ->
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
			data = JSON.parse data
			message =
				"type":type,
				"body":data.body
			
			@metricServer?.addMetric type
			
			ballot = new Ballot(message.body.ballot.number,message.body.ballot.id)
			message.body.ballot = ballot
			@emit 'message' , message

		return socket

	upNode:( service ) =>
		if (service.data.roles.indexOf('A') isnt -1 ) and ( not @recuperationSubs[service.address]? ) and ( service.data.ATA? )
			@recuperationSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.ATA}"

		if (service.data.roles.indexOf('R') isnt -1) and ( not @socketSubs[service.address]? ) and ( service.data.RTA? )
			@socketSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.RTA}"		


class Network.ReplicaNetwork extends Network.Network

	clientSockets : undefined
	pendingMessagesToAcceptors : undefined

	constructor:( port = 8000 , portClient = 8181 )->
		super( port )
		@clientSockets = {}
		@server = zmq.socket( 'router' )
		@server.identity = "replicaServer#{process.pid}"
		@server.bindSync("tcp://*:#{portClient}")
		@server.on 'message' , @processMessage
		@pendingMessagesToAcceptors = []
		setInterval @_checkPending , 2000


	close:( ) ->
		super()
		@server.close

	processMessage:( envelope , black , data ) =>
		data = JSON.parse data.toString()
		@clientSockets[data.ip] = envelope
		data.type = 'propose'
		@emit 'message' , data
		

	response:(client, data) ->
		@server.send [ @clientSockets[client] , '' , data ]
	

	_startClient:( url ) ->
		socket = zmq.socket 'sub'
		socket.identity = "subscriber#{@socketSubs.length}#{process.pid}"
		socket.subscribe 'P1B'
		socket.subscribe 'P2B'
		socket.connect url

		socket.on 'message' ,( data ) =>
			type = data.toString().substr 0 , data.toString().indexOf("{")-1
			data = data.toString().substr data.toString().indexOf("{")
			
			message =
				"type":type,
				"body":JSON.parse data

			@emit 'message' , message
		return socket

	_checkPending:( ) =>
		if @pendingMessagesToAcceptors.length > 0 and Object.keys(@socketSubs).length > 0
			for message in @pendingMessagesToAcceptors
				@sendMessageToAllAcceptors message
				@pendingMessagesToAcceptors.splice(@pendingMessagesToAcceptors.indexOf(message),1)


	sendMessageToAllAcceptors:( message )->
		if Object.keys(@socketSubs).length is 0
			@pendingMessagesToAcceptors.push message
		else
			@socketPub.send "#{message.type} #{JSON.stringify message}"
			


	upNode:( service ) =>
		if (service.data.roles.indexOf('A') isnt -1) and ( not @socketSubs[service.address]? ) and ( service.data.ATR? )
			@socketSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.ATR}"	
			@acceptors.push service.address