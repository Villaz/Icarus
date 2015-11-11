/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/node/es6.d.ts" />
declare class InternalMap<K, T> {
    private hashMap;
    constructor();
    size: number;
    keys: Iterator<K>;
    values: Iterator<T[]>;
    set(slot: K, value: T): void;
    get(slot: K): any;
    has(slot: K): boolean;
    delete(slot: K): void;
    getValues(range: {
        start?: K;
        end?: K;
    }): any[];
    clear(): void;
    update(x: InternalMap<K, T[]>): void;
    private filterValues(range?);
    private inArray<T>(obj, values);
}
