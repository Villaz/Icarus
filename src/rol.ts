///<reference path='./typings/tsd.d.ts' />
var winston = require('winston');

var capitalize = function(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export abstract class  Rol {

  private type:string;
  protected network:any;
  protected test:boolean;
  protected id:string;

  constructor(type:string, params?: { name:string, test?: boolean, network?:{ discover: any, ports: any, network:any }}){
    this.type = type;
    this.id = params.name;

    if (params !== undefined && params.test !== undefined) this.test = params.test
    else this.test = false

    if (!this.test) {
        try {
            winston.add(winston.transports.File, { filename: type + this.id + '.log' , level:'warning'});
            winston.add(require('winston-graylog2'), {
              name: 'Graylog',
              level: 'warning',
              silent: false,
              handleExceptions: false,
              graylog: {
                servers: [{host: '127.0.0.1', port: 12201}],
                hostname: this.id,
                facility: "leader",
                bufferSize: 1400
              }
            });
        } catch (e){ }
      if (params !== undefined && params.network !== undefined)
        winston.info(type +" %s started in port %s ",this.id, params.network.ports.port);
    }
    if (params !== undefined && !this.test && params.network !== undefined) this.startNetwork(params.network);
  }

  private startNetwork(params: { discover: Discover, ports:any, network:any }){
    var Network = require('./network/'+params.network.type+'/network')[capitalize(this.type)+'Network']

    params.ports['host'] = params.network['host']
    this.network = new Network(params.discover, params.ports)
    this._startNetwork();
  }

  protected abstract _startNetwork();
}
