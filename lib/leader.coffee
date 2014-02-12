Leader = exports? and exports or @Leader = {}


Q = require 'q'
Map = require './map'
Ballot = require('./ballot').Ballot

{EventEmitter} = require 'events'
class Leader.Leader  extends EventEmitter

	ballot: undefined
	active: undefined
	proposals : undefined
	proposalsInSlot : undefined

	constructor:( ) ->
		@ballot = new Ballot()
		@active = false
		@proposals = new Map.Map ("proposalsLeader")
		@proposalsInSlot = new Map.Map ("proposalsInSlot")

		do @_spawnScout
	
	propose:( slot , operation ) ->
		@proposalsInSlot.getValue(operation).then (value) =>
			if value is undefined
				@proposalsInSlot.addValues operation , slot
				@proposals.addValue slot , operation
				if @active then @_spawnCommander slot , operation


	adopted:( ballot , pvals ) ->
		@proposals.getAllKeys().then ( keys ) =>
			for key in keys
				@proposals.getValue(key).then ( operation ) =>
					@_spawnCommander key , operation
					@active = true

	preempted:( ballot ) ->
		if ballot.isMayorThanOtherBallot @ballot
			@active = false
			@ballot.number = ballot.number + 1
			do @_spawnScout

	_spawnScout:( ) ->

	_spawnCommander:( slot , operation ) =>





class Leader.Scout extends EventEmitter

class Leader.Commander extends EventEmitter