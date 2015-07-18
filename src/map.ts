///<reference path='./typings/node/node.d.ts' />

var HashMap = require('hashmap').HashMap
var underscore = require('underscore')

/**
 * Auxiliar class to store all the operations with an assigned slot.
 * @class Map
 */
export class Map{

  private hashMap:any
  private keys:Array<number>

  /**
  * @class Map
  * @constructor
  */
  constructor(){
      this.hashMap = new HashMap( )
      this.keys = new Array()
  }

  /**
  * Returns the number of keys stored in the Map
  *@method count
  */
  public count():number{
    return this.hashMap.count()
  }


  /**
  * Returns a list with all keys
  *@method getAllKeys
  */
  public getAllKeys( ):Array<number>{
    return this.keys
  }


  /**
  * Returns all values stored in the Map
  *@method getAllValues
  */
  public getAllValues<K>( ):Array<K>{
    var values:Array<K> = []
    for(var key of this.keys){
      values.push(this.hashMap.get(key))
    }
    return values
  }


  /**
  * Stores a new object with the given slot, if the slot exists it is overrided
  *@method addValue
  *@param {number} slot
  *@param {T} value
  */
  public addValue<T>( slot:number , value:T ){
    this.hashMap.set(slot,value)
    if(this.keys.indexOf(slot)< 0) this.keys.push(slot)
  }


  /**
  * Stores a new object with the given slot,
  * if the slot exists the object is added
  * to the slot as part of a list of objects
  *@method addValues
  *@param {number} slot
  *@param {T} value
  */
  public addValues<T>(slot:number , value:T ){
    if(this.hashMap.get(slot) === undefined) this.hashMap.set(slot,[value])
    else{
      var val:Array<T> =  this.hashMap.get(slot)
      val.push(value)
      this.hashMap.set(slot, val)
    }
  }


  /**
  * Returns the object or objects stored in a given slot
  *@method getValue
  *@param {number} slot
  */
  public getValue<T>(slot:number):T{
    return this.hashMap.get(slot)
  }

  /**
  * Removes the slot from the map
  *@method remove
  *@param {number} slot
  */
  public remove( slot:number ){
    this.hashMap.remove(slot)
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
  public getValues(range:{start?:number , end?:number}){
    var values:Array<any> = []
    var filteredList = this.filterValues(this.keys, range)
    for(var slot of filteredList)
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
  public update(x:Map){
    var values = this.getAllValues()
    for(var key of x.keys){
      if((this.keys.indexOf(key) < 0) && ! this.inArray(x.getValue(key), values))
        this.addValue(key, x.getValue(key))
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
  private filterValues(array:Array<number>, range?:{start?:number, end?:number}):Array<number>{
      var returnArray = new Array()
      for(var value of array){
        if ((range === undefined) ||
        (range.start !== undefined && range.end === undefined && value >= range.start) ||
        (range.start === undefined && range.end !== undefined && value <= range.end) ||
        (range.start !== undefined && range.end !== undefined && value >= range.start && value <= range.end))
          returnArray.push(value)
      }
      return returnArray
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
