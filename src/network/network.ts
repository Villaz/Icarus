///<reference path='../typings/tsd.d.ts' />

import {Ballot} from "../ballot";
import * as Message from "../message";

var map = require("../map").Map
var winston = require('winston')
var zmq = require('zmq')
var amqp = require('amqplib/callback_api');
var Promise = require("bluebird")
var Discover = require('../discover')
var Gmetric = require('gmetric');

//import Emitter = require('./icarus_utils')
import * as Emitter from "../icarus_utils";

var nconf = require('nconf');

nconf.argv()
   .env()
   .file({ file: '/etc/icarus/icarus.conf'})
   .file({ file: './conf/icarus.conf' })


export class Network extends Emitter.Emitter{
    replicas: Array<any>
    leaders: Array<any>
    acceptors: Map<string,Set<string>>;
    discover: any

    protected publishers = {};
    protected subscriptions = {};

    protected messagesReceived = {};

    constructor(discover:any) {
        super();
        this.replicas = [];
        this.leaders = [];
        this.acceptors = new Map();
        this.discover = discover;
        this.discover.on('up', (service)=> this.upNode(service));
        this.discover.on('down', (service)=> this.downNode(service));
        for (let rol in nconf.get('cluster')){
          for (let instance in nconf.get('cluster')[rol]){
            let aux = { addresses: [ nconf.get('cluster')[rol][instance]['ip'] ],
                        data: {},
                        name: nconf.get('cluster')[rol][instance]['name'],
                      }
            aux.data[rol[0].toUpperCase()] = nconf.get('cluster')[rol][instance]['ports'].join()
            this.upNode([aux])
          }
        }
    }

    protected startPublisher(port: number, name:string):void {}

    protected subscription(params: { url?: string, port?: number, name?: string, subscriptions: Array<string>}):void {}

    protected createSubscription(name: string, subscriptions: Array<string>, url: string, port: number):void {}

    public send(name: string, message:Message.Message):void{}

    protected processMessage(data: any, type: string){}

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
            if( node['network'] === undefined) return;
            if (!this.acceptors.has(node.name))
                this.acceptors.set(node.name, new Set());
            for (let url of node.addresses){
              if (!this.acceptors.get(node.name).has(url)){
                this.acceptors.get(node.name).add(url)
                this._upNode('A', url, node.data.A);
              }
            }
        }

        if (node.data.R !== undefined) {
            if (this.replicas[node.name] === undefined) {
                this.replicas[node.name] = new Set();
            }
            for (let url of node.addresses){
              if (!this.replicas[node.name].has(url)){
                this.replicas[node.name].add(url)
                this._upNode('R', url, node.data.R);
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

    protected _upNode(type: string, url:string, port:any){
      switch (type) {
          case 'A':
              this.emit('acceptor', url);
              break;
          case 'R':
              this.emit('replica', url);
              break;
          case 'L':
              this.emit('leader', url);
              break;
      }
    };
}
