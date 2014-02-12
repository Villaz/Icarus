zmq = require 'zmq'

socket = zmq.socket 'sub'
socket.bindSync("tcp://*:9200")


send = ( ) =>
	data = { ballot:{number:1,id:'localhost'}}
	socket.send("P1A #{JSON.stringify data}")

setInterval send , 200