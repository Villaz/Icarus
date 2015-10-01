///<reference path='./typings/tsd.d.ts' />
import * as cluster from "cluster";
import * as names from "./name_generator";
import {Acceptor} from "./acceptor";
import {Leader} from "./leader";
import * as Discover from "./discover";

function createAndStartAllRoles() {
    var name = names.generateName().substr(0, 15)
    var name2 = names.generateName().substr(0, 15)
    
    var d = Discover.Discover.createDiscover('bonjour', { name: "a", port: 8888, roles: { 'A': 8889, 'L': 8890 } })
    var d2 = Discover.Discover.createDiscover('bonjour', { name: name2, port: 8887, roles: { 'A': 8891 } })
    
    let acceptor = new Acceptor({ name: "a", network: { discover: d, ports: { port: 8889 } } });
    let acceptor2 = new Acceptor({ name: name2, network: {discover: d2, ports: { port: 8891 } } });
    let leader = new Leader({ name: "a", network: { discover: d, ports: { port: 8890 } } });
    
}

if (cluster.isMaster) {
    createAndStartAllRoles()
    cluster.fork();
} else {
    var name3 = names.generateName().substr(0, 15);
    var d3 = Discover.Discover.createDiscover('bonjour', { name: "zzzzzzzzzzz", port: 8887, roles: { 'L': 8892 } })
    let leader2 = new Leader({name: "zzzzzzzzzzz", network: { discover: d3, ports: { port: 8892 } } });
    setInterval(() => { process.exit(0); },10000)
}