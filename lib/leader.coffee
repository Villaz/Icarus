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

	_spawnScout:( ) ->

	_spawnCommander:( slot , operation ) =>
		deferred = Q.defer()
		deferred.resolve(true)
		deferred.pomise

	_sendToCommanderAllproposals:( keys ) =>
		promises = [ ]
		deferred = Q.defer()
		counter = 0

		resolve = ( ) =>
			deferred.resolve()

		resolvePromises = ( ) =>
			Q.all([promises])

		for key in keys
			@proposals.getValue(key).then ( operation ) =>
				promises.push @_spawnCommander key , operation
				counter++
				if counter >= keys.length then resolvePromises().then(resolve)

		deferred.promise 

	

class Leader.Scout extends EventEmitter

class Leader.Commander extends EventEmitter