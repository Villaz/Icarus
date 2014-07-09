should = require 'should'
Q = require 'q'


#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
	Replica = require('../lib-cov/replica.js')
else
	Replica = require('../lib/replica.coffee')

describe 'Tests Replica' , ->

	replica = undefined

	check = (done,f) ->
		try
			f()
			done()
		catch e
			done(e)

	before ( ) ->
		@replica = new Replica.Replica( )
	
	beforeEach ( ) ->
		do @replica.start
		

	it 'Propose operation' , ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}

		result = ( ) =>
			result2 = ( value ) =>
				f = ( ) =>
					should.exists value
					value[0].id.should.be.exactly 1
					@replica.lastSlotEmpltyInProposals.should.be.exactly 1
				check(done,f)

			@replica.proposals.getValue(0).then result2
			
		@replica.propose(op1).then result


	it 'Propose multiple operations' , ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}
		op2 = {id:2,client:1,op:{'hello'}}

		@replica.propose(op1).then ( ) =>

			result = ( ) =>
				@replica.proposals.getValue(0).then (value) =>
					f = ( ) =>
						should.exists value
						value[0].id.should.be.exactly 1
						value[1].id.should.be.exactly 2
					check(done,f)
				

			@replica.propose(op2).then result


	it 'Propose duplicate operations same slot' , ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}

		@replica.propose(op1).then ( ) =>

			result = ( ) =>
				@replica.proposals.getValue(0).then (value) =>
					f = ( ) =>
						should.exists value
						value[0].id.should.be.exactly 1
						should.not.exists value[1]
					check(done,f)
				

			@replica.propose(op1).then result

	it 'Propose decided operation' , ( done ) ->
		
		op1 = {id:1,client:1,op:{'hello'}}
		key = {id:op1.id,client:op1.client}

		@replica.decisions.addValue 0 , op1
		@replica.operationsDecided.addValue key , 0
		@replica.lastSlotEmpltyInDecisions = 1

		result = ( ) =>
			@replica.proposals.getValue(0).then ( value ) =>
				f = ( ) =>
					should.not.exists value
				check done , f


		@replica.propose(op1).then result



	it '_getNextSlotEmply' , ->
		@replica.lastSlotEmpltyInDecisions = 0
		@replica.lastSlotEmpltyInProposals = 0

		@replica._getNextSlotEmply().should.be.exactly 0

		@replica.lastSlotEmpltyInDecisions = 1
		@replica.lastSlotEmpltyInProposals = 1

		@replica._getNextSlotEmply().should.be.exactly 1

		@replica.lastSlotEmpltyInDecisions = 0
		@replica.lastSlotEmpltyInProposals = 1

		@replica._getNextSlotEmply().should.be.exactly 0

		@replica.lastSlotEmpltyInDecisions = 1
		@replica.lastSlotEmpltyInProposals = 0

		@replica._getNextSlotEmply().should.be.exactly 0


	it '_slotsHaveMenorThanSlotNum', ->

		slots = [2,3,4]

		@replica._slotsHaveMenorThanSlotNum(slots,1).should.be.false

		@replica._slotsHaveMenorThanSlotNum(slots,2).should.be.false

		@replica._slotsHaveMenorThanSlotNum(slots,5).should.be.true


	it '_reProposeOperations' , ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}
		op2 = {id:2,client:1,op:{'hello2'}}

		@replica.proposals.addValues 0 , op1
		@replica.lastSlotEmpltyInProposals = 1
		@replica.lastSlotEmpltyInDecisions = 1

		@replica.slot_num = 0


		searchValues = ( values ) =>
			valuesIn0 = values[0]
			valuesIn1 = values[1]
			f = ( ) =>
					@replica.lastSlotEmpltyInProposals.should.be.exactly 2
					valuesIn1[0].id.should.be.exactly 1
					valuesIn1[0].id.should.be.exactly 1
					should.not.exists valuesIn0
			check done , f

		getValues = (  ) =>
			Q.all([@replica.proposals.getValue(0),@replica.proposals.getValue(1)]).then searchValues
		
		@replica._reProposeOperations(op2).then(getValues)


	it '_rePropose same operation' , ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}
		
		@replica.proposals.addValues 0 , op1
		@replica.lastSlotEmpltyInProposals = 1
		@replica.lastSlotEmpltyInDecisions = 1

		@replica.slot_num = 0


		searchValues = ( values ) =>
			valuesIn0 = values[0]
			valuesIn1 = values[1]

			f = ( ) =>
					@replica.lastSlotEmpltyInProposals.should.be.exactly 1
					valuesIn0[0].id.should.be.exactly 1
					valuesIn0[0].id.should.be.exactly 1
					should.not.exists valuesIn1
			check done , f

		getValues = (  ) =>
			Q.all([@replica.proposals.getValue(0),@replica.proposals.getValue(1)]).then searchValues
		
		@replica._reProposeOperations(op1).then(getValues)
			
			
	it 'Decision operation', ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}

		getValues = ( ) =>
			@replica.decisions.getValue(0)

		result = ( value ) =>
			
			f = ( ) =>
				@replica.lastSlotEmpltyInDecisions.should.be.exactly 1
				value.id.should.be.exactly 1
				value.client.should.be.exactly 1
			check done , f

		@replica.decision(0 , op1).then(getValues).then(result)

	it 'Decision operation to same slot' , ( done ) ->
		op1 = {id:1,client:1,op:{'hello'}}
		op2 = {id:2,client:2,op:{'hello'}}

		sendDecision1 = ( ) =>
			@replica.decision(0 , op1)
		
		sendDecision2 = ( ) =>
			@replica.decision(0 , op2)
		
		getValues = ( ) =>
			@replica.decisions.getValue(0)
		
		result = ( value ) =>
			f = ( ) =>
				@replica.lastSlotEmpltyInDecisions.should.be.exactly 1
				value.id.should.be.exactly 1
				value.client.should.be.exactly 1
			check done , f


		sendDecision1().then(sendDecision2).then(getValues).then(result)