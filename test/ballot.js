var should = require('should')

if(process.env['coverage'] !== undefined)
	var Ballot = require('../lib-cov/ballot.js').Ballot;
else
	var Ballot = require('../lib/ballot.js').Ballot;



describe('Ballot tests',function(){

  it('when ballot is created id is undefined and number -1',function(){
		var ballot = new Ballot( )
		ballot.number.should.be.exactly(-1)
		should.not.exists(ballot.id)
  })


  it('when constructor call with id, id has the value' , function(){
    var ballot = new Ballot({number:1 , id:"test"} )

		ballot.number.should.be.exactly(1)
    ballot.id.should.be.exactly("test")
  })


  it('actual ballot is mayor than other', function(){
		var ballot1 = new Ballot( {number:1 , id:"test%"} )
		var ballot2 = new Ballot( {number:1 , id:"t"} )

		var result = ballot1.isMayorThanOtherBallot(ballot2)
		should(result).ok

		ballot2 = new Ballot( {number:0 , id:"test"} )

		result = ballot1.isMayorThanOtherBallot(ballot2)
		should(result).ok

		ballot2 = new Ballot( {number:1 , id:"tess"} )

		result = ballot1.isMayorThanOtherBallot(ballot2)
		should(result).ok

		ballot2 = new Ballot( {number:1 , id:"hello"} )

		result = ballot1.isMayorThanOtherBallot(ballot2)
		should(result).not.be.ok
  })


  it('actual ballot is less or equal than other', function(){
		var ballot1 = new Ballot( {number:1 , id:"test"} )
		var ballot2 = new Ballot( {number:2 , id:"test"} )

		var result = ballot1.isMayorThanOtherBallot(ballot2)

		should(result).not.be.ok

		ballot2 = new Ballot( {number:2 , id:"t"} )
		result = ballot1.isMayorThanOtherBallot(ballot2)
		should(result).not.be.ok

		ballot2 = new Ballot( {number:1 , id:"Zero"} )
		result = ballot1.isMayorThanOtherBallot(ballot2)
		should(result).ok
  })

  it('actual ballot is equal than other', function(){
		var ballot1 = new Ballot( {number:1 , id:"test"} )
		var ballot2 = new Ballot( {number:1 , id:"test"} )

		var result = ballot1.isMayorOrEqualThanOtherBallot(ballot2)
		should(result).ok

		ballot2.number = 2
		should(ballot1.isMayorOrEqualThanOtherBallot(ballot2)).not.be.ok
  })
})
