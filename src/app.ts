///<reference path='./typings/tsd.d.ts' />
import * as cluster from "cluster";
import * as names from "./name_generator";
import {Acceptor} from "./acceptor";
import {Leader} from "./leader";
import * as Discover from "./discover";

function createAndStartAllRoles() {
    var name = names.generateName().substr(0,15)
    var d = Discover.Discover.createDiscover('bonjour', { name: name, port: 8888, roles: { 'ATL': 8889, 'LTA': 8890 } })
    let acceptor = new Acceptor({ name: name, network: { discover: d, ports: { port: 8889 } } });
    let leader = new Leader({ name: name, network: { discover: d, ports: { port: 8890 } } });
}

if (cluster.isMaster) {
    createAndStartAllRoles()
} else {
}