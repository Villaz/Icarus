/// <reference path="node/node.d.ts" />
/// <reference path="node/es6.d.ts" />
/// <reference path="map.d.ts" />
/// <reference path="ballot.d.ts" />
/// <reference path="utils.d.ts" />

declare class Discover {
    private name: string
    private port: number
    private roles: any
    static createDiscover(discoverType: string, params: { name: string, port: number, roles: any }):Discover;
}

declare class DiscoverBonjour extends Discover {
    constructor(params: { name: string, port: number, roles: any });
    start(advert: boolean): void;
    stop(): void;
    updateRoles(roles: any): void;
    private startAdvertisement(): void;
    private startBrowser(): void;
}

interface ParamsLeader{
  slot?:number;
  operation?:any;
  ballot?:Ballot;
}

interface CommanderSlot{
  ballot: Ballot,
  operation: any,
  decided: Boolean,
  acceptorsResponse:Set<String>,
  acceptors:Map<Number,Array<String>>
}

interface P2AMessage{
  from:string;
  type:string;
  body:{
    slot:number,
    operation:any,
    ballot:Ballot
  }
}
