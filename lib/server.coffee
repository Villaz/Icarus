Server = exports? and exports or @Server = {}

Replica = require('./replica').Replica
Q = require('q')

class Server.Server extends Replica

	execute:(message)->
		
		deferred = do Q.defer
		result = 0
		
		if message.operation.type is 'SUM'
			for val in message.operation.values
				result += val
		
		return Q.fcall () ->
			return JSON.stringify {status:200, result:result}

	resolved:(result) ->