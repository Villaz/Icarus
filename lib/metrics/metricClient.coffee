express = require('express')
app = new express()
server = require('http').createServer(app)
io = require('socket.io').listen(server)
fs = require 'fs'

app.use(express.static(process.cwd() + '/js'));


app.get '/hello', (req, res) ->
	body = fs.readFileSync("#{__dirname}/index.html")
	console.log body
    #res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', Buffer.byteLength(body.toString()))
	res.end(body.toString())

app.get '/socket.io.js' , ( req , res ) ->
	body = fs.readFileSync("#{__dirname}/socket.io.js")
	res.setHeader('Content-Type','text/plain')
	res.end body.toString()

exists = ( oldObject , newObject ) ->
	if oldObject.name is newObject.name and oldObject.mean is newObject.mean and oldObject.timestamp is newObject.timestamp 
		return true
	else
		return false


metrics = []
socket = require('socket.io-client').connect('http://localhost:9001')
socket.on 'metrics', (data) ->
	data = JSON.parse data

	for metric in data.metrics
		if not metrics[metric.name]?
    		metrics[metric.name] = []
    	exitsObject = false
    	for object in metrics[metric.name]
    		exitsObject = exists( object , metric )
    	metrics[metric.name].push(metric) if not exitsObject
    #console.log metrics


app.listen(3000);