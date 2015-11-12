var should = require('should')

if(process.env['coverage'] !== undefined)
	var Map = require('../lib-cov/map.js')
else
	var Map = require('../lib/map.js')

describe('Map tests with Map', function(){



	it('Add value to map', function(){
    var map = new Map.InternalMap()
		map.set(1,{"text":"text"})
		map.get(1, true).text.should.be.exactly("text")
  })


	it('Value is overrided', function(){
    var map = new Map.InternalMap()

		map.set(1,{"text":"text"})
		map.set(1,{"text":"text2"}, true)

		map.get(1, true).text.should.be.exactly("text2")
  })


	it('Add values to map', function(){
    var map = new Map.InternalMap();

		map.set(1,[]);
    map.set(1,{"text":"text1"});
    map.set(1,{"text":"text2"});

		var value = map.get(1)
		value[0].text.should.be.exactly("text1")
    value[1].text.should.be.exactly("text2")
  })


	it('Number of slots in mapOfValues is 2', function(){
    var map = new Map.InternalMap()

    map.set(1,{"text":"text"})
		map.set(2,{"text":"text2"})

		var keys = map.arrayKeys;
    map.size.should.be.exactly(2)
		keys[0].should.be.exactly(1)
    keys[1].should.be.exactly(2)
  })


	it('Return all store values ' , function(){
    var map = new Map.InternalMap()

    map.set(1,{"op":"text"})
    map.set(2,{"op":"text2"})
    var list = map.arrayValues;
		list[0].op.should.be.exactly("text")
    list[1].op.should.be.exactly("text2")
  })


	it('Return filtered values with from' , function( ){
    var map = new Map.InternalMap()

    map.set(1,{"op":"text"})
		map.set(2,{"op":"text"})
		map.set(3,{"op":"text"})

		var list = map.getValues({start:2})
		list[0].slot.should.be.exactly(2)
    list[1].slot.should.be.exactly(3)
  })


	it('Return filtered values with to', function( ){
    var map = new Map.InternalMap()

    map.set(1,{"op":"text"})
    map.set(2,{"op":"text"})
    map.set(3,{"op":"text"})

    var list = map.getValues({end:2})
    list[0].slot.should.be.exactly(1)
    list[1].slot.should.be.exactly(2)
  })


	it('Return filtered values with from and to', function( ){
    var map = new Map.InternalMap()

    map.set(1,{"op":"text"})
		map.set(2,{"op":"text"})
		map.set(3,{"op":"text"})

    var list = map.getValues({start:2,end:3})
    list[0].slot.should.be.exactly(2)
    list[1].slot.should.be.exactly(3)
  })


	it('Remove values' , function( ){
    var map = new Map.InternalMap()

    map.set(1,{"op":"text"})
    map.delete(1)
		should.not.exists(map.get(1))
  })


	it('Update map', function(){
    var map = new Map.InternalMap()
    var map2 = new Map.InternalMap()

    map.set(1,{"op":"test"})
    map2.set(2,{"op":"test2"})

    map2.update(map)
		map2.has(1).should.be.true
    map2.has(2).should.be.true
  })


  it('Update map with duplicates', function(){
    var map = new Map.InternalMap()
    var map2 = new Map.InternalMap()

    map.set(1,{"op":"test"})
		map2.set(2,{"op":"test2"})
		map2.set(1,{"op":"test3"})

		map2.update(map)
		map2.hashMap.has(1).should.be.true
    map2.hashMap.has(2).should.be.true
    map2.hashMap.get(1).op.should.be.exactly("test3")
  })

	it('Update map with empty', function( ){
    var map = new Map.InternalMap()
    var map2 = new Map.InternalMap()

    map2.set(2,{"op":"test2"})
    map2.set(1,{"op":"test3"})

    map2.update(map)
    map2.hashMap.has(1).should.be.true
    map2.hashMap.has(2).should.be.true
  })


	it('Update map with empty 2', function(){
    var map = new Map.InternalMap()
    var map2 = new Map.InternalMap()

    map.set(1,{"op":"test"})
		map2.update(map)
    map2.hashMap.has(1).should.be.true
  })


	it('count elements', function(){
		var map = new Map.InternalMap()

		map.size.should.be.exactly(0)

		map.set(1,{'op':'test'})
		map.size.should.be.exactly(1)
	})


	it('clear map', function(){
		var map = new Map.InternalMap()
		map.set(1,{})
		map.size.should.be.exactly(1)
		map.clear()
		map.size.should.be.exactly(0)
	})

	it('obj is in array', function(){
		var map = new Map.InternalMap()
		var ar = [{"op":"test"},{"op":"test2"}]
		map.inArray({"op":"test"},ar).ok
	})

	it('obj is not in array', function(){
		var map = new Map.InternalMap()
		var ar = [{"op":"test"}, {"op":"test2"}]
		map.inArray({"op":"test3"}, ar).should.be.false
	})
})
