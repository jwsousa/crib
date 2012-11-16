
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , routes = require('./routes')
  , crib = require('./routes/crib')
  , http = require('http')
  , path = require('path');


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/crib', crib.index);

var server = require('http').createServer(app);
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var crib = require('./crib');



var io = require('socket.io').listen(server)
var game = new crib.Game(io);

io.sockets.on('connection', function (socket) {
  game.addClient(socket);
  socket.join(game.name);

  socket.on('crib selected', function (data) {
    console.log('crib selected!!');
    console.log(data);
    game.addCrib(socket.id, data['crib']);
  });
});
