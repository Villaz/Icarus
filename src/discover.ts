///<reference path='./typings/tsd.d.ts' />

import events = require('events');
var mdns = undefined;

export class Discover extends events.EventEmitter {
    name: string
    protected discoverPort: number;
    protected publisherPort: number;
    protected routerPort: number;
    roles: Array<string>;

    static createDiscover(discoverType: string, params: { name: string, ports:{discover:number, publisher:number, router:number}, roles: Array<string> }):Discover {
        switch (discoverType) {
            case 'bonjour':
                mdns = require('mdns');
                return new DiscoverBonjour(params);
        }
    }
}

export class DiscoverBonjour extends Discover {
    advertisement: any
    browser: any


    constructor(params: { name: string, ports:{discover:number, publisher:number, router:number}, roles: Array<string> }) {
        super()
        this.name = params.name
        this.discoverPort = params.ports.discover;
        this.publisherPort = params.ports.publisher;
        this.routerPort = params.ports.router;
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

    private startAdvertisement() {
        const os = require('os');
        let addresses = [];
        for(let int in os.networkInterfaces())
        {
          if (os.networkInterfaces().hasOwnProperty(int)) {
            for(let v of os.networkInterfaces()[int]){
              if(!v.internal && v.family === 'IPv4')
                addresses.push(v.address);
            }
          }
        }
        let txtRecord = {roles:[],
                          addresses: addresses,
                         ports:[this.publisherPort, this.routerPort]};
        for(let rol of this.roles)
          txtRecord.roles.push(rol.charAt(0).toUpperCase());

        this.advertisement = mdns.createAdvertisement(mdns.udp("icarus"),
                                  this.discoverPort,
                                  {name:this.name,
                                   txtRecord: txtRecord
                                 });
        this.advertisement.start()
    }

    private startBrowser() {
        var sequence = [
          mdns.rst.DNSServiceResolve(),
          mdns.rst.getaddrinfo({families: [4] })
        ];
        this.browser = mdns.createBrowser(mdns.udp("icarus"), {resolverSequence:sequence});
        this.browser.on('serviceUp', (service) => {
            var data = {
                addresses: service.txtRecord.addresses,
                data: service.txtRecord,
                name: service.name,
                network: service.networkInterface
            };
            this.emit('up', data);
        })
        this.browser.on('serviceDown', (service) => {
            let data = {
                addresses: service.addresses,
                data: service.txtRecord,
                name: service.name,
                network: service.networkInterface
            };
            this.emit('down', data);
        });

        this.browser.start()
    }
}
