cluster = require 'cluster'
cpus    = require('os').cpus().length
Acceptor = require('./acceptor').Acceptor
Replica  = require('./server').Server
Discover = require('./discover')
Network = require('./network')
Ballot = require('./ballot').Ballot

program = require 'commander'

workerAcceptor = undefined
workerReplica = undefined

acceptorObject = undefined
replicaObject = undefined

discover = undefined


list = ( value ) ->
    value.split ','

program.version( "0.0.1" )
        .option( '-c, --client [port]' , 'Client port petitions' , parseInt )
        .option( '-r, --replica [port]' , 'Add Replica' , parseInt )
        .option( '-a, --acceptor [port]' , 'Add Aceptor' , parseInt )
        .option( '-p, --discoverPort <port>' , 'Discover port' , parseInt )
        .option( '-t, --discoverType <type>' , 'Discover type(UDP,Bonjour)')
        .option( '-i, --interface [interface]' , "Select interface to send messages. default(eth0)")
        .parse(process.argv)

txt_record = 
    roles:['A','R'],
    'ATR':9998,
    'RTA':8000

generateParams = ( ) ->
    
    txtRecord =
        roles:[]
    
    acceptorPort = 9998
    replicaPort = 8000
    
    if program.replica
        txtRecord.roles.push 'R'
        program.replica = parseInt( program.replica ) || replicaPort
        txtRecord.RTA = program.replica
        
    if program.acceptor
        txtRecord.roles.push 'A'
        program.acceptor = parseInt( program.acceptor ) || acceptorPort
        txtRecord.ATR = program.acceptor

    if not program.discoverPort? then program.discoverPort = 9999
    if not program.discoverType? then program.discoverType = 'Bonjour' 
    if not program.interface? then program.interface = network_interface()

    return txtRecord


processDiscoverUpMessage = ( service ) =>
    workerAcceptor?.send service
    replicaAcceptor?.send service

network_interface = ( ) ->
    for name, value of require('os').networkInterfaces()
        if name is 'eth0' then return 'eth0'
        if name is 'en0' then return 'en0'

        for net in value
            if net.family is 'IPv4' and net.internal is false then return name


if cluster.isMaster
    txtRecord = do generateParams
    console.log txtRecord
    cluster.on 'exit', (worker) ->
        console.log "Server #{worker.id} died. restart..."
        if worker.id is workerAcceptor.id then workerAcceptor = cluster.fork({type:'Acceptor' , port:process.env.acceptor })
        if worker.id is workerReplica.id then workerReplica = cluster.fork({type:'Replica' , port:process.env.replica , client:process.env.client })
    
    if program.acceptor
        workerAcceptor = cluster.fork {type:'Acceptor' , port:program.acceptor }
    if program.replica
        workerReplica = cluster.fork {type:'Replica' , port:program.replica , client:program.client }

    if program.discoverType is 'Bonjour'
        discover = new Discover.Discover "paxos" , program.discoverPort , program.interface , txtRecord
    else
        discover = new Discover.UDP "paxos" , program.discoverPort , program.interface , txtRecord
    
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
        workerReplica?.send 'down' , msg
        workerAcceptor?.send 'down' , msg
    discover.start()
    
else
    switch process.env.type
        when 'Acceptor' then acceptorObject = new Acceptor( process.env.port )
        when 'Replica'
            if  not process.env.client?
                network = new Network.ReplicaNetwork( process.env.port, process.env.client )
            else
                network = new Network.ReplicaNetwork( process.env.port ) 
            network.on 'message' , ( message ) =>
                switch message.type
                    when 'propose' then replicaObject.propose message.body
                    when 'adopted' then replicaObject.adopted message.body
                    when 'P1B'     then replicaObject.leader.p1b message.body
                    when 'P2B'     then replicaObject.leader.p2b message.body
            
            replicaObject = new Replica(network)
            

    process.on? 'message' , ( msg ) ->
        if msg.type is 'up'
            acceptorObject?.network.upNode msg.service
            replicaObject?.network.upNode msg.service
        
        if msg.type is 'down'
            acceptorObject?.network.downNode msg.service
            replicaObject?.network.downNode msg.service

