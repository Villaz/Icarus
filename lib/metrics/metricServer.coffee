MetricServer = exports? and exports or @MetricServer = {}

restify  = require('restify')
socketio = require('socket.io')
stats = require('measured').createCollection()

class MetricServer.MetricServer

	names = []
	server = undefined
	io		= undefined

	oldMetrics = undefined

	constructor:( port )->
		@metrics = [ ]
		@server = restify.createServer();
		@io = socketio.listen(@server,{ log: false });

		@server.get('/metrics/all',@_respondAll)
		@server.get('/metrics/:name', @_respond)
		

		@server.listen port, () =>
  			console.log "#{@server.name} listening at #{@server.url}"

  		@io.sockets.on 'connection' , ( socket ) =>
  					socket.emit 'metrics' , JSON.stringify @_JSONMetrics()

  		setInterval @_send , 5000


	addMetric:( name ) ->
		@names = [] if @names is undefined
		if not @names[name]?
			@names[name] = true 
		stats.meter(name).mark();
		
		


	_respond:( req, res, next ) =>
		res.contentType = "json"
		value = {key:req.params.name,value:@metrics[req.params.name]}
		res.send(value);

	_respondAll:( req , res , next ) =>
		
		res.contentType = 'json';
						
		res.send(do @_JSONMetrics)

	_JSONMetrics:( ) =>
		timestamp = new Date().getTime()
		metrics = []
		for name , value of @names
			metrics.push {name:name,mean:stats.meter(name).toJSON().mean ,timestamp:timestamp}
		return {metrics:metrics}

	_send:( ) =>
		stringMetrics = JSON.stringify @_JSONMetrics()
		if @oldMetrics isnt stringMetrics
			@io.sockets.emit 'metrics' , stringMetrics
			@oldMetrics = stringMetrics
  		




		