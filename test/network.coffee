should = require 'should'

#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
	Network = require('../lib-cov/network.js');
else
	Network = require('../lib/network.coffee');


describe 'Acceptor Network tests', ->

	network : undefined
	counter = 9000

	check = (done,f) ->
		try
			f()
			done()
		catch e
			done(e)

	beforeEach () =>
		do @network?.close
		@network = new Network.AcceptorNetwork( counter ) if not @network?

	afterEach ( ) =>
		do @network?.close
		counter++;


	it 'Retrieve leader txt message' , =>
		txt_record = 
    		{ address: '192.168.4.68', data: { LTA: '8888', roles: 'L' } }

    	txt_record2 = 
    		{ address: '192.168.4.69', data: { LTA: '8888', roles: 'L' } }

    	@network.upNode txt_record
    	Object.keys(@network.socketSubs).length.should.be.exactly 1
    	@network.upNode txt_record
    	Object.keys(@network.socketSubs).length.should.be.exactly 1
    	

    it 'Retrieve multiple leader txt messages', =>
    	txt_record = 
    		{ address: '192.168.4.68', data: { LTA: '8888', roles: 'L' } }

    	txt_record2 = 
    		{ address: '192.168.4.69', data: { LTA: '8888', roles: 'L' } }

    	@network.upNode txt_record
    	Object.keys(@network.socketSubs).length.should.be.exactly 1
    	@network.upNode txt_record2
    	Object.keys(@network.socketSubs).length.should.be.exactly 2
    	
    	
    	
    	


	