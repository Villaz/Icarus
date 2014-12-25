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
    
    constructor:( port=8888 , @test=false ) ->
        @actualBallot = new Ballot()
        @mapOfValues = new Map.Map("acceptor")

        if not @test
            try
                @network = new Network.AcceptorNetwork port 
                @id = @network.ip
                @network.on 'message' , @processRequests
            catch e
                throw new Error e.message
        
            winston.add winston.transports.File, { filename: 'acceptor.log' }
            winston.info "Acceptor started #{@id}:#{port}"
    

    clear: ( ) ->
        @actualBallot = new Ballot()
        do @mapOfValues?.clear
        do @network?.close


    processRequests:( message ) =>
        switch message.type
            when 'P1A' then @processP1A message.body.ballot , message.body.leader
            when 'P2A' then @processP2A message.body


    processP1A:( ballot , to )->
        ballot = new Ballot  ballot.number , ballot.id 
        if ballot.isMayorThanOtherBallot @actualBallot
            winston.info "P1A Updated ballot to #{JSON.stringify ballot}" unless @test
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
        updateValuesAndSendResponse = ( ) =>
            winston.info "Received P2A #{JSON.stringify value}" unless @test
            ballot = new Ballot value.ballot.number , value.ballot.id

            if ballot.isMayorOrEqualThanOtherBallot @actualBallot
                winston.info "P2A Updated ballot to #{JSON.stringify ballot}" if ballot.isMayorThanOtherBallot @actualBallot and not @test
                @actualBallot = ballot
                @mapOfValues.addValue value.slot , value.operation
                winston.info "P2A Added operation #{JSON.stringify value.operation} to slot #{value.slot}" unless @test
            @sendP2B value.slot , value.operation

        @mapOfValues.getValues(value.slot).then (operation)=>
            operation = operation[0]
            if operation? and operation.client is value.operation.client and operation.id is value.operation.client.id
                return
            else
                do updateValuesAndSendResponse


    sendP2B:( slot , operation )->
        message =
            type: 'P2B'
            acceptor: @id
            ballot: @actualBallot
            slot: slot
            operation: operation
        @network?.send message
