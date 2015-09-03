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
        this.memembership("127.0.0.1",8887)
        this.subscriber = undefined
        this.receivedMessages = []
    }

    private memembership(url:string, port:number) {
        //send message UP to Leader
        var message = {
            type: 'UP', self: { ip: '127.0.0.1', rol: 'A', port: 8787 }
        }
        var client = zmq.socket('req')
        client.connect("tcp://"+url+":"+port)
        client.on('message',(message)=>{
            let info = JSON.parse(message.toString())
            for(let leader of info.leaders){
                let exists = false
                for(let le of this.leaders){
                    if(le.ip === leader.ip && le.ports.acceptors === leader.ports.acceptors){
                        exists = true
                        break
                    }
                }
                if(!exists)
                {
                    console.log(leader)
                    this.leaders.push(leader)
                    this.startLeaderSubscription(leader.ip, leader.ports.acceptors)
                }
            }
        })
        client.send(JSON.stringify(message))
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
}

export class LeaderNetwork extends Network {

    private membershipServer: any
    private acceptorSubscriber: any
    private acceptorPublisher: any

    constructor(ports:{membership:number, publisher:number}) {
        super()
        this.leaders.push({ip:'127.0.0.1', ports:{acceptors:ports.publisher, replicas:0}})
        this.startPublisher(ports.publisher)
        this.startMembershipServer(ports.membership)
    }
    
    private startPublisher(port:number){
        this.acceptorPublisher = zmq.socket('pub')
        this.acceptorPublisher.identity = 'acceptorPublisher' + process.pid
        this.acceptorPublisher.bindSync('tcp://*:'+port)
    }
    
    private startMembershipServer(port:number){
        this.membershipServer = zmq.socket('router')
        this.membershipServer.identity = 'membershipServer' + process.pid
        this.membershipServer.bindSync("tcp://*:"+port)
        this.membershipServer.on('message',(envelope, data, dataRequest)=>{
            let message = JSON.parse(dataRequest.toString())
            switch(message.type){
                case 'UP':
                    this.addNode(message.self)
                    let messageToSend = {leaders:this.leaders, acceptors:this.acceptors}
                    this.membershipServer.send([envelope,'',JSON.stringify(messageToSend)])
            }
        })
    }
    
    private addNode(nodeInfo:{ip:string, port:number, rol:string}){
        let exists = false
        for(let acceptor in this.acceptors){
            if(acceptor.ip === nodeInfo.ip && acceptor.port === nodeInfo.port){
                exists = true
                return
            }
        }
        if(!exists){
            this.acceptors.push({ip:nodeInfo.ip, ports:{leaders:nodeInfo.port}})
            this.connectAcceptor(nodeInfo)
            this.emit('acceptor', nodeInfo)
        }
        
    }
    
    private connectAcceptor(info:{ip:string, port:number}){
        if(this.acceptorSubscriber === undefined){
            this.acceptorSubscriber = zmq.socket('sub')
            this.acceptorSubscriber.setsockopt(31, 0) //only IPv4
            this.acceptorSubscriber.setsockopt(42, 1) //support IPv6
            this.acceptorSubscriber.identity = "acceptorSubscriber" + process.pid
            this.acceptorSubscriber.subscribe('P1B')
            this.acceptorSubscriber.subscribe('P2B')
        }
        this.acceptorSubscriber.connect("tcp://"+info.ip + ":" + info.port)
        
    }
}

/*
var leader = new LeaderNetwork({membership:8887,publisher:8788})
var acceptor = new AcceptorNetwork()
*/