var zmq = require('zmq');


var router = zmq.socket('router');
router.bindSync('tcp://*:8000');
router.on('message',function(){
  var args = Array.apply(null, arguments);
  var envelope = args.shift();
  var blank = args.shift();
  console.log(blank.toString());
});


var dealer = zmq.socket('dealer');
dealer.connect('tcp://127.0.0.1:8000');
dealer.send('hola');
