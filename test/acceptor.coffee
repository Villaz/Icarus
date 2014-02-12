should = require 'should'

Ballot = require('../lib/ballot.coffee').Ballot

#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
	Acceptor = require('../lib-cov/acceptor.js').Acceptor;
else
	Acceptor = require('../lib/acceptor.coffee').Acceptor;


describe 'Acceptor tests', ->
	
	acceptor = undefined

	check = (done,f) ->
		try
			f()
			done()
		catch e
			done(e)
	
	beforeEach () ->
		@acceptor = new Acceptor( ) if not @acceptor?
		

	afterEach ( ) ->
   		do @acceptor?.clear
	
	it 'constructor' , ->
		(@acceptor.actualBallot.number).should.be.exactly(-1)
		should.not.exists(@acceptor.actualBallot.id)
		should.exists(@acceptor.mapOfValues)


	it 'processP1A' , ->
		
		ballot = new Ballot(1,"localhost")
		@acceptor.processP1A(ballot)
		@acceptor.actualBallot.number.should.be.exactly(1)
		@acceptor.actualBallot.id.should.be.exactly("localhost")

		ballot = new Ballot(1,"local")
		@acceptor.processP1A(ballot)
		@acceptor.actualBallot.number.should.be.exactly(1)
		@acceptor.actualBallot.id.should.be.exactly("localhost")

		ballot = new Ballot(2 , "localhost")
		@acceptor.processP1A(ballot)
		@acceptor.actualBallot.number.should.be.exactly(2)
		@acceptor.actualBallot.id.should.be.exactly("localhost")



	it 'processP2A' , ( done ) ->
		
		value = {slot:1,ballot:new Ballot(1,"localhost"),operation:"hola"}
		@acceptor.processP2A(value)
		
		value.slot = 2
		value.operation = "hola2"
		@acceptor.processP2A(value)

		fthen = ( value ) =>
			
			fthen2 = ( value2 ) =>
			
				fcheck = ( ) =>
					value.should.be.exactly "hola"
					value2.should.be.exactly "hola2"
			
				check done , fcheck
			
			@acceptor.mapOfValues.getValue(2).then fthen2
							
		@acceptor.mapOfValues.getValue(1).then fthen