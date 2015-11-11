﻿///<reference path='./typings/tsd.d.ts' />

import {Ballot} from "./ballot";
import * as Message from "./message";

var map = require("./map").Map
var winston = require('winston')
var zmq = require('zmq')
var Promise = require("bluebird")
var Discover = require('./discover')

//import Emitter = require('./icarus_utils')
import * as Emitter from "./icarus_utils";

export class Network extends Emitter.Emitter{
    replicas: Array<any>
    leaders: Array<any>
    acceptors: any
    discover: any

    private publishers = {};
    private subscriptions = {};

    private messagesReceived = {};

    constructor(discover:any, connection: { port: number }) {
        super();
        this.replicas = [];
        this.leaders = [];
        this.acceptors = [];
        this.discover = discover;
        this.discover.on('up', (service)=> this.upNode(service));
        this.discover.on('down', (service)=> this.downNode(service));
    }

    protected startPublisher(port: number, name:string) {
        var publisher = zmq.socket('pub');
        publisher.identity = `${name}${process.pid}`;
        publisher.bindSync('tcp://*:' + port);
        this.publishers[name] = publisher;
    }

    protected subscription(params: { url: string, port: number, name: string, subscriptions: Array<string>}) {
        if (this.subscriptions[params.name] === undefined) {
            this.subscriptions[params.name] = this.createSubscription(params.name, params.subscriptions, params.url, params.port)
        }
        this.subscriptions[params.name].connect(`tcp://${params.url}:${params.port}`);
    }

    private createSubscription(name: string, subscriptions: Array<string>, url: string, port: number) {
        let subscriber = zmq.socket('sub')
        subscriber.setsockopt(31, 0) //only IPv4
        subscriber.setsockopt(42, 1) //support IPv6
        subscriber.identity = name + process.pid
        for (var sub of subscriptions) {
            subscriber.subscribe(sub)
        }

        var self = this;
        subscriber.on('message', (data) => {
            var messageType = data.toString().substr(0, data.toString().indexOf("{") - 1)
            data = data.toString().substr(data.toString().indexOf("{"))
            data = JSON.parse(data)
            if (!self.messagesReceived[data.from])
                self.messagesReceived[data.from] = []
            for (var obj of self.messagesReceived[data.from])
                if (obj.crc === data.crc && obj.timestamp == data.timestamp)
                    return
            self.messagesReceived[data.from].push({ crc: data.crc, timestamp: data.timestamp })
            self.processMessage(data, messageType);
        });
        return subscriber;
    }

    public send(name: string, message:Message.Message) {
        this.publishers[name].send(message.type + " " + JSON.stringify(message));
    }

    protected processMessage(data: any, type: string) { }

    public upNode(node) {
        node = node[0]
        if (node.name == this.discover.name) return
        if (node.data.L !== undefined) {

            if (this.leaders[node.name] === undefined) {
                this.leaders[node.name] = new Set();
            }
            for (let url of node.addresses){
              if (!this.leaders[node.name].has(url)){
                this.leaders[node.name].add(url)
                this._upNode('L', url, node.data.L);
              }
            }

        }
        if (node.data.A !== undefined) {
            if (this.acceptors[node.name] === undefined) {
                this.acceptors[node.name] = new Set();
            }
            for (let url of node.addresses){
              if (!this.acceptors[node.name].has(url)){
                this.acceptors[node.name].add(url)
                this._upNode('A', url, node.data.A);
              }
            }
        }

    }

    public downNode(node) {
        node = node[0];
        if (node.name === this.discover.name) return
        if (this.leaders[node.name] !== undefined) {
            delete this.leaders[node.name];
            this.emit('leaderDown', node.name);
        } else if (this.acceptors[node.name] !== undefined) {
            delete this.acceptors[node.name];
            this.emit('acceptorDown', node.name);
        } else if (this.replicas[node.name] !== undefined) {
            delete this.replicas[node.name];
            this.emit('replicaDown', node.name);
        }


    }

