should = require 'should'

if process.env['coverage']?
	Ballot = require('../lib-cov/ballot.js').Ballot;
else
	Ballot = require('../lib/ballot.coffee').Ballot;



describe 'Ballot tests' , ->


	it 'when ballot is created id is undefined and number -1' , ->
		ballot = new Ballot( )
		ballot.number.should.be.exactly -1
		should.not.exists ballot.id

	it 'when constructor call with id, id has the value' , ->
		ballot = new Ballot( 1 , "test" )
		ballot.number.should.be.exactly 1
		ballot.id.should.be.exactly "test"

	it 'actual ballot is mayor than other' , ->
		ballot1 = new Ballot( 1 , "test" )
		ballot2 = new Ballot( 1 , "t" )

		result = ballot1.isMayorThanOtherBallot ballot2
		should(result).ok

		ballot2 = new Ballot( 0 , "test" )

		result = ballot1.isMayorThanOtherBallot ballot2
		should(result).ok

		ballot2 = new Ballot( 1 , "tess")

		result = ballot1.isMayorThanOtherBallot ballot2
		should(result).ok

		ballot2 = new Ballot( 1 , "hello")

		result = ballot1.isMayorThanOtherBallot ballot2
		should(not result).ok

	it 'actual ballot is less or equal than other' , ->
		ballot1 = new Ballot( 1 , "test" )
		ballot2 = new Ballot( 2 , "test" )

		result = ballot1.isMayorThanOtherBallot ballot2
		
		should(not result).ok

		ballot2 = new Ballot(2 , "t")
		result = ballot1.isMayorThanOtherBallot ballot2
		should(not result).ok

		ballot2 = new Ballot( 1 , "Zero")
		result = ballot1.isMayorThanOtherBallot ballot2
		should(result).ok

	it 'actual ballot is equal than other', ->
		ballot1 = new Ballot(1 , "test")
		ballot2 = new Ballot(1 , "test")

		result = ballot1.isMayorOrEqualThanOtherBallot ballot2
		should(result).ok

		ballot2.number = 2
		should(not ballot1.isMayorOrEqualThanOtherBallot ballot2).ok

