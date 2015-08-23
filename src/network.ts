///<reference path='./typings/tsd.d.ts' />

var ballot = require("./ballot")
var map = require("./map").Map
var winston = require('winston')
var zmq = require('zmq')
var Promise = require("bluebird")

import Emitter = require('./icarus_utils')

export class Network extends Emitter.Emitter{
    replicas: Array<any>
    leaders: Array<any>
    acceptors:Array<any>

    constructor() {
        super()
        this.replicas = []
        this.leaders = []
        this.acceptors = []
    }
    
    }


export class AcceptorNetwork extends Network {

    subscriber: any
    receivedMessages: Array<any>

    constructor() {
        super()
        this.memembership()
        this.subscriber = undefined
        this.receivedMessages = []
    }

    private memembership() {
        //send message UP to Leader
        var message = {
            type: 'UP', self: { ip: '127.0.0.1', rol: 'A', port: 8787 }
        }
    }

    public startClient(url, port) {
        if (this.subscriber === undefined){
            this.subscriber = zmq.socket('sub')
            this.subscriber.setsockopt(31, 0) //only IPv4
            this.subscriber.setsockopt(42, 1) //support IPv6
            this.subscriber.identity = "subscriber" + process.pid
            this.subscriber.subscribe('P1A')
            this.subscriber.subscribe('P2A')

            this.subscriber.on('message', (data) => {
                var messageType = data.toString().substr(0, data.toString().indexOf("{") - 1)
                data = data.toString().substr(data.toString().indexOf("{"))
                data = JSON.parse(data)

                if (!this.receivedMessages[data.from])
                    this.receivedMessages[data.from] = []
                for (var obj of this.receivedMessages[data.from])
                    if (obj.crc === data.crc && obj.timestamp == data.timestamp) return
                this.receivedMessages[data.from].push({ crc: data.crc, timestamp: data.timestamp })

                var message = {
                    "type": messageType,
                    "body": data.body
                }

                message.body.ballot = new Ballot({ number: message.body.ballot.number, id: message.body.ballot.id })
                this.emit('message', message)
            })
        }
        this.subscriber.connect(url + ":" + port)
    }
}

export class LeaderNetwork extends Network {

    constructor() {
        super()
    }
}