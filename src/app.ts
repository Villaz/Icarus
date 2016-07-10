///<reference path='./typings/tsd.d.ts' />
import * as cluster from "cluster";
import * as names from "./name_generator";
import {Discover as Discover} from "./discover";
import {ZMQNetwork as Network} from "./network/zmq/network";

const program = require("commander");
const nconf = require("nconf");

program
  .version("0.0.1")
  .option("--acceptor_name [name]", "Acceptor name", names.generateName().substr(0, 15))
  .option("--leader_name [name]", "Leader name", names.generateName().substr(0, 15))
  .option("--replica_name [name]", "replica_name", names.generateName().substr(0, 15))
  .option("--conf [configuration]", "configuration file")
  .parse(process.argv);


if (program["conf"])
  nconf.argv().env().file({file: program["conf"]});
else {
  nconf.argv()
       .env()
       .file({ file: "/etc/icarus/icarus.conf"})
       .file({ file: "./conf/icarus.conf" });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


if (cluster.isMaster) {
  const rol = require("./rol");
  for (let cluster of nconf.get("clusters")) {
    let name = names.generateName().substr(0, 15);
    let discover = Discover.createDiscover("bonjour", {name: name, ports: cluster.network.ports, roles: cluster.roles});
    let network = new Network(discover, cluster.network.ports);
    rol.getRol("replica", {name: name, network: network});
  }
}

/*
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
*/
