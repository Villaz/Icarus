should = require 'should'
Q = require 'q'


#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
	Map = require('../lib-cov/map.js')
else
	Map = require('../lib/map.coffee')

xdescribe 'Map tests with Redis' , ->
	
	map = undefined


	check = (done,f) ->
		try
			f()
			done()
		catch e
			done(e)

	beforeEach ( ) ->
		
		if @map?
			do @map.close
				
		@map = new Map.Redis("test")

   
	afterEach ( ) ->
   		@map.clear()

	it 'Add value to map', ( done ) ->

		result = ( reply ) ->
			f = ( ) =>
				reply.text.should.be.exactly("text")
			check(done,f)
			
		@map.addValue(1,{"text":"text"})
		@map.getValue(1).then result


	it 'Value is override' , ( done ) ->

		result = ( reply ) ->
			f = ( ) =>
				reply.text.should.be.exactly("text2")
			check(done,f)

		@map.addValue(1,{"text":"text"})
		@map.addValue(1,{"text":"text2"})

		@map.getValue(1).then result


	it 'Number of slots in mapOfValues is 2' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list.length.should.be.exactly(2)
				list[0].should.be.exactly("1")
				list[1].should.be.exactly("2")
			check(done,f)
		

		@map.addValue(1,{"text":"text"})
		@map.addValue(2,{"text":"text2"})

		@map.getAllKeys().then result

	it 'Return all values stored' , ( done ) ->

		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 1
				list[1].slot.should.be.exactly 2
				list[0].operation.op.should.be.exactly "text"
				list[1].operation.op.should.be.exactly "text2"
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text2"})
		@map.getValues().then result

	it 'Return filtered values with from' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 2
				list[1].slot.should.be.exactly 3
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text"})
		@map.addValue(3,{"op":"text"})

		@map.getValues(2).then result


	it 'Return filtered values with to' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 1
				list[1].slot.should.be.exactly 2
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text"})
		@map.addValue(3,{"op":"text"})

		@map.getValues(undefined,2).then result

	it 'Return filtered values with from and to' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 2
				list[1].slot.should.be.exactly 3
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text"})
		@map.addValue(3,{"op":"text"})

		@map.getValues(2,3).then result



describe 'Map tests with Map' , ->
	
	map = new Map.Map("test")	


	check = (done,f) ->
		try
			f()
			done()
		catch e
			done(e)

	beforeEach ( ) ->
		@map = new Map.Map()
    


	it 'Add value to map', ( done ) ->

		result = ( reply ) ->
			f = ( ) =>
				reply.text.should.be.exactly("text")
			check(done,f)
			
		@map.addValue(1,{"text":"text"})
		@map.getValue(1).then result


	it 'Value is override' , ( done ) ->

		result = ( reply ) ->
			f = ( ) =>
				reply.text.should.be.exactly("text2")
			check(done,f)

		@map.addValue(1,{"text":"text"})
		@map.addValue(1,{"text":"text2"})

		@map.getValue(1).then result


	it 'Add values to map', ( done ) ->

		result = ( reply ) ->
			f = ( ) =>
				reply[0].text.should.be.exactly 'text1'
				reply[1].text.should.be.exactly 'text2'
			check(done,f)

		@map.addValues(1,{"text":"text1"})
		@map.addValues(1,{"text":"text2"})
		@map.getValue(1).then result

	it 'Number of slots in mapOfValues is 2' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list.length.should.be.exactly(2)
				list[0].should.be.exactly("1")
				list[1].should.be.exactly("2")
			check(done,f)
		

		@map.addValue(1,{"text":"text"})
		@map.addValue(2,{"text":"text2"})

		@map.getAllKeys().then result

	it 'Return all values stored' , ( done ) ->

		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 1
				list[1].slot.should.be.exactly 2
				list[0].operation.op.should.be.exactly "text"
				list[1].operation.op.should.be.exactly "text2"
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text2"})
		@map.getValues().then result


	it 'Return filtered values with from' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 2
				list[1].slot.should.be.exactly 3
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text"})
		@map.addValue(3,{"op":"text"})

		@map.getValues(2).then result


	it 'Return filtered values with to' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 1
				list[1].slot.should.be.exactly 2
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text"})
		@map.addValue(3,{"op":"text"})

		@map.getValues(undefined,2).then result

	it 'Return filtered values with from and to' , ( done ) ->
		result = ( list ) ->
			f = ( ) =>
				list[0].slot.should.be.exactly 2
				list[1].slot.should.be.exactly 3
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.addValue(2,{"op":"text"})
		@map.addValue(3,{"op":"text"})

		@map.getValues(2,3).then result


	it 'Remove values' , ( done ) ->

		result = ( value ) ->
			f = ( ) =>
				should.not.exists value
			check done , f

		@map.addValue(1,{"op":"text"})
		@map.remove(1)

		@map.getValue(1).then result


	it 'Update map' , ( done ) ->

		map2 = new Map.Map("testMap")


		result = ( value ) =>
			f = ( ) =>
				map2.hashMap.has("1").should.be.true
				map2.hashMap.has("2").should.be.true
			check done , f

		@map.addValue(1,{"op":"test"})
		map2.addValue(2,{"op":"test2"})

		map2.update(@map).then result


	it 'Update map with duplicates' , ( done ) ->

		map2 = new Map.Map("testMap")


		result = ( value ) =>
			f = ( ) =>
				map2.hashMap.has("1").should.be.true
				map2.hashMap.has("2").should.be.true
				map2.hashMap.get("1").op.should.be.exactly "test3"
			check done , f

		@map.addValue(1,{"op":"test"})
		map2.addValue(2,{"op":"test2"})
		map2.addValue(1,{"op":"test3"})

		map2.update(@map).then result

	it 'Update map with empty' , ( done ) ->
		map2 = new Map.Map("testMap")


		result = ( value ) =>
			f = ( ) =>
				map2.hashMap.has("1").should.be.true
				map2.hashMap.has("2").should.be.true
			check done , f

		map2.addValue(2,{"op":"test2"})
		map2.addValue(1,{"op":"test3"})

		map2.update(@map).then result

	it 'Update map with empty 2' , ( done ) ->
		map2 = new Map.Map("testMap")


		result = ( value ) =>
			f = ( ) =>
				map2.hashMap.has("1").should.be.true
			check done , f

		@map.addValue(1,{"op":"test"})	
		
		map2.update(@map).then result