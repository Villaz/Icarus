///<reference path='./typings/tsd.d.ts' />

import events = require('events');
var mdns = undefined;

export class Discover extends events.EventEmitter {
    name: string
    port: number
    roles: any

    static createDiscover(discoverType: string, params: { name: string, port: number, roles: any }):Discover {
        switch (discoverType) {
            case 'bonjour':
                mdns = require('mdns');
                return new DiscoverBonjour(params);
            case 'hefesto':
                return new DiscoverHefesto(params);
        }
    }
}

export class DiscoverBonjour extends Discover {
    advertisement: any
    browser: any


    constructor(params: { name: string, port: number, roles: any }) {
        super()
        this.name = params.name
        this.port = params.port
        this.roles = params.roles
        this.start()
    }

    public start(advert = true) {
        this.startBrowser()
        if (advert) this.startAdvertisement()
    }

    public stop() {
        this.advertisement.stop()
    }

    public updateRoles(roles: any) {
        this.stop()
        setTimeout(this.startAdvertisement, 5000)
    }

    private startAdvertisement() {
        this.advertisement = mdns.createAdvertisement(mdns.udp("icarus"), this.port, {name:this.name, txtRecord: this.roles })
        this.advertisement.start()
    }

    private startBrowser() {
        var sequence = [
          mdns.rst.DNSServiceResolve(),
          mdns.rst.getaddrinfo({families: [4] })
        ];
        this.browser = mdns.createBrowser(mdns.udp("icarus"), {resolverSequence:sequence})
        var self = this
        this.browser.on('serviceUp', (service) => {
            var data = {
                addresses: service.addresses,
                data: service.txtRecord,
                name: service.name,
                network: service.networkInterface
            }
            self.emit('up', data)
        })
        this.browser.on('serviceDown', (service) => {
            let data = {
                addresses: service.addresses,
                data: service.txtRecord,
                name: service.name,
                network: service.networkInterface
            }
            self.emit('down', data)
        })
        this.browser.on('serviceChanged', (service) => {
        })
        this.browser.start()
    }
}

export class DiscoverHefesto extends Discover{

  private zmq = require('zmq');
  private server:any;
  private nodes:Set<string>;

  constructor(params: { name: string, port: number, roles: any }) {
      super()
      this.name = params.name
      this.port = params.port
      this.roles = params.roles
      this.nodes = new Set<string>();
      this.start()
  }

  private start():void{
    let interval = setInterval(()=>{
      let message = {address: this.getIPs()[0], name:this.name, data: this.roles };
      let client = this.zmq.socket('dealer');
      client.connect('tcp://localhost:6666');
      client.send(JSON.stringify(message));
      client.close();
    }, 1000);


    let socket = this.zmq.socket('sub');
    socket.connect('tcp://localhost:5555');
    socket.subscribe('INFO');
    socket.on('message', (data)=>{
      clearInterval(interval);
      this.startPing();
      data = data.toString();
      let messageType = data.substr(0, data.indexOf(' '));
      let message = JSON.parse(data.substr(data.indexOf(' ')+1));
      //check UPs
      this.processUPs(message);
      //check Downs
      this.processDowns(message);
    });
  }

  private startPing():void{
    setInterval(()=>{
      let message = {address: this.getIPs()[0], name:this.name, type:"PING"};
      let client = this.zmq.socket('dealer');
      client.connect('tcp://localhost:6666');
      client.send(JSON.stringify(message));
      client.close();
    }, 1000);
  }

  private processUPs(message):void
  {
    for(let node of message.nodes ){
      let key = node.address + '/' + node.name;
      if(!this.nodes.has(key)){
        this.nodes.add(key);
        let data = {
            addresses: [node.address],
            data: node.data,
            name: node.name,
            network: undefined
          }
          this.emit('up', data);
      }
    }
  }

  private processDowns(message):void
  {
    for(let node of this.nodes){
      let exists:boolean = false;
      for(let node2 of message.nodes){
        let key = node2.address + '/' + node2.name;
        if(node === key){
          exists = true;
          break;
        }
      }
      if(!exists){
        let ip = node.substr(0, node.indexOf("/"));
        let name = node.substr(node.indexOf("/")+1);
        let data = {
          addresses: [ip],
          data: undefined,
          name: name,
          network: undefined
        }
        console.log(data);
        this.emit('down', data);
      }
    }
  }

  private getIPs():Array<string>{
    let addresses = []
    const networks = require('os').networkInterfaces()
    for (let network in networks)
      for(let sub of networks[network])
          if(!sub.internal && sub.family !== 'IPv6')
            addresses.push(sub.address);
    return addresses;
  }
}
