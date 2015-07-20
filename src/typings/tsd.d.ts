/// <reference path="node/node.d.ts" />
/// <reference path="map.d.ts" />
/// <reference path="ballot.d.ts" />
/// <reference path="utils.d.ts" />

interface ParamsLeader{
  slot?:number;
  operation?:any;
  ballot?:Ballot;
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
