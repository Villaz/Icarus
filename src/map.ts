///<reference path='./typings/tsd.d.ts' />

var HashMap = require('hashmap').HashMap
var underscore = require('underscore')

/**
 * Auxiliar class to store all the operations with an assigned slot.
 * @class Map
 */
export class InternalMap<K extends number,T>{

  private hashMap:Map<string,any>;
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
  * Returns a keys iterator
  *@method Keys
  */
  get keys():IterableIterator<any>{
    return this.hashMap.keys();
  }

  /**
  * Returns a list with all keys
  *@method arrayKeys
  */
  get arrayKeys():Array<any>{
    let iterator = this.keys;
    let entry = iterator.next();
    let keys = new Array();
    while(!entry.done){
      keys.push(JSON.parse(entry.value));
      entry = iterator.next();
    }
    return keys;
  }

  /**
  * Returns all values stored in the Map
  *@method getAllValues
  */
  get values( ):IterableIterator<T[]>{
    return this.hashMap.values();
  }

  get arrayValues():Array<T[]>{
    let iterator = this.values;
    let entry = iterator.next();
    let values = new Array<T[]>();
    while(!entry.done){
      values.push(entry.value);
      entry = iterator.next();
    }
    return values;
  }

  /**
  * Stores a new object with the given slot, if the slot exists it is overrided
  *@method addValue
  *@param {number} slot
  *@param {T} value
  */
  public set( slot:K , value:T , override:boolean=false ){
    let newSlot = JSON.stringify(slot);
    if(!this.has(slot) || override)
      this.hashMap.set(newSlot, value);
    else{
      if (Array.isArray(this.get(slot)))
        this.hashMap.get(newSlot).push(value);
      else
        this.hashMap.set(newSlot, [this.hashMap.get(newSlot),value]);
    }
  }

  /**
  * Returns the object or objects stored in a given slot
  *@method getValue
  *@param {K} slot
  */
  public get(slot:K):any{
    return this.hashMap.get(JSON.stringify(slot));
  }

  public has( slot:K ):boolean{
    return this.hashMap.has(JSON.stringify(slot));
  }


  /**
  * Removes the slot from the map
  *@method remove
  *@param {number} slot
  */
  public delete( slot:K ){
    this.hashMap.delete(JSON.stringify(slot));
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
  public getValues(range:{start? , end?}){
    var values:Array<any> = []
    var filteredList = this.filterValues(range)
    for (var slot of filteredList)
      values.push({slot: JSON.parse(slot), operation: this.hashMap.get(slot)})
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
  public update(x:InternalMap<K,T>, override:boolean=false){
    let keys:any;
    if (x.keys === undefined) return;

    var thisValues = new Set(this.arrayValues);

    let iterator = x.keys;
    let entry = iterator.next();
    while(!entry.done){
      let key = JSON.parse(entry.value);
      if(!this.has(key)){
          this.set(key, x.get(key), true);
      }
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
  private filterValues(range?:{start?, end?}):Array<string>{
      var returnArray = new Array<string>()
      let iterator = this.hashMap.keys();
      let value = iterator.next();

      let start = undefined;
      if(range.start !== undefined) start = JSON.parse(range.start);
      let e = undefined;
      if(range.end !== undefined) JSON.parse(range.end);

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
