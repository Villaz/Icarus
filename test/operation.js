var should = require('should');
var Operation = require('../lib/operation.js').Operation;

describe('Operation tests', function(){

  it('Create operation', function(){
    var op = new Operation(1,1,{});
    op.client_id.should.be.exactly(1);
    op.operation_id.should.be.exactly(1);
  });

  it('Equals', function(){
    var op = new Operation(1,1,{});
    var op2 = new Operation(1,1,{});
    var op3 = new Operation(1,2,{});
    var op4 = new Operation(2,1,{});
    var op5 = new Operation(2,2,{});

    (op.equals(op2)).should.be.ok();
    (op.equals(op3)).should.be.false();
    (op.equals(op4)).should.be.false();
    (op.equals(op5)).should.be.false();
  });

  it('Equals with map', function(){
    var op = new Operation(1,1,{});
    var op2 = new Operation(1,1,{hola:1});
    var op3 = new Operation(2,1,{});
    var map = new Map();
    map.set(1, op);
    var l = new Set(map.values());
    (l.has(op)).should.be.ok();
    (l.has(op3)).should.be.false();
  });

  it('Equals with map-set', function(){
    var op = new Operation(1,1,{});
    var op2 = new Operation(2,1,{});
    var op3 = new Operation(3,1,{});
    var map = new Map();
    map.set(1,[op,op2]);
    map.set(2,[op3]);

    for( var [key, value] of map.entries())
      console.log(value);


  });
});
