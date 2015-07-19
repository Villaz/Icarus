/// <reference path="../src/typings/node/node.d.ts" />
import events = require('events');
export declare class Emitter extends events.EventEmitter {
    addListener(event: string, listener: Function): events.EventEmitter;
    on(event: string, listener: Function): events.EventEmitter;
    once(event: string, listener: Function): events.EventEmitter;
    removeListener(event: string, listener: Function): events.EventEmitter;
    removeAllListeners(event?: string): events.EventEmitter;
    setMaxListeners(n: number): void;
    listeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
}
