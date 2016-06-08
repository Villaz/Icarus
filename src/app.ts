///<reference path='./typings/tsd.d.ts' />
import * as cluster from "cluster";
import * as names from "./name_generator";
import * as Discover from "./discover";

var program = require('commander');
var nconf = require('nconf');

program
  .version('0.0.1')
  .option('--acceptor_name [name]', 'Acceptor name',names.generateName().substr(0, 15))
  .option('--leader_name [name]', 'Leader name', names.generateName().substr(0, 15))
  .option('--replica_name [name]', 'replica_name', names.generateName().substr(0, 15))
  .option('--conf [configuration]', 'configuration file')
  .parse(process.argv);


if(program['conf'])
  nconf.argv().env().file({file: program['conf']});
else{
  nconf.argv()
       .env()
       .file({ file: '/etc/icarus/icarus.conf'})
       .file({ file: './conf/icarus.conf' })
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function createDiscover(type:string, name:string, rol:any){
  let roles = {}
  roles[process.env.rol[0].toUpperCase()] = []
  for (let ports in rol['ports']){
    roles[process.env.rol[0].toUpperCase()].push(rol['ports'][ports])
  }
  let discover = Discover.Discover.createDiscover(type, {
    name: name,
    port: rol['discover'],
    roles: roles
  });
  return discover;
}

function createRol(rol:any, name:string, discover:Discover.Discover):any{
  var params = { name: name,
                 network: { discover: discover,
                            ports: rol['ports'],
                            network: nconf.get('network'),
                          },
               }
  var rol = require("./rol");
  return rol.getRol(process.env.rol, params)
}

if(cluster.isMaster){
  for(let rol of nconf.get("roles")){
    let counter = 1;
    for(let r of nconf.get(rol+"s"))
      cluster.fork({'data':JSON.stringify(r), 'rol': rol}).id = rol+counter;
  }
}else{
  let name:string = program[process.env.rol+'_name']
  let discover = createDiscover('bonjour', name, JSON.parse(process.env.data))
  var rol:any = createRol(JSON.parse(process.env.data), name, discover)
}
