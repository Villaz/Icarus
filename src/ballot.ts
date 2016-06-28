///<reference path='./typings/tsd.d.ts' />


/**
 * Class Ballot
 * @class Ballot
 */
export class Ballot{

  number:number = -1
  id:string = undefined

  /**
  * @class Ballot
  * @constructor
  * @param {Object}[params]
  * @param {number} params.number
  * @param {string} params.id
  */
  constructor(params?:{number:number; id:string}){
    if(params !== undefined){
      this.number = params.number
      this.id = params.id
    }
  }


  /**
  *@method isMayorThanOtherBallot
  *@param {Ballot} ballot
  */
  public isMayorThanOtherBallot( ballot:Ballot ):boolean{
    if(this.number < ballot.number) return false
    if(this.number > ballot.number) return true

    var actualBytes = this.getValue(this.id)
    var externalBytes = this.getValue(ballot.id)

    if(actualBytes > externalBytes) return true
    else return false
  }


  /**
  *@method isMayorOrEqualThanOtherBallot
  *@param {Ballot} ballot
  */
  public isMayorOrEqualThanOtherBallot(ballot:Ballot):boolean{
      if(this.isEqual(ballot)) return true
      else  return this.isMayorThanOtherBallot(ballot)
  }


  /**
  *@method isEqual
  *@param {Ballot} ballot
  */
  public isEqual(ballot:Ballot):boolean{
      var actualBytes = this.getValue(this.id)
      var externalBytes = this.getValue(ballot.id)
      if((this.number === ballot.number) && (actualBytes === externalBytes))
        return true
  }


  /**
  *@method getValue
  *@param {string} id
  */
  private getValue( id:string ):number{
    var sum = 0
    for(var i of this.getBytes(id)){
      if(!isNaN(i)) sum += i
    }
    return sum
  }


  /**
  *@method getBytes
  *@param {string} id
  */
  private getBytes( id:string ):Array<number>{
      var bytes:any = []
      var str = encodeURI(id)

      while(str.length){
        var char = str.slice(0, 1)
        str =  str.slice(1)

        if ('%' !== char)
          bytes.push(char.charCodeAt(0))
        else{
          char = str.slice(0, 2)
          str = str.slice(2)
        }
        bytes.push(parseInt(char, 16))
      }
      return bytes
    }

}
