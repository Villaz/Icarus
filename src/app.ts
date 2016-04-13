///<reference path='./typings/tsd.d.ts' />
import * as cluster from "cluster";
import * as names from "./name_generator";
import * as Discover from "./discover";

var program = require('commander');
var nconf = require('nconf');

nconf.argv()
   .env()
   .file({ file: '/etc/icarus/icarus.conf'})
   .file({ file: './conf/icarus.conf' })


   program
     .version('0.0.1')
     .option('--acceptor_name [name]', 'Acceptor name',names.generateName().substr(0, 15))
     .option('--leader_name [name]', 'Leader name', names.generateName().substr(0, 15))
     .option('--replica_name [name]', 'replica_name', names.generateName().substr(0, 15))
     .parse(process.argv);


function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function createDiscover(type:string, name:string, rol:string){
  let roles = {}
  roles[rol[0].toUpperCase()] = []
  for (let ports in nconf.get(rol)['ports']){
    roles[rol[0].toUpperCase()].push(nconf.get(rol)['ports'][ports])
  }
  let discover = Discover.Discover.createDiscover(type, {
    name: name,
    port: nconf.get(rol)['discover'],
    roles: roles
  });
  return discover;
}

function createRol(type:string, name:string, discover:Discover.Discover):any{
  var params = { name: name,
                 network: { discover: discover,
                            ports: nconf.get(type)['ports'],
                            network: nconf.get('network')
                          }
               }
  var rol = require("./rol");
  return rol.getRol(type, params)
}

if(cluster.isMaster){
  let roles = {}

  for(let rol of nconf.get("roles")){
     cluster.fork({'rol':rol}).id = rol;
  }
}else{
  let name:string = program[process.env.rol+"_name"]
  let discover = createDiscover('bonjour', name, process.env.rol)
  var rol:any = createRol(process.env.rol, name, discover)
}
