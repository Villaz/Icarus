Replica = exports? and exports or @Replica = {}

Q = require 'q'
Map = require './map'
Leader = require('./leader').Leader
Network = require('./network')
winston = require('winston')


class Replica.Replica

	slot_num : 0
	proposals : undefined
	decisions : undefined
	
	operationsProposed : undefined
	operationsDecided : undefined

	lastSlotEmpltyInProposals: undefined
	lastSlotEmpltyInDecisions: undefined

	network : undefined
	leader : undefined

	constructor:( @network ,test=false ) ->
		@slot_num = 0
		@proposals = new Map.Map("proposalsReplica")
		@decisions = new Map.Map("decisionsReplica")
		@performed = new Map.Map("performedReplica")

		@operationsProposed = new Map.Map("operationsProposed")
		@operationsDecided 	= new Map.Map("operationsDecided")

		@lastSlotEmpltyInDecisions = 0
		@lastSlotEmpltyInProposals = 0
		
		if not test
			@leader = new Leader( @network )
			@leader.on 'decision' , ( message ) =>
				@decision message.slot , message.operation
			do @leader.start

			winston.add(winston.transports.File, { filename: 'replica.log' });
			winston.info "Replica started"


	propose:( operation ) ->
		deferred = Q.defer()

		key = {id:operation.id,client:operation.client}
				
		promiseDecided  = @operationsDecided.getValue  key 
		promiseProposed = @operationsProposed.getValue key
		
		Q.spread [ promiseDecided , promiseProposed ] , ( decided , proposed = [] ) =>
			if not decided? 
				slot = do @_getNextSlotEmply
				
				if slot not in proposed
					@proposals.addValues slot , operation
					@operationsProposed.addValues key , slot
					
					@lastSlotEmpltyInProposals++
					@leader?.propose slot , operation
			deferred.resolve()
		
		return deferred.promise


	decision:( slot , operation ) =>
		#If the slot was decided dont do anything
		if @lastSlotEmpltyInDecisions > slot
			return Q.fcall () ->
				false

		@decisions.addValue slot , operation
		key = {id:operation.id,client:operation.client}
		@operationsDecided.addValues key , slot
		@lastSlotEmpltyInDecisions++

		perform = ( ) =>
			@perform(operation).then whileDecisionsInSlot

		whileDecisionsInSlot = ( ) =>
				@decisions.getValue(@slot_num).then ( value ) =>
					if value isnt undefined
						@_reProposeOperations( operation ).then perform
					else
						return Q.fcall () ->
							true

		do whileDecisionsInSlot
		


	perform:( operation )->
		deferred = Q.defer()
		@_operationSlotInDecided(operation).then ( slots ) =>
			if @_slotsHaveMenorThanSlotNum slots , @slot_num
				@slot_num = @slot_num + 1
				do deferred.resolve
			else
				@slot_num = @slot_num + 1
				@execute(operation).then ( result ) =>
					@network.response operation.client , result 
					do deferred.resolve
		deferred.promise

	_reProposeOperations : ( operation ) =>
		
		@proposals.getValue(@slot_num).then ( proposalsInSlot ) =>
			promises = []
			if proposalsInSlot is undefined
				Q.fcall () ->
					true
			else
				reProposed = false
				for proposal in proposalsInSlot when (proposal.id isnt operation.id or proposal.client isnt operation.client)
					promise = @propose proposal
					promises.push promise
					reProposed = true
				@proposals.remove @slot_num if reProposed
				Q.all promises
		

	_operationIsInProposed:( operation ) ->
		search = {id:operation.id,client:operation.client}
		return @operationsProposed.getValue search

	_operationSlotInDecided:( operation ) ->
		search = {id:operation.id,client:operation.client}
		return @operationsDecided.getValue search

	_getNextSlotEmply:( ) ->
		if @lastSlotEmpltyInDecisions is @lastSlotEmpltyInProposals then return @lastSlotEmpltyInDecisions
		
		if @lastSlotEmpltyInDecisions < @lastSlotEmpltyInProposals then @lastSlotEmpltyInDecisions
		else @lastSlotEmpltyInProposals

	_slotsHaveMenorThanSlotNum: ( slots , slot_num ) ->
		return false if slots is undefined
		
		for slot in slots when slot < slot_num
			return true
		return false