    protected _upNode(type: string, url:string, port:number){}

}


export class AcceptorNetwork extends Network {

    subscriber: any
    private acceptorSubscriber: any
    receivedMessages: Array<any>
    private counter:number=0

    constructor(discover: any, connection: { port: number }) {
        super(discover, connection)
        this.startPublisher(connection.port, 'ATLP')
        this.subscriber = undefined
        this.receivedMessages = []
    }

    public sendToLeaders(message: any) {
        this.send('ATLP', message);
    }

    public sendToAcceptors(message: any) {
    }

    protected processMessage(data:any, type:string) {
       var message = {
            "type": type,
            "operation": data.operation,
            "from": data.from
       }
       if(type !== 'REC')
            message.operation.ballot = new Ballot({ number: message.operation.ballot.number, id: message.operation.ballot.id })
       this.emit('message', message)
   }

    protected _upNode(type: string, url:string, port:number) {
        switch (type) {
            case 'L':
                this.subscription({ name: "subscriberLeader", subscriptions: ['P1A', 'P2A'], url: url, port: port});
                break;
            case 'A':
                this.subscription({ name: "subscriberAceptor", subscriptions: ['REC'], url: url, port: port });
                break;
        }
    }

    public downNode(node) { }
}

export class ReplicaNetwork extends Network {

    private clientRouter:any;
    private clients = {};

    constructor(discover: any, connection: { port: number, client:number }) {
        super(discover, connection)
        this.startPublisher(connection.port, 'RTLP');
    }

    private startRouter(port:number) {
        this.clientRouter = zmq.socket('router');
        this.clientRouter.bind(`tcp://*:${port}`);
        this.clientRouter.on('message', function (envelope, b, message) {
            message = JSON.parse(message);
            this.clients[`${message.client}-${message.operation_id}`] = envelope
            this.emit('propose', message);
        });
    }

    public responde(message) {
        let envelope = this.clients[`${message.client}-${message.operation_id}`];
        this.clientRouter.send([envelope, "", JSON.stringify(message)]);
    }

    protected processMessage(data: any, type: string) {
        var message = {
            type: type,
            from: data.from,
            operation: data.operation
        }
        message.operation.ballot = new Ballot({ number: message.operation.ballot.number, id: message.operation.ballot.id })
        this.emit('message', message)
    }


    protected _upNode(type:string, node:any) {
        switch (type) {
            case 'L':
                this.subscription({ name: "subscriberLeader", subscriptions: ['ADOPTED'], url: node.addresses[0], port: node.data.L });
                break;
        }
    }
}


export class LeaderNetwork extends Network {

    private membershipServer: any
    private acceptorSubscriber: any

    constructor(discover: any, connection: { port: number }) {
        super(discover, connection)
        this.startPublisher(connection.port, "LTAP");
    }

    public sendToAcceptors(message:Message.Message) {
        this.send("LTAP", message);
    }

    public sendToReplicas(message: any) { }

    protected processMessage(data: any, type: string) {
        var message = {
            type: type,
            from: data.from,
            operation: data.operation
        }
        message.operation.ballot = new Ballot({ number: message.operation.ballot.number, id: message.operation.ballot.id })
        this.emit('message', message)
    }

    protected _upNode(type: string, url:string, port:number) {
        switch (type) {
            case 'A':
                this.subscription({ name: "acceptorSubscriber", subscriptions: ['P1B', 'P2B'], url: url, port: port});
                this.emit('acceptor', url);
                break;
        }
    }
}

/*
var d = Discover.Discover.createDiscover('bonjour', { name: 'pepe', port: 8888, roles: { 'ATL': 8889 , 'LTA':8890 } })
var acceptor = new AcceptorNetwork(d, { port: 8889 })
var leader = new LeaderNetwork(d, { port: 8890 })
*/
