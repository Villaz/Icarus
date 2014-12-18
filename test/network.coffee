should = require 'should'

#path = if not process.env['COV']? then '../lib-cov' else '../lib';
if process.env['coverage']?
    Network = require('../lib-cov/network.js');
else
    Network = require('../lib/network.coffee');


describe 'Network tests', ->

    network = undefined
    

    check = (done,f) ->
        try
            f()
            done()
        catch e
            done(e)

    beforeEach ( ) =>
        @network = new Network.AcceptorNetwork 9999 , true

    afterEach ( ) =>
        do @network.close


    it 'Retrieve replica txt message' , =>
        txt_record = 
            addresses: ['192.168.4.68'],
            data:
                RTA: '8888',
                roles: 'R'

        @network.upNode txt_record
        Object.keys(@network.socketSubs).length.should.be.exactly 1
        #@network.upNode txt_record
        #Object.keys(@network.socketSubs).length.should.be.exactly 1


    it 'Retrieve multiple leader txt messages', =>
        txt_record = 
            addresses: ['192.168.4.68'], 
            data: 
                RTA: '8888', 
                roles: 'R' 

        txt_record2 = 
            addresses: ['192.168.4.69'],
            data: 
                RTA: '8888',
                roles: 'R'

        @network.upNode txt_record
        #Object.keys(@network.socketSubs).length.should.be.exactly 1
        @network.upNode txt_record2
        #Object.keys(@network.socketSubs).length.should.be.exactly 2
        
        
        
        


    