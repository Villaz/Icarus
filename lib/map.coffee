Map = exports? and exports or @Map = {}

Q = require 'q'
HashMap = require('hashmap').HashMap;

class Map.Map

	getAllKeys:( ) ->

	addValue:( slot , value ) ->

	getValue:( slot ) ->

	getValues:( from , to ) ->

	clear:( ) ->

	remove:( slot ) ->

	close:() ->


	_filterValues :( array , from , to ) ->
		returnArray = new Array()
		for value in array
			if from is undefined and to is undefined  then returnArray.push value

			if from isnt undefined and to is undefined and  value >= from then returnArray.push value

			if from is undefined and to isnt undefined and  value <= to then returnArray.push value

			if from isnt undefined and to isnt undefined and value >= from and value <= to then returnArray.push value
		
		returnArray  


class Map.Redis extends Map.Map

	redisClient = undefined

	constructor:( @db ) ->
		@redisClient = require( "redis" ).createClient()

	getAllKeys:( ) ->
		defer = Q.defer()

		callback = ( err , replies ) ->
			list = [ ]
			
			forEach = (reply , i ) =>
				list.push reply
				if i is replies.length - 1 then defer.resolve( list )

			replies.forEach forEach

		@redisClient.hkeys @db , callback 

		return defer.promise


	addValue:( slot , value ) ->
		
		slot = JSON.stringify(slot) if typeof slot is "object"

		@redisClient.hset @db , slot , JSON.stringify value

	getValue:( slot ) ->
		defer = Q.defer()

		slot = JSON.stringify(slot) if typeof slot is "object"
		@redisClient.hget @db , slot , ( err , reply ) ->
			defer.resolve( JSON.parse reply )
		defer.promise


	getValues:( from , to ) ->
		defer = Q.defer()

		resultGetAllKeys = ( list ) =>
			
			filteredList = @_filterValues list , from , to
								
			@redisClient.hmget @db , filteredList , ( err , reply ) ->
				map = reply.map ( x , y ) ->
					{slot:parseInt(filteredList[y]) , operation: JSON.parse x}
				defer.resolve map
				
		@getAllKeys().then resultGetAllKeys
		return defer.promise

	clear:( ) ->
		@redisClient.del @db

	close:( ) ->
		@redisClient.quit()


class Map.Map extends Map.Map

	hashMap : undefined
	keys : undefined

	constructor:()->
		@hashMap = new HashMap( )
		@keys = new Array()


	getAllKeys:( ) ->

		returnKeys = ( ) =>
			return @keys
		Q.fcall returnKeys

	getAllValues:( ) ->

		values = [ ]
		for key in @keys
			values.push @hashMap.get key

		Q.fcall ( ) =>
			values

	addValue:( slot , value ) ->
		if typeof slot is "object" then slot = JSON.stringify(slot) else slot = slot.toString()

		@hashMap.set(slot,value)
		@keys.push slot if @keys.indexOf(slot) < 0
			
	addValues:( slot , value ) ->
		if typeof slot is "object" then slot = JSON.stringify(slot) else slot = slot.toString()

		if not @hashMap.get(slot)?
			@hashMap.set slot , [value]
		else
			array = @hashMap.get(slot)
			array.push value
			@hashMap.set slot , array

	getValue:( slot ) ->
		if typeof slot is "object" then slot = JSON.stringify(slot) else slot = slot.toString()

		returnValues =  () =>
			return @hashMap.get(slot)
		
		Q.fcall returnValues

	remove: ( slot ) ->
		if typeof slot is "object" then slot = JSON.stringify(slot) else slot = slot.toString()
		@hashMap.remove slot


	getValues:( from , to ) ->
		returnValues = ( ) =>
						
			filteredList = @_filterValues @keys , from , to
			returnMap = []
			for slot in filteredList
				returnMap.push {slot: parseInt(slot) , operation: @hashMap.get(slot) }
			
			return returnMap

		Q.fcall returnValues


	clear:( ) ->
		do @hashMap.clear


	update : ( x ) ->
		deferred = Q.defer()

		values = [ ]
		for key in @keys
			values.push @hashMap.get key

		for key in x.keys when (key not in @keys) and x.hashMap.get(key) not in values
			@addValue(key , x.hashMap.get(key) )
			
		deferred.resolve()
		return deferred.promise

	close:()->

	
