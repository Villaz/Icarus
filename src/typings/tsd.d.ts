/// <reference path="node/node.d.ts" />
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

declare class Operation extends Object{
  public operation_id:number;
  public client_id:number;
  public operation:Object;
  public slot:number;
  public sha:string;
  public equals(o:Operation);
}

interface ParamsLeader{
  slot?:number;
  operation?:any;
  ballot?:Ballot;
}

interface CommanderSlot{
  ballot: Ballot,
  operation: any,
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
