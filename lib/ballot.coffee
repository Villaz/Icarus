Ballot = exports? and exports or @Ballot = {}

class Ballot.Ballot

    number = -1
    id = undefined

    constructor:( @number , @id ) ->
        if not @number? then @number = -1


    isMayorThanOtherBallot:( ballot ) ->

        if @number > ballot.number then return true
        if @number < ballot.number then return false

        actualBytes = @_getValue @id
        externalBytes = @_getValue ballot.id 

        if actualBytes > externalBytes then return true else return false


    isMayorOrEqualThanOtherBallot:( ballot ) ->
        if @isEqual( ballot )
            return true
        else
            @isMayorThanOtherBallot ballot


    isEqual:( ballot ) ->
        actualBytes = @_getValue @id
        externalBytes = @_getValue ballot.id
        if (@number is ballot.number) and (actualBytes is externalBytes)
            return true


    _getBytes:( str ) ->
    bytes = []
    char = undefined
    str = encodeURI(str)

    while(str.length)
        char = str.slice 0, 1
        str = str.slice 1;

        if ('%' isnt char)
            bytes.push(char.charCodeAt(0))
        else
            char = str.slice 0, 2
            str = str.slice 2
      bytes.push(parseInt(char, 16))
    return bytes

  _getValue:( str ) ->
    sum = 0
    sum += value for value in @_getBytes( str ) when not isNaN(value)
    return sum