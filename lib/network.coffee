Network = exports? and exports or @Network = {}


zmq 	 = require 'zmq'
Discover = require('./discover').Discover
Ballot 	 = require('./ballot').Ballot
MetricServer = require('./metrics/metricServer').MetricServer

txt_record = 
    roles:['L'],
    'LTA':8888

{EventEmitter} = require 'events'

class Network.Network extends EventEmitter

	socketPub  : undefined
	socketSubs : []
	discover : undefined

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
			#console.log e
			#throw new Error(e.message)
		
		@discover = new Discover("paxos",9999,txt_record)
    	@discover.on 'up' , @upNode
    	@discover.on 'down' , @downNode
    	@discover.start()


	close:( ) ->
		try
			do @socketPub?.close
			do socket.close for socket in @socketSubs
		catch e
			#console.log e
		
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

		if (service.data.roles.indexOf('R') isnt -1) and ( not @socketSubs[service.address]? ) and ( service.data.RTA? )
			@socketSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.RTA}"		


class Network.ReplicaNetwork extends Network.Network

	clientSockets : undefined

	constructor:( port = 8000)->
		super()
		@server = zmq.socket( 'router' )
		@server.identity = "replicaServer#{process.pid}"
		@server.bindSync("tcp://*:#{port}")
		@server.on 'message' , @processMessage


	close:( ) ->
		super()
		@server.close

	processMessage:( envelope , black , data ) =>
		data = JSON.stringify data.toString()
		@clientSockets[data.ip] = envelope
		
		@emit 'message', data

    response:(client, data) ->
    	@server.send [ @clientSockets[client] , '' , data ]
	
	_startClient:( url ) ->
		socket = zmq.socket 'sub'
		socket.identity = "subscriber#{@socketSubs.length}#{process.pid}"
		socket.subscribe 'P1B'
		socket.subscribe 'P2B'

		socket.connect url

		socket.on 'message' , data ( ) =>
			type = data.toString().substr 0 , data.toString().indexOf("{")-1
			data = data.toString().substr data.toString().indexOf("{")
			
			message =
				"type":type,
				"body":JSON.parse data

			@emit 'message' , message
		return socket


	upNode:( service ) ->
		if (service.data.roles.indexOf('A') isnt -1) and ( not @socketSubs[service.address]? ) and ( service.data.ATR? )
			@socketSubs[service.address] = @_startClient "tcp://#{service.address}:#{service.data.ATR}"	