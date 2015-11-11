///<reference path='./typings/tsd.d.ts' />

var HashMap = require('hashmap').HashMap
var underscore = require('underscore')

/**
 * Auxiliar class to store all the operations with an assigned slot.
 * @class Map
 */
export class InternalMap<K,T>{

  private hashMap:Map<any,any>;
  //private keys:Array<number>

  /**
  * @class Map
  * @constructor
  */
  constructor(){
      this.hashMap = new Map( )
      //this.keys = new Array()
  }

  /**
  * Returns the number of keys stored in the Map
  *@method count
  */
  get size():number{
    return this.hashMap.size;
  }

  /**
  * Returns a list with all keys
  *@method getAllKeys
  */
  get keys():Iterator<K>{
    return this.hashMap.keys();
  }

  /**
  * Returns all values stored in the Map
  *@method getAllValues
  */
  get values( ):Iterator<T[]>{
    return this.hashMap.values();
  }

  /**
  * Stores a new object with the given slot, if the slot exists it is overrided
  *@method addValue
  *@param {number} slot
  *@param {T} value
  */
  public set( slot:K , value:T , override:boolean=false ){
    if(!this.has(slot) || override)
      this.hashMap.set(slot, value);
    else{
      if (Array.isArray(this.get(slot)))
        this.hashMap.get(slot).push(value);
      else
        this.hashMap.set(slot, [this.hashMap.get(slot),value]);
    }
  }

  /**
  * Returns the object or objects stored in a given slot
  *@method getValue
  *@param {number} slot
  */
  public get(slot:K):any{
    return this.hashMap.get(slot);
  }

  public has( slot:K ):boolean{
    return this.hashMap.has(slot);
  }


  /**
  * Removes the slot from the map
  *@method remove
  *@param {number} slot
  */
  public delete( slot:K ){
    this.hashMap.delete(slot)
  }

  /**
  * Returns all the values stored in a range of slots
  * If the start param is not defined , the function returns from slot 1
  * If the end param is not defined, the function returns till the last slot
  *@method getValues
  *@param {Object} range
  *@param {number} [range.start] Slot to start
  *@param {number} [range.end] Slot to end
  */
  public getValues(range:{start?:K , end?:K}){
    var values:Array<any> = []
    var filteredList = this.filterValues(range)
    for (var slot of filteredList)
      values.push({slot:slot, operation: this.hashMap.get(slot)})
    return values
  }

  /**
  * Removes all slots
  *@method clear
  */
  public clear( ){
      this.hashMap.clear()
  }

  /**
  * Update the actual map with the values of the new one
  * If the slot exists in the actual one, the slot is overrided
  *@method update
  *@param {Map} x
  */
  public update(x:InternalMap<K,T[]>){
    var values = this.values;
    let keys:any;
    if (x.keys === undefined) return;

    let iterator = x.keys;
    let entry = iterator.next();
    while(!entry.done){
      let key = entry.value;
      if(!this.hashMap.has(key))
          this.hashMap.set(key, x.get(key));
      entry = iterator.next();
    }
  }

  /**
  * Auxiliar method to return the array element in a range
  *@method filterValues
  *@param {Array} array
  *@param {Object} [range]
  *@param {number} [range.start]
  *@param {number} [range.end]
  */
  private filterValues(range?:{start?:K, end?:K}):Array<K>{
      var returnArray = new Array<K>()
      let iterator = this.hashMap.keys();
      let value = iterator.next();
      while(!value.done){
        let key = value.value;
        if ((range === undefined) ||
        (range.start !== undefined && range.end === undefined && key >= range.start) ||
        (range.start === undefined && range.end !== undefined && key <= range.end) ||
        (range.start !== undefined && range.end !== undefined && key >= range.start && key <= range.end))
          returnArray.push(key)
        value = iterator.next();
      }
      return returnArray;
    }

  /**
  * Return if an element is in the array
  *@method inArray
  *@param {T} obj
  *@param {Array}array
  */
  private inArray<T>(obj:T , values:Array<T>):boolean{
    var result = underscore._.find(values,function(value:T){underscore._.isEqual(obj , value)})
    return result > 0
  }

}
