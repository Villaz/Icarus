Commander = exports? and exports or @Commander = {}

Q = require 'q'
Map = require './map'
Ballot = require('./ballot').Ballot

{EventEmitter} = require 'events'
class Commander.Commander extends EventEmitter

    slots : []  
    
    constructor:( @network ) ->
        

    sendP2A:( slot , operation , ballot ) ->
        deferred = do Q.defer
        if slot in @slots then @emit 'preempted' , @slots[slot]['ballot']
        else 
            @slots[slot] =
                ballot: ballot
                operation: operation
                decided: false
                acceptorsResponse:[]
                acceptors: @network.acceptors
                  
            message =
                from: ballot.id
                type:'P2A'
                body:
                    slot: slot
                    operation: operation
                    ballot: ballot
            
            @network.sendMessageToAllAcceptors message
        do deferred.resolve
        deferred.promise


    receiveP2B:( acceptor , ballot , slot , operation ) ->
        return if acceptor not in @slots[slot].acceptors or @slots[slot].decided
        
        if @slots[slot].ballot.isEqual ballot 
            @slots[slot].acceptorsResponse.push acceptor if acceptor not in @slots[slot].acceptorsResponse
        if @slots[slot].acceptorsResponse.length >= Math.round(( @slots[slot].acceptors.length ) / 2)
            @slots[slot].decided = true
            @emit 'decision' , {slot:slot , operation: operation}
        else
            @slots[slot].decidided = true
            @emit 'preempted' , ballot # , slot:@slot , operation:@operation }