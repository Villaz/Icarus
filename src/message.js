"use strict";
///<reference path='./typings/tsd.d.ts' />
var crc = require('crc');
var moment = require('moment');
var Message = (function () {
    function Message(params) {
        this.from = params.from;
        this.type = params.type;
        this.command_id = params.command_id;
        this.operation = params.operation;
        this.timestamp = moment().unix();
        var aux = crc.crc32(JSON.stringify(this.from));
        aux = crc.crc32(JSON.stringify(this.type, aux));
        aux = crc.crc32(JSON.stringify(this.command_id), aux);
        aux = crc.crc32(JSON.stringify(this.operation), aux);
        aux = crc.crc32(JSON.stringify(this.timestamp), aux);
        this.crc = aux.toString(16);
    }
    return Message;
}());
exports.Message = Message;
