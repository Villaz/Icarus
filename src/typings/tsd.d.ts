/// <reference path="node/node.d.ts" />
/// <reference path="map.d.ts" />


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


declare class Ballot {
    number: number;
    id: string;
    constructor(params?: {
        number: number;
        id: string;
    });
    isMayorThanOtherBallot(ballot: Ballot): boolean;
    isMayorOrEqualThanOtherBallot(ballot: Ballot): boolean;
    isEqual(ballot: Ballot): boolean;
}



declare class Operation extends Object{
  public operation_id:number;
  public client_id:number;
  public operation:any;
  public slot:number;
  public sha:string;
  public equals(o:Operation);
}

declare class Rol{
  Network:any;
  Id:string;
  Test:boolean;
}

declare class Replica extends Rol{
  Decisions:Map<number,Operation>;
}

declare class Acceptor{

}

interface ParamsLeader{
  operation?:Operation;
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
