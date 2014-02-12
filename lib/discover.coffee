
Discover = exports? and exports or @Discover = {}

{EventEmitter} = require 'events'

class Discover.Discover extends EventEmitter

	advertisement : null
	browser : null
	roles : {}

	constructor:( @serviceName , @servicePort , @roles = {} ) ->

	start:( advert = true )->
		if not @serviceName? then throw new Error 'ServiceName cannot be null'
		if not @servicePort? then throw new Error 'ServicePort cannot be null'

		@__startBrowser( )
		if advert then @__startAdvertisement( )

	
	stop:( )->
		@advertisement.stop()

	updateRoles:( @roles ) ->
		@stop( )
		setTimeout @__startAdvertisement , 5000
	
	
	__startAdvertisement:( ) =>
		mdns = require 'mdns2'
		@advertisement = mdns.createAdvertisement mdns.tcp( @serviceName ) , @servicePort , {txtRecord: @roles}
		@advertisement.start();

	__startBrowser:( ) ->
		mdns = require 'mdns2'
		@browser = mdns.createBrowser mdns.tcp( @serviceName )

		@browser.on 'serviceUp' , ( service ) =>
			data = 
				address : service.addresses[0]
				data : service.txtRecord
			@emit 'up' , data
		
		@browser.on 'serviceDown' , ( service ) =>
			@emit 'down' , service 

		@browser.on 'serviceChanged', ( service ) =>
		
		@browser.start()

