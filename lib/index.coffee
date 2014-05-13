cluster = require('cluster')
cpus    = require('os').cpus().length
Acceptor = require('./acceptor').Acceptor
Replica  = require('../server').Server
Discover = require('./discover').Discover
Network = require('./network')

Ballot = require('./ballot').Ballot

workerAcceptor = undefined
workerReplica = undefined

acceptorObject = undefined
replicaObject = undefined

discover = undefined

txt_record = 
    roles:['A','R'],
    'ATR':9998,
    'RTA':8000

processDiscoverUpMessage = ( service ) =>
	workerAcceptor?.send service
	replicaAcceptor?.send service


if cluster.isMaster
  
	cluster.on 'exit', (worker) ->
    	console.log "Server #{worker.id} died. restart..."
    	if worker.id is workerAcceptor.id then workerAcceptor = cluster.fork({type:'Acceptor'})
    	if worker.id is workerReplica.id then workerReplica = cluster.fork({type:'Replica'})
	
	workerAcceptor = cluster.fork({type:'Acceptor'})
	workerReplica = cluster.fork({type:'Replica'})

	discover = new Discover "paxos" , 9999 , txt_record
	discover.on 'up' , ( service ) =>
		msg =
			type: 'up'
			service: service
		workerReplica?.send msg
		workerAcceptor?.send msg

	discover.on 'down' , ( service ) =>
		msg =
			type: 'down'
			service: service
		workerReplica?.send 'down' , service
		workerAcceptor?.send 'down' , service
	discover.start()
	
else
	switch process.env.type
		when 'Acceptor' then acceptorObject = new Acceptor()
		when 'Replica'
			network = new Network.ReplicaNetwork( ) 
			network.on 'message' , ( message ) =>
				switch message.type
					when 'propose' then replicaObject.propose message.body.operation
					when 'adopted' then replicaObject.adopted message.body
					when 'P1B'	   then replicaObject.leader.p1b message.body
					when 'P2B'	   then replicaObject.leader.p2b message.body
			
			replicaObject = new Replica(network)
			

	process.on? 'message' , ( msg ) ->
		if msg.type is 'up'
			acceptorObject?.network.upNode msg.service
			replicaObject?.network.upNode msg.service
		
		if msg.type is 'down'
			acceptorObject?.network.upNode msg.service
			replicaObject?.network.upNode msg.service




