///<reference path='./typings/tsd.d.ts' />

import {Ballot} from "./ballot";
var map = require("./map").Map
var winston = require('winston')
var zmq = require('zmq')
var Promise = require("bluebird")
var Discover = require('./discover')

import Emitter = require('./icarus_utils')

export class Network extends Emitter.Emitter{
    replicas: Array<any>
    leaders: Array<any>
    acceptors: any
    discover: any

    constructor(discover:any, connection: { port: number }) {
        super()
        this.replicas = []
        this.leaders = []
        this.acceptors = []
        this.discover = discover
        this.discover.on('up', (service)=> this.upNode(service))
        this.discover.on('down', (service)=> this.downNode(service))
    }
    
    public upNode(service) {
       
    }
    
    public downNode(service) { }    
}


export class AcceptorNetwork extends Network {

    subscriber: any
    receivedMessages: Array<any>
    private leaderPublisher: any

    constructor(discover: any, connection: { port: number }) {
        super(discover, connection)
        this.startPublisher(connection.port)
        this.subscriber = undefined
        this.receivedMessages = []
    }

    private startPublisher(port: number) {
        this.leaderPublisher = zmq.socket('pub')
        this.leaderPublisher.identity = 'leaderPublisher' + process.pid
        this.leaderPublisher.bindSync('tcp://*:' + port)
    }

    public send(message: any) {
        this.leaderPublisher.send(message.type + " " + JSON.stringify(message))
    }
    
    public startLeaderSubscription(url:string, port:number) {
        if (this.subscriber === undefined){
            this.subscriber = zmq.socket('sub')
            this.subscriber.setsockopt(31, 0) //only IPv4
            this.subscriber.setsockopt(42, 1) //support IPv6
            this.subscriber.identity = "subscriber" + process.pid
            this.subscriber.subscribe('P1A')
            this.subscriber.subscribe('P2A')

            this.subscriber.on('message', (data) => {
                console.log(data.toString())
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
        this.subscriber.connect("tcp://"+url + ":" + port)
    }

    public upNode(node) {
        node = node[0]
        if (node.data.LTA !== undefined) {
            if (this.leaders[node.name] === undefined) {
                this.leaders[node.name] = []
            }
            if (this.leaders[node.name].indexOf(node.addresses[0]) < 0) {
                this.leaders[node.name].push(node.addresses[0])
                this.startLeaderSubscription(node.addresses[0], node.data.LTA)
            }
        }
    }

    public downNode(node) { }
}

export class LeaderNetwork extends Network {

    private membershipServer: any
    private acceptorSubscriber: any
    private acceptorPublisher: any

    constructor(discover: any, connection: { port: number }) {
        super(discover, connection)
        this.startPublisher(connection.port)
    }
    
    private startPublisher(port:number){
        this.acceptorPublisher = zmq.socket('pub')
        this.acceptorPublisher.identity = 'acceptorPublisher' + process.pid
        this.acceptorPublisher.bindSync('tcp://*:'+port)
    }
    
          
    private connectAcceptor(info:{ip:string, port:number}){
        if(this.acceptorSubscriber === undefined){
            this.acceptorSubscriber = zmq.socket('sub')
            this.acceptorSubscriber.setsockopt(31, 0) //only IPv4
            this.acceptorSubscriber.setsockopt(42, 1) //support IPv6
            this.acceptorSubscriber.identity = "acceptorSubscriber" + process.pid
            this.acceptorSubscriber.subscribe('P1B')
            this.acceptorSubscriber.subscribe('P2B')
            this.acceptorSubscriber.on('message', (data) => {
                var messageType = data.toString().substr(0, data.toString().indexOf("{") - 1)
                data = data.toString().substr(data.toString().indexOf("{"))
                data = JSON.parse(data)
                                
                var message = {
                    type: messageType,
                    from: data.from,
                    body: data.body
                }
                message.body.ballot = new Ballot({ number: message.body.ballot.number, id: message.body.ballot.id })
                this.emit('message', message)
            })
        }
        this.acceptorSubscriber.connect("tcp://"+info.ip + ":" + info.port)
        
    }
    
    public sendMessageToAllAcceptors(message){
        console.log("Sending message")
        this.acceptorPublisher.send(message.type+" "+JSON.stringify(message))
    }

    public upNode(node) {
        node = node[0]
        if (node.data.ATL !== undefined) {
            if (this.acceptors[node.name] === undefined) {
                this.acceptors[node.name] = []
            }
            if (this.acceptors[node.name].indexOf(node.addresses[0]) < 0) {
                this.acceptors[node.name].push(node.addresses[0])
                this.connectAcceptor({ ip: node.addresses[0], port: node.data.ATL })
                this.emit('acceptor', node.addresses[0])
            }
        }
    }
}

/*
var d = Discover.Discover.createDiscover('bonjour', { name: 'pepe', port: 8888, roles: { 'ATL': 8889 , 'LTA':8890 } })
var acceptor = new AcceptorNetwork(d, { port: 8889 })
var leader = new LeaderNetwork(d, { port: 8890 })
*/