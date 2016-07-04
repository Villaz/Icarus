///<reference path='../typings/tsd.d.ts' />

import {Ballot} from "../ballot";
import * as Message from "../message";
import events = require('events');

export enum Type{
  PUB
}

export class Network extends events.EventEmitter{
    replicas: Map<string,Set<string>>;
    leaders: Map<string,Set<string>>;
    acceptors: Map<string,Set<string>>;
    discover: any;

    protected messagesReceived:Map<String, Set<any>> = new Map();

    constructor(discover:any) {
        super();
        this.replicas = new Map();
        this.leaders = new Map();
        this.acceptors = new Map();
        this.discover = discover;
        this.discover.on('up', (service)=> this.upNode(service));
        this.discover.on('down', (service)=> this.downNode(service));
    }

    public upNode(node) {
        const newNode = !this.replicas.has(node.name) || !this.leaders.has(node.name) || !this.acceptors.has(node.name);
        if(node.data.roles.indexOf('A') >= 0)
          this.addRol(this.acceptors, node);

        if (node.data.roles.indexOf('L') >= 0)
            this.addRol(this.leaders, node);

        if (node.data.roles.indexOf('R') >= 0)
            this.addRol(this.replicas, node);

        if(newNode)
          this._upNode(node);
    }

    private addRol(rol:Map<string,Set<string>>, node:any){
      if(!rol.has(node.name))
        rol.set(node.name, new Set());
      if( !(node.addresses instanceof String))
        for (const url of node.addresses)
          if (!rol.get(node.name).has(url))
            rol.get(node.name).add(url);
      else
        if (!rol.get(node.name).has(node.addresses))
          rol.get(node.name).add(node.addresses);
    }

    public downNode(node) {
        if (node.name === this.discover.name) return
        if (this.leaders[node.name] !== undefined) {
            delete this.leaders[node.name];
            this.emit('leaderDown', node.name);
        } else if (this.acceptors.has(node.name)) {
            this.acceptors.delete(node.name);
            this.emit('acceptorDown', node.name);
        } else if (this.replicas[node.name] !== undefined) {
            delete this.replicas[node.name];
            this.emit('replicaDown', node.name);
        }
    }

    protected _upNode(node){
      if(node.data.roles.indexOf('A') >= 0)
          this.emit('acceptor', node.addresses[0]);
      if(node.data.roles.indexOf('R') >= 0)
          this.emit('replica', node.addresses[0]);
      if(node.data.roles.indexOf('L') >= 0)
          this.emit('leader', node.addresses[0]);
    }

    protected generateBufferMessage(message:Message.Message){
      const CHUNK = 1024 * 1024;
      let bufferArray = [];
      bufferArray.push(new Buffer(message.type));
      var buffer = new Buffer(JSON.stringify(message));
      if (buffer.length > CHUNK){
        for (let pos=0; pos < buffer.length; pos += CHUNK){
          const aux = new Buffer(CHUNK);
          const copied = buffer.copy(aux, 0, pos, pos + CHUNK);
          if (copied < CHUNK){
            const cutted = new Buffer(copied);
            aux.copy(cutted, 0 , 0, copied);
            bufferArray.push(cutted)
          }else{
            bufferArray.push(aux)
          }
        }
      }else{
        bufferArray.push(buffer);
      }
      return bufferArray;
    }
}
