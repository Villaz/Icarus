should = require 'should'
Q = require 'q'
Ballot = require('../lib/ballot.coffee').Ballot
Map = require('../lib/map.coffee').Map

#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
	Leader = require('../lib-cov/leader.js')
else
	Leader = require('../lib/leader.coffee')

describe 'Tests Leader' , ->

	leader : undefined

	check = (done,f) ->
		try
			f()
			done()
		catch e
			done(e)

	beforeEach ( ) ->
		@leader = new Leader.Leader( )


	it 'Constructor' , ( ) ->
		should.exists @leader.ballot
		should.exists @leader.proposals
		should.exists @leader.proposalsInSlot
		@leader.active.should.be.exactly false


	it 'Propose value', ( done ) ->
		slot = 1
		operation = {client_id:'1',operation_id:'1',operation:"test"}

		promise = @leader.propose slot , operation 

		promise.then ( value ) =>

			f = ( ) =>
				value.should.be.exactly true
				@leader.proposals.hashMap.get('1').should.be.exactly operation
				@leader.proposalsInSlot.hashMap.get(JSON.stringify operation).should.be.exactly slot

			check done , f

	it 'Propose value to not empty slot' , ( done ) ->

		slot = 1
		operation1 = {client_id:'1',operation_id:'1',operation:"test"}
		operation2 = {client_id:'1',operation_id:'2',operation:"test"}

		secondPropose = ( ) =>
			@leader.propose slot , operation2

		compare = ( value ) =>
			
			f = ( ) =>
					value.should.be.exactly false
					@leader.proposals.hashMap.get('1').should.be.exactly operation1
					@leader.proposalsInSlot.hashMap.get(JSON.stringify operation1).should.be.exactly slot

			check done , f


		@leader.propose(slot , operation1).then(secondPropose).then(compare)



	it 'Adopted' , ( done ) ->
		ballot = new Ballot(1,'localhost')
		slot = 1
		operation = {client_id:'1',operation_id:'1',operation:"test"}
		pvals = new Map()
		pvalsSlot = new Map()

		adopt = ( ) =>
			@leader.adopted  ballot , pvals , pvalsSlot 

		result = ( ) =>
			f = ( ) =>
				@leader.proposals.hashMap.get('1').should.be.exactly operation
			check done , f


		@leader.propose(slot,operation).then(adopt).then result


	it 'Adopted duplicated' , ( done ) ->
		ballot = new Ballot(1,'localhost')
		slot = 1
		operation = {client_id:'1',operation_id:'1',operation:"test"}
		operation2 = {client_id:'1',operation_id:'1',operation:"test2"}

		pvals = new Map()
		pvalsSlot = new Map()

		pvals.addValue 1 , operation 
		pvalsSlot.addValue operation , 1

		adopt = ( ) =>
			@leader.adopted  ballot , pvals , pvalsSlot 

		result = ( ) =>
			f = ( ) =>
				@leader.proposals.hashMap.get('1').should.be.exactly operation
				@leader.proposals.hashMap.count().should.be.exactly 1
				@leader.proposalsInSlot.hashMap.count().should.be.exactly 1
				@leader.proposalsInSlot.hashMap.get(JSON.stringify operation).should.be.exactly 1
			check done , f


		@leader.propose(slot,operation2).then(adopt).then result


	it 'Adopted Duplicated Operation diferent Slot' , ( done ) ->
		ballot = new Ballot(1,'localhost')
		slot = 1
		operation = {client_id:'1',operation_id:'1',operation:"test"}
		operation2 = {client_id:'1',operation_id:'1',operation:"test2"}

		pvals = new Map()
		pvalsSlot = new Map()

		pvals.addValue 2 , operation 
		pvalsSlot.addValue operation , 1

		adopt = ( ) =>
			@leader.adopted  ballot , pvals , pvalsSlot 

		result = ( ) =>
			f = ( ) =>
				should.not.exists @leader.proposals.hashMap.get('1')
				@leader.proposals.hashMap.get('2').should.be.exactly operation
				console.log @leader.proposals.hashMap
				@leader.proposals.hashMap.count().should.be.exactly 1

				@leader.proposalsInSlot.hashMap.count().should.be.exactly 1
				@leader.proposalsInSlot.hashMap.get(JSON.stringify operation).should.be.exactly 1
			check done , f


		@leader.propose(slot,operation2).then(adopt).then result

		
			
			

				

