/// <reference path="./typings/node/node.d.ts"/>

import events = require('events')
//import * as events from "events"

export class Emitter extends events.EventEmitter{
  addListener(event: string, listener: Function): events.EventEmitter{
    return super.addListener(event,listener)
  }
  on(event: string, listener: Function): events.EventEmitter
  {
    return super.on(event,listener)
  }
  once(event: string, listener: Function): events.EventEmitter{
    return super.on(event,listener)
  }
  removeListener(event: string, listener: Function): events.EventEmitter{
    return super.removeListener(event,listener)
  }
  removeAllListeners(event?: string): events.EventEmitter{
    return super.removeAllListeners(event)
  }
  setMaxListeners(n: number): void{
    super.setMaxListeners(n)
  }
  listeners(event: string): Function[]{
    return super.listeners(event)
  }
  emit(event: string, ...args: any[]): boolean{
    return super.emit(event,args)
  }
}
