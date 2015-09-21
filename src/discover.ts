///<reference path='./typings/tsd.d.ts' />

var Promise = require("bluebird")
var ballot = require("./ballot")
var winston = require('winston')
var underscore = require("underscore")
var dgram = require('dgram')
var mdns = require('mdns')

import Emitter = require('./icarus_utils')


export class Discover extends Emitter.Emitter {
    name: string
    port: number
    roles: any

    static createDiscover(discoverType: string, params: { name: string, port: number, roles: any }):Discover {
        switch (discoverType) {
            case 'bonjour':
                return new DiscoverBonjour(params)
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
        this.advertisement = mdns.createAdvertisement(mdns.tcp("icarus"), this.port, {name:this.name, txtRecord: this.roles })
        this.advertisement.start()
    }

    private startBrowser() {
        this.browser = mdns.createBrowser(mdns.tcp("icarus"))
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
                name: service.host.substring(0, service.host.length - 1).replace(".local", ""),
                network: service.networkInterface
            }
            self.emit('down', data)
        })
        this.browser.on('serviceChanged', (service) => {
        })
        this.browser.start()
    }
}

/*
export class DiscoverUDP extends Discover
{
    nodes: any
    interface:any

    constructor(params: { name: string, port: number, roles: any }) {
        super()
        this.name = params.name
        this.port = params.port
        this.roles = params.roles
    }

    public start() {
        var processMessage = (message, rdata) => {
            message = JSON.parse(message)
            this.nodes ['message'] = new Date()
            this.emit('up', message)
        }
        var server = dgram.createSocket('udp4')
        server.on('message' , processMessage)
        server.bind(8080, () => {
            server.setBroadcast(true)
            server.setMulticastTTL(128)
            server.addMembership('230.185.192.108')
        })
        setInterval(this.sendUDP, 60000)
        setInterval(this.checkDown , 180000)
        this.sendUDP()
    }

    private retrieve_ip(){
        return require('os').networkInterfaces()[this.interface][0]['address']
    }

    private sendUDP(){
        var message = {
            address: this.retrieve_ip(),
            data: this.roles
        }
        var bufferMessage = new Buffer(JSON.stringify(message))
        var client = dgram.createSocket("udp4")
        client.bind(5001, () => {
            client.setBroadcast(true)
            client.setMulticastTTL(128)
            client.addMembership('230.185.192.108')
            client.send(bufferMessage, 0, bufferMessage.length, 8080, "128.141.72.127", (err, bytes) => {
                client.close()
            })
        })
    }

    private checkDown() {
        var date = new Date()
        for (var node of this.nodes) {
            var difference = (date - node) / 1000
            if (difference > 20) this.emit('down', '')
        }
    }
}
}
*/


