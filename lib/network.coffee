Network = exports? and exports or @Network = {}


zmq      = require 'zmq'
Ballot   = require('./ballot').Ballot
winston = require 'winston'
crc     = require 'crc'

{EventEmitter} = require 'events'

class Network.Network extends EventEmitter

    ip : undefined

    socketPub  : undefined
    socketSubs : []
    replicas : []
    acceptors : []
    
    constructor:( @port = 9999 , @test=false ) ->
        @socketSubs = new Array()
        @socketPub = zmq.socket 'pub'
        @socketPub.identity = "publisher#{process.pid}"
        @socketPub.setsockopt 31 , 0
        @socketPub.setsockopt 42 , 1 #support IPv6
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
            @socketSubs = []
        catch e
            #console.log e
        

    send:( message ) ->
        message['crc'] = crc.crc32(JSON.stringify message).toString(16);
        message['timestamp'] = Date.now()
        @socketPub.send "#{message.type} #{JSON.stringify message}"
        
 
    upNode:( service ) ->
        if not socketSubs[service.name]?
            @socketSubs[service.name] = @startClient service.addresses , service.data.ATL


    downNode:( service ) ->
        @socketSubs[service.name]?.close()


    _getIP:( ) ->
        return require('os').hostname().replace(".local","")


    _isIPv4:( address ) ->
        regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if address.match(regex)
            return true


    _isLocalIPv6:( address ) ->
        return address.match("fe80*")


    _getLocalInterface:( address ) ->
        for int , addresses of require('os').networkInterfaces()
            for addr in addresses
                if addr['address'] is address then return int
        return undefined




class Network.AcceptorNetwork extends Network.Network 

    recuperationSubs : undefined
    receivedMessages : []

    constructor:( port = 9998 ) ->
        super( port )
        @recuperationSubs = new Array()
        

    close:( ) ->
        super( )
        if not @recuperationSubs?
            do socket.close for socket in @recuperationSubs
        @recuperationSubs = new Array()


    _startClient:( urls , port , inf ) ->
        socket = zmq.socket 'sub'
        socket.setsockopt 31 , 0 #only IPv4
        socket.setsockopt 42 , 1 #support IPv6
        socket.identity = "subscriber#{@socketSubs.length}#{process.pid}"
        socket.subscribe 'P1A'
        socket.subscribe 'P2A'
        for url in urls
            if not @_isIPv4 url
                if @_isLocalIPv6 url then url = "tcp://#{url}%#{@_getLocalInterface url}:#{port}" else url = "tcp://[#{url}]:#{port}" 
            else 
                url = "tcp://#{url}:#{port}"
            socket.connect url
        
        socket.on 'message' , ( data ) =>
            type = data.toString().substr 0 , data.toString().indexOf("{")-1
            data = data.toString().substr data.toString().indexOf("{")
            data = JSON.parse data

            if not @receivedMessages[data.from]? then @receivedMessages[data.from] = []
            for obj in @receivedMessages[data.from] when obj.crc is data.crc and obj.timestamp is data.timestamp then return
            @receivedMessages[data.from].push {crc:data.crc, timestamp:data.timestamp}

            message =
                "type":type,
                "body":data.body
                        
            ballot = new Ballot(message.body.ballot.number,message.body.ballot.id)
            message.body.ballot = ballot
            @emit 'message' , message
        return socket


    upNode:( service ) =>
        if (service.data.roles.indexOf('A') isnt -1 ) and ( not @recuperationSubs[service.name]? ) and ( service.data.ATA? )
            @recuperationSubs[service.name] = @_startClient service.addresses , service.data.ATA , service.interface
            winston.info "Acceptor added to network #{service.address}" unless @test

        if (service.data.roles.indexOf('R') isnt -1) and ( not @socketSubs[service.name]? ) and ( service.data.RTA? )
            @socketSubs[service.name] = @_startClient service.addresses , service.data.RTA , service.interface
            winston.info "Replica #{service.name} added"  unless @test


