Acceptor = exports? and exports or @Acceptor = {}

Q = require 'q'
Ballot = require('./ballot').Ballot
Map = require './map'
Network = require('./network')
winston = require 'winston'

class Acceptor.Acceptor

    id              : undefined
    actualBallot    : undefined
    mapOfValues     : undefined
    network         : undefined
    
    constructor:( @test=false ) ->
        @actualBallot = new Ballot()
        @mapOfValues = new Map.Map("acceptor")

        if not test
            try
                @network = new Network.AcceptorNetwork( )
                @id = @network.ip
                @network.on 'message' , @processRequests
            catch e
                throw new Error e.message
        
            winston.add winston.transports.File, { filename: 'acceptor.log' }
            winston.info "Acceptor started"
    

    clear: ( ) ->
        @actualBallot = new Ballot()
        do @mapOfValues?.clear
        do @network?.close


    processRequests:( message ) =>
        winston.info "Received message #{message.type}"
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
                from: @id,
                body:
                    ballot : @actualBallot,
                    accepted : values
            @network?.send message

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

        @network?.send message
