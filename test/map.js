var should = require('should')

if(process.env['coverage'] !== undefined)
	var Map = require('../lib-cov/map.js')
else
	var Map = require('../lib/map.js')

describe('Map tests with Map', function(){



	it('Add value to map', function(){
    var map = new Map.Map()
		map.addValue(1,{"text":"text"})
		map.getValue(1).text.should.be.exactly("text")
  })


	it('Value is overrided', function(){
    var map = new Map.Map()

		map.addValue(1,{"text":"text"})
		map.addValue(1,{"text":"text2"})

		map.getValue(1).text.should.be.exactly("text2")
  })


	it('Add values to map', function(){
    var map = new Map.Map()

    map.addValues(1,{"text":"text1"})
    map.addValues(1,{"text":"text2"})
    var value = map.getValue(1)
		value[0].text.should.be.exactly("text1")
    value[1].text.should.be.exactly("text2")
  })


	it('Number of slots in mapOfValues is 2', function(){
    var map = new Map.Map()

    map.addValue(1,{"text":"text"})
		map.addValue(2,{"text":"text2"})

		var keys = map.getAllKeys()
    keys.length.should.be.exactly(2)
    keys[0].should.be.exactly(1)
    keys[1].should.be.exactly(2)
  })


	it('Return all store values ' , function(){
    var map = new Map.Map()

    map.addValue(1,{"op":"text"})
    map.addValue(2,{"op":"text2"})
    var list = map.getValues()

    list[0].slot.should.be.exactly(1)
    list[1].slot.should.be.exactly(2)
    list[0].operation.op.should.be.exactly("text")
    list[1].operation.op.should.be.exactly("text2")
  })


	it('Return filtered values with from' , function( ){
    var map = new Map.Map()

    map.addValue(1,{"op":"text"})
		map.addValue(2,{"op":"text"})
		map.addValue(3,{"op":"text"})

		var list = map.getValues({start:2})
		list[0].slot.should.be.exactly(2)
    list[1].slot.should.be.exactly(3)
  })


	it('Return filtered values with to', function( ){
    var map = new Map.Map()

    map.addValue(1,{"op":"text"})
    map.addValue(2,{"op":"text"})
    map.addValue(3,{"op":"text"})

    var list = map.getValues({end:2})
    list[0].slot.should.be.exactly(1)
    list[1].slot.should.be.exactly(2)
  })


	it('Return filtered values with from and to', function( ){
    var map = new Map.Map()

    map.addValue(1,{"op":"text"})
		map.addValue(2,{"op":"text"})
		map.addValue(3,{"op":"text"})

    var list = map.getValues({start:2,end:3})
    list[0].slot.should.be.exactly(2)
    list[1].slot.should.be.exactly(3)
  })


	it('Remove values' , function( ){
    var map = new Map.Map()

    map.addValue(1,{"op":"text"})
    map.remove(1)
		should.not.exists(map.getValue(1))
  })


	it('Update map', function(){
    var map = new Map.Map()
    var map2 = new Map.Map()

    map.addValue(1,{"op":"test"})
    map2.addValue(2,{"op":"test2"})

    map2.update(map)
	  map2.hashMap.has(1).should.be.true
    map2.hashMap.has(2).should.be.true
  })


  it('Update map with duplicates', function(){
    var map = new Map.Map()
    var map2 = new Map.Map()

    map.addValue(1,{"op":"test"})
		map2.addValue(2,{"op":"test2"})
		map2.addValue(1,{"op":"test3"})

		map2.update(map)
    map2.hashMap.has(1).should.be.true
    map2.hashMap.has(2).should.be.true
    map2.hashMap.get(1).op.should.be.exactly("test3")
  })

	it('Update map with empty', function( ){
    var map = new Map.Map()
    var map2 = new Map.Map()

    map2.addValue(2,{"op":"test2"})
    map2.addValue(1,{"op":"test3"})

    map2.update(map)
    map2.hashMap.has(1).should.be.true
    map2.hashMap.has(2).should.be.true
  })


	it('Update map with empty 2', function(){
    var map = new Map.Map()
    var map2 = new Map.Map()

    map.addValue(1,{"op":"test"})
		map2.update(map)
    map2.hashMap.has(1).should.be.true
  })


	it('count elements', function(){
		var map = new Map.Map()

		map.count().should.be.exactly(0)

		map.addValue(1,{'op':'test'})
		map.count().should.be.exactly(1)
	})


	it('clear map', function(){
		var map = new Map.Map()
		map.addValue(1,{})
		map.count().should.be.exactly(1)
		map.clear()
		map.count().should.be.exactly(0)
	})

	it('obj is in array', function(){
		var map = new Map.Map()
		var ar = [{"op":"test"},{"op":"test2"}]
		map.inArray({"op":"test"},ar).ok
	})

	it('obj is not in array', function(){
		var map = new Map.Map()
		var ar = [{"op":"test"}, {"op":"test2"}]
		map.inArray({"op":"test3"}, ar).should.be.false
	})
})
