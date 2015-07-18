declare class Map {
    private hashMap;
    private keys;
    constructor();
    count(): number;
    getAllKeys(): Array<number>;
    getAllValues<K>(): Array<K>;
    addValue<T>(slot: number, value: T): void;
    addValues<T>(slot: number, value: T): void;
    getValue<T>(slot: number): T;
    remove(slot: number): void;
    getValues(range:{start?: number; end?: number}): any[];
    clear(): void;
    update(x: Map): void;
    private filterValues(array, start?, end?);
    private inArray<T>(obj, values);
}
