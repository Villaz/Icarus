
Discover = exports? and exports or @Discover = {}

{EventEmitter} = require 'events'

class Discover.Discover extends EventEmitter

	advertisement : null
	browser : null
	roles : {}

	constructor:( @serviceName , @servicePort , @roles = {} ) ->

	start:( advert = true )->
		if not @serviceName? then throw new Error 'ServiceName cannot be null'
		if not @servicePort? then throw new Error 'ServicePort cannot be null'

		@__startBrowser( )
		if advert then @__startAdvertisement( )

	
	stop:( )->
		@advertisement.stop()

	updateRoles:( @roles ) ->
		@stop( )
		setTimeout @__startAdvertisement , 5000
	
	
	__startAdvertisement:( ) =>
		mdns = require 'mdns2'
		@advertisement = mdns.createAdvertisement mdns.tcp( @serviceName ) , @servicePort , {txtRecord: @roles}
		@advertisement.start();

	__startBrowser:( ) ->
		mdns = require 'mdns2'
		@browser = mdns.createBrowser mdns.tcp( @serviceName )

		@browser.on 'serviceUp' , ( service ) =>
			data = 
				address : service.addresses[0]
				data : service.txtRecord
			@emit 'up' , data
		
		@browser.on 'serviceDown' , ( service ) =>
			@emit 'down' , service 

		@browser.on 'serviceChanged', ( service ) =>
		
		@browser.start()

class Discover.UDP extends EventEmitter

	nodes : undefined

	constructor:( @info )->
		@nodes = {}

	start:()->
		processMessage = (message, rdata) =>
			message = JSON.parse message
			nodes['message'] = new Date()
			@emit 'up' , JSON.parse message
		dgram = require('dgram');
		server = dgram.createSocket 'udp4'
		server.on 'message' , processMessage
		server.bind 8080 , ( )->
			server.setBroadcast true
			
		setInterval @_sendUDP , 5000
		setInterval @_checkDown , 20000
		

	_sendUDP:( )->
		message = 
			address : require("os").hostname()
			data : @info

		message = new Buffer(JSON.stringify message);
		client = dgram.createSocket("udp4");
		client.bind 5001 , ( ) =>
			client.setBroadcast true
		client.send message, 0, message.length,8080, "128.141.156.127", (err, bytes) ->
			console.log err
			console.log bytes
			client.close()

	_checkDown:( )->
		date = new Date()
		for node in nodes
			difference = (date - node) / 1000
			if difference > 20 then @emit 'down' , ''
		
udp = new Discover.UDP()
udp.start()