Leader = exports? and exports or @Leader = {}


Q = require 'q'
Map = require './map'
Ballot = require('./ballot').Ballot
Scout = require('./scout').Scout
Commander = require('./commander').Commander
winston = require 'winston'

{EventEmitter} = require 'events'
class Leader.Leader  extends EventEmitter

    ballot: undefined
    active: undefined
    proposals : undefined
    proposalsInSlot : undefined
    scout : undefined
    lastSlotReceived: undefined
    network : undefined

    commanders : []

    constructor:( @network ) ->
        @ballot = new Ballot 1 , @network?.ip
        @active = false
        @proposals = new Map.Map "proposalsLeader"
        @proposalsInSlot = new Map.Map "proposalsInSlot"
        
    
    start:( )->
        do @_spawnScout


    propose:( slot , operation ) ->
        deferred = Q.defer()

        @proposals.getValue(slot).then (value) =>
            if value is undefined
                @proposalsInSlot.addValue operation , slot
                @proposals.addValue slot , operation
                if @active then  Q.when(@_spawnCommander(slot , operation),deferred.resolve) else deferred.resolve(true)
            else
                deferred.resolve(false)
        
        deferred.promise
        

    adopted:( ballot , pvalues , pvaluesSlot ) ->
        deferred = Q.defer()
        
        finishAdopted = ( ) =>
            @active = true
            deferred.resolve(true)
        
        sendToCommander = ( keys ) =>
            @_sendToCommanderAllproposals keys

        allPromiseResult = ( results ) =>
            @proposals = pvalues
            @proposalsInSlot = pvaluesSlot
            @proposals.getAllKeys().then(sendToCommander).then(finishAdopted)

        promise1 = pvalues.update(@proposals)
        promise2 = pvaluesSlot.update(@proposalsInSlot)
        
        Q.all([promise1,promise2]).then(allPromiseResult)
        deferred.promise


    preempted:( ballot ) ->
        if ballot.isMayorThanOtherBallot @ballot
            @active = false
            @ballot.number = ballot.number + 1
            do @_spawnScout


    p1b:( message ) ->
        if @scout? then @scout.process message

    p2b:( message ) ->
        for commander in @commanders
            commander.receiveP2B message.acceptor , message.ballot

    
    _spawnScout:( ) ->
        @scout = new Scout @ballot , @lastSlotReceived , @network 
        
        @scout.on 'preempted' , ( body ) =>
            return 0
        @scout.on 'adopted' , ( body ) =>
            @adopted body.ballot , body.pvalues , body.pvaluesSlot
        
        do @scout.start
        


    _sendToCommanderAllproposals:( keys ) =>
        promises = []
        for key in keys
            deferred = do Q.defer
            promises.push deferred
            @proposals.getValue(key).then (operation)=>
                @_spawnCommander key , operation
                deferred.resolve()
        Q.all promises


    _spawnCommander:( slot , operation ) =>
        deferred = do Q.defer
        
        commander = new Commander slot , operation , @ballot , @network
        @commanders.push commander
                
        commander.on 'decision' , ( message ) =>
            @commanders.slice @commanders.indexOf( commander ) , 1
            @emit 'decision' , message
            do deferred.resolve
            
        commander.on 'preempted' , ( message ) =>
            @commanders.slice @commanders.indexOf( commander ) , 1
            do referred.resolve

