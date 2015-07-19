/// <reference path="node/node.d.ts" />
/// <reference path="map.d.ts" />
/// <reference path="ballot.d.ts" />
/// <reference path="utils.d.ts" />

declare interface ParamsLeader{
  slot?:number;
  operation?:any;
  ballot?:Ballot;
}



declare interface P2AMessage{
  from:string;
  type:string;
  body:{
    slot:number,
    operation:any,
    ballot:Ballot
  }
}
