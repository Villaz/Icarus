///<reference path='./typings/tsd.d.ts' />
var crc = require('crc');
var moment = require('moment');

export class Message {

    from: string
    to: string
    type: string
    command_id: number
    operation: any
    timestamp: string
    crc: string

    constructor(params: { from: string, to?:string, type: string, command_id: number, operation: any }) {
        this.from = params.from
        this.to = params.to
        this.type = params.type
        this.command_id = params.command_id
        this.operation = params.operation
        this.timestamp = moment().unix()
        var aux = crc.crc32(JSON.stringify(this.from))
        aux = crc.crc32(JSON.stringify(this.type , aux))
        aux = crc.crc32(JSON.stringify(this.command_id), aux)
        aux = crc.crc32(JSON.stringify(this.operation), aux)
        aux = crc.crc32(JSON.stringify(this.timestamp), aux)
        this.crc = aux.toString(16)
    }
}
