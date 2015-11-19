///<reference path='./typings/tsd.d.ts' />
import * as cluster from "cluster";
import * as names from "./name_generator";
import {Acceptor} from "./acceptor";
import {Leader} from "./leader";
import {Replica} from "./replica";
import * as Discover from "./discover";

var nconf = require('nconf');

nconf.argv()
   .env()
   .file({ file: './conf/icarus.conf' });


function createAndStartRol(){

}

if(cluster.isMaster){
  let roles = {}

  for(let rol of nconf.get("roles")){
     cluster.fork({'rol':rol}).id = rol;
  }
}else{
  var name = names.generateName().substr(0, 15)
  if(process.env.rol === 'acceptor'){
      var d = Discover.Discover.createDiscover('bonjour', { name: name, port: nconf.get("acceptor")['discover'], roles: {'A':nconf.get("acceptor")['port']}});
    var rol:any = new Acceptor({ name: name,
                             network: { discover: d,
                                        ports: { port: nconf.get("acceptor")['port'] } } });
  }
  else if(process.env.rol === 'leader'){
      var d = Discover.Discover.createDiscover('bonjour', {
        name: name,
        port: nconf.get("leader")['discover'],
        roles: {
          'L':[ nconf.get("leader")['port'],
                nconf.get("leader")['replica']
              ]
        }
      });
      var rol:any = new Leader({ name: name,
                             network: { discover: d,
                                        ports: { port: nconf.get("leader")['port'],
                                                 replica: nconf.get("leader")['replica']
                                               }
                                      }
                               });
  }
  else if (process.env.rol === 'replica'){
      var d = Discover.Discover.createDiscover('bonjour', { name: name, port: nconf.get("replica")['discover'], roles: {'R':nconf.get("replica")['port']}});
      var rol:any = new Replica({ name: name,
                                  network: { discover: d,
                                  ports: { port: nconf.get("replica")['port'] ,
                                           client: nconf.get("replica")['client']} } });
  }
}
