cluster = require('cluster')
cpus    = require('os').cpus().length
Acceptor = require('./acceptor').Acceptor
Discover = require('./discover').Discover

Ballot = require('./ballot').Ballot

workerAcceptor = undefined
workerReplica = undefined

acceptorObject = undefined
replicaObject = undefined

discover = undefined


processDiscoverUpMessage = ( service ) =>
	workerAcceptor?.send service
	replicaAcceptor?.send service


test = ( ) =>
	slot = 1
	zmq = require 'zmq'
	socket = zmq.socket 'pub'
	socket2 = zmq.socket 'sub'
	
	socket.bindSync 'tcp://*:8888'
	socket2.subscribe 'P1B'
	socket2.subscribe 'P2B'
	socket2.connect 'tcp://localhost:9999'
	socket2.on 'message' , ( data ) =>

		type = data.toString().substr 0 , data.toString().indexOf("{")-1
		data = data.toString().substr data.toString().indexOf("{")
		
		if type is 'P1B'
			do sendP2A
		else
			do sendP1A

	sendP1A = ( ) =>
		a =
			"ballot" : new Ballot(1,"localhost")
			"leader" : "localhost"
		socket.send "P1A #{JSON.stringify a}"


	sendP2A = ( ) =>
		msg =
			"ballot" : new Ballot(1,"localhost")
			"leader" : "localhost"
			"slot" : slot++
			"operation" : "test1"
		socket.send "P2A #{JSON.stringify msg}"

	setTimeout sendP1A , 4000


if cluster.isMaster
  
	cluster.on 'exit', (worker) ->
    	console.log "Server #{worker.id} died. restart..."
    	if worker.id is workerAcceptor.id then cluster.fork()
	
	workerAcceptor = cluster.fork({type:'Acceptor'})
	workerReplica = cluster.fork({type:'Replica'})

	do test
else
	switch process.env.type
		when 'Acceptor' then acceptorObject = new Acceptor()
  		when 'Replica' then replicaObject = new Replica()

	process.on? 'message' , ( message) ->
  		acceptorObject?.network.upNode message
  		replicaObject?.network.upNode message