class Network.ReplicaNetwork extends Network.Network

    clientSockets : undefined
    replicaPubServer: undefined
    pendingMessagesToAcceptors : undefined
    socketSubsReplica : []
    receivedMessages : []


    constructor:( @port = 8000 , @portClient = 8181 , @portReplica = 8282 )->
        super( port )
        @clientSockets = {}
        @server = zmq.socket 'router'
        @server.identity = "replicaServer#{process.pid}"
        @server.bindSync("tcp://*:#{@portClient}")
        @server.on 'message' , @processMessage
        @pendingMessagesToAcceptors = []
        do @createReplicaPubServer
        setInterval @_checkPending , 2000
        

    createReplicaPubServer:()->
        @replicaPubServer = zmq.socket 'pub'
        @replicaPubServer.identity = "publisher#{process.pid}"
        @replicaPubServer.setsockopt 31 , 0
        @replicaPubServer.setsockopt 42 , 1 #support IPv6
        try
            @replicaPubServer.bindSync("tcp://*:#{@portReplica}")
        catch e
            console.log e
            throw new Error(e.message)


    close:( ) ->
        super()
        do @server.close

    processMessage:( envelope , data , data2 ) =>
        #allow clients with req and dealer
        if data.length is 0
            data = data2
        data = JSON.parse data.toString()
        @clientSockets[data.ip] = envelope
        data.type = 'propose'
        @emit 'message' , data
        

    response:(client , data) ->
        console.log data
        if client of @clientSockets
            @server.send [ @clientSockets[client] , '' , data ]
            #delete @clientSockets[client]
    

    _startAcceptorClient:( urls , port ) ->
        socket = zmq.socket 'sub'
        socket.setsockopt 31 , 0 #only IPv4
        socket.setsockopt 42 , 1 #support IPv6
        socket.identity = "subscriber#{@socketSubs.length}#{process.pid}"
        socket.subscribe 'P1B'
        socket.subscribe 'P2B'
        for url in urls
            if not @_isIPv4 url
                if @_isLocalIPv6 url then url = "tcp://#{url}%#{@_getLocalInterface url}:#{port}" else url = "tcp://[#{url}]:#{port}" 
            else 
                url = "tcp://#{url}:#{port}"
            socket.connect url 

        socket.on 'message' ,( data ) =>
            type = data.toString().substr 0 , data.toString().indexOf("{")-1
            data = data.toString().substr data.toString().indexOf("{")
            data = JSON.parse data
            
            if not @receivedMessages[data.from]? then @receivedMessages[data.from] = []
            for obj in @receivedMessages[data.from] when obj.crc is data.crc and obj.timestamp is data.timestamp then return
            @receivedMessages[data.from].push {crc:data.crc, timestamp:data.timestamp}
            
            message =
                "type":type,
                "body":data
            @emit 'message' , message
        return socket

    
    _startReplicaClient:( urls , port ) ->
        socket = zmq.socket 'sub'
        socket.setsockopt 31 , 0 #only IPv4
        socket.setsockopt 42 , 1 #support IPv6
        socket.identity = "subscriberReplica#{@socketSubs.length}#{process.pid}"
        socket.subscribe 'Decision'
        for url in urls
            if not @_isIPv4 url
                if @_isLocalIPv6 url then url = "tcp://#{url}%#{@_getLocalInterface url}:#{port}" else url = "tcp://[#{url}]:#{port}" 
            else 
                url = "tcp://#{url}:#{port}"
            socket.connect url 

        socket.on 'message' ,( data ) =>
            type = data.toString().substr 0 , data.toString().indexOf("{")-1
            data = data.toString().substr data.toString().indexOf("{")
            data = JSON.parse data
            
            if not @receivedMessages[data.from]? then @receivedMessages[data.from] = []
            for obj in @receivedMessages[data.from] when obj.crc is data.crc and obj.timestamp is data.timestamp then return
            @receivedMessages[data.from].push {crc:data.crc, timestamp:data.timestamp}
            
            message =
                "type":type,
                "body":data
            @emit 'message' , message
        return socket

    _checkPending:( ) =>
        if @pendingMessagesToAcceptors.length > 0 and Object.keys(@socketSubs).length > 0
            for message in @pendingMessagesToAcceptors
                @sendMessageToAllAcceptors message
                @pendingMessagesToAcceptors.splice(@pendingMessagesToAcceptors.indexOf(message),1)

    
    sendTo:( to , message ) ->
        msg =
            body: message

        client = zmq.socket 'dealer'
        client.connect "tcp://#{to}:#{@portClient}"
        client.send JSON.stringify msg


    sendMessageToAllAcceptors:( message )->
        if Object.keys(@socketSubs).length is 0
            @pendingMessagesToAcceptors.push message
        else
            message['crc'] = crc.crc32(JSON.stringify message).toString(16);
            message['timestamp'] = Date.now()
            @socketPub.send "#{message.type} #{JSON.stringify message}"
            

    upNode:( service ) =>
        if (service.data.roles.indexOf('A') isnt -1) and ( not @socketSubs[service.name]? ) and ( service.data.ATR? )
            @socketSubs[service.name] = @_startAcceptorClient service.addresses , service.data.ATR , service.interface
            @replicas.push service.name
            winston.info "Acceptor #{service.name} added" unless @test
        if (service.data.roles.indexOf('R') isnt -1) and ( not @socketSubsReplica[service.name]? ) and ( service.data.RTR? )
            @socketSubsReplica[service.name] = @_startReplicaClient service.addresses , service.data.RTR , service.interface
            @replicas.push service.name
            winston.info "Replica #{service.name} added" unless @test


    downNode:( service ) =>
        if( service.data.roles.indexOf('A') isnt -1 ) and @socketSubs[service.name] and service.data.ATR
            do @socketSubs[service.name].disconnect
            @acceptors.splice( @acceptors.indexOf( service.name ) , 1 )