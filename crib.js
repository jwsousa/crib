"use strict";

var games = [];

exports.gameForNewConnection = function(io, socket){
  console.log('New socket looking for a game: ' + socket.id);
  for(var gameIndex=0;gameIndex<games.length;gameIndex++){
    var game = games[gameIndex];
    if(game.active && game.playerCount < 2){
      console.log('Found a game for ' + socket.id + ': ' + game.name);
      game.addClient(socket);
      return game;
    }
  }
  var newGame = new exports.Game(io);
  console.log('Making new game for ' + socket.id + ': ' + newGame.name);
  newGame.addClient(socket);
  return newGame;
}

exports.Game = function(io){
  this.active = true;
  this.io = io;
  this.name = 'crib' + games.length;
  games.push(this);
  this.playerCount = 0;
  this.deck = exports.makeDeck();
  this.cards = exports.makeCardSets(this.deck);
  this.sockets = {};
  this.role = {};
  this.oponent = {};
  this.score = {};

  this.setDealer = function(socketId){
    this.dealer = socketId
    this.role[socketId] = 'dealer';
    this.sockets[this.dealer].send('You are the dealer. Please wait for a second player and the cards will be dealt.')
  }
  this.setPlayer = function(socketId){
    this.player = socketId
    this.role[socketId] = 'player';
    this.sockets[this.player].send('You are NOT the dealer.');
    this.sockets[this.dealer].send('You are the dealer.');
  }
  this.addClient = function(socket){
    if(this.playerCount>=2){
      console.log('Already 2 people in this game!');
      return;
    }

    this.playerCount++;
    this.sockets[socket.id] = socket;
    socket.join(this.name);
    if(this.playerCount==1){
      this.setDealer(socket.id);
    }else if(this.playerCount==2){
      this.setPlayer(socket.id);
    }

    this.setAllUnflipped(socket.id);

    if(this.playerCount==2){
      this.startGame();
    }
  }
  this.startGame = function(){
    this.oponent[this.dealer] = this.player
    this.oponent[this.player] = this.dealer

    this.pushHand(this.dealer);
    this.pushHand(this.player);

    this.requestCrib(this.dealer);
    this.requestCrib(this.player);
  }
  this.addCrib = function(playerName, cardIndices){
    var crib = this.cards['crib'];
    var hand = this.cards[playerName];
    crib.push(hand.splice(cardIndices[0], 1)[0]);
    crib.push(hand.splice(cardIndices[1]-1, 1)[0]);
    this.pushHand(playerName);
    this.sockets[this.oponent[playerName]].emit('set unflipped', {'section': 'otherhand', 'number': 4});
    this.io.sockets.in(this.name).emit('set unflipped', {'section': 'crib', 'number': crib.length});

    if (crib.length == 4){
      this.cribComplete();
    }
  }
  this.cribComplete = function(){
    this.showFlip();
    this.setCribUnflipped();
    this.startPlay();
  }
  this.startPlay = function(){
    this.setPlayCount(0);
    this.playedCards = {'dealer':[], 'player':[]}
    // this.nextPlayer = this.dealer;
    this.requestCard(this.player);
  }
  this.setPlayCount = function(count){
    this.playCount = count;
    this.io.sockets.in(this.name).emit('set count', {'count': this.playCount});
  }
  this.cardPlayed = function(socketId, cardIndex){
    var role = this.role[socketId];
    var card = this.cards[role][cardIndex];
    if(this.playCount + card['score'] > 31){
      this.requestCard(socketId);
      return;
    }
    this.playedCards[role].push(card);
    var oponent = this.oponent[socketId];
    this.sockets[socketId].emit('set disabled', {'section': 'hand',
                                                 'index': cardIndex});
    this.sockets[oponent].emit('set disabled', {'section': 'otherhand',
                                                'index': cardIndex});
    this.sockets[oponent].emit('set card', {'section':
                                            'otherhand', 'index': cardIndex,
                                            'card': this.cards[role][cardIndex]});
    this.setPlayCount(this.playCount + card['score']);
    this.requestNextCard(socketId);
  }
  this.requestNextCard = function(lastCardPlayer){
    if(this.playedCards['dealer'].length + this.playedCards['player'].length == 8){
      this.showAll();
      return
    }
    var lastCardPlayerRole = this.role[lastCardPlayer];
    var nextCardPlayer = this.oponent[lastCardPlayer];
    var nextCardPlayerRole = this.role[nextCardPlayer];
    if(this.canPlay(nextCardPlayerRole)) {
      this.requestCard(nextCardPlayer);
      return;
    }
    if(this.canPlay(otherPlayer)) {
      this.requestNextCard(lastCardPlayer);
      return;
    }
    this.setPlayCount(0);
    this.requestNextCard(nextCardPlayer);
  }
  this.canPlay = function(playerName){
    for(var i=0;i<this.cards[playerName].length;i++){
      var card = this.cards[playerName][i];
      if(this.playedCards[playerName].indexOf(card) == -1){
        if(card.score + this.playCount <= 31){
          return true;
        }
      }
    }
    return false;
  }
  this.showAll = function(){
    this.emitToRoom.emit('set cards', {'section': 'crib',
                                       'cards': this.cards['crib']});
    this.emitToRoom.emit('enable all');
  }
  this.sendToRoom = function(message){
    this.io.sockets.in(this.name).send(message);
  }
  this.emitToRoom = function(event, data){
    this.io.sockets.in(this.name).emit(event, data);
  }
  this.pushHand = function(socketId){
    this.sockets[socketId].emit('set cards',
      {'section': 'hand',
       'cards': this.cards[this.role[socketId]]});
  }
  this.setAllUnflipped = function(socketId){
    var socket = this.sockets[socketId];
    socket.emit('set cards',{'section': 'crib', 'cards': []});
    socket.emit('set count',{'count': -1});
    socket.emit('set unflipped', {'section': 'flip', 'number': 1});
    socket.emit('set unflipped', {'section': 'hand', 'number': 6});
    socket.emit('set unflipped', {'section': 'otherhand', 'number': 6});
  }
  this.setCribUnflipped = function(){
    this.emitToRoom('set unflipped', {'section': 'crib', 'number': 4});
  }
  this.showFlip = function(){
    this.emitToRoom('set cards', {'section': 'flip',
                                  'cards': this.cards['flip']});
  }
  this.requestCards = function(socketId, number, callback){
    var game = this;
    this.sockets[socketId].once('cards selected', function(data){
      var cardIndices = data['cards'].map(function(cardId){
        return parseInt(cardId[4]);
      });
      return callback(cardIndices);
    });
    this.sockets[socketId].emit('need cards', {'role': this.role[socketId],
                                               'game': this.name,
                                               'number': number});
  }
  this.requestCrib = function(socketId){
    var game = this;
    this.requestCards(socketId, 2, function (cards) {
      game.addCrib(game.role[socketId], cards);
    });
  }
  this.requestCard = function(socketId){
    var game = this;
    this.requestCards(socketId, 1, function (cards) {
      game.cardPlayed(socketId, cards[0]);
    });
  }
  this.endGame = function(){
    this.active = false;
    for(var socketId in this.sockets) {
      this.sockets[socketId].removeAllListeners();
      this.sockets[socketId].leave(this.name);
      // this.sockets[socketId].disconnect();
    }
  }

}

exports.cardFromDeckIndex = function(index){
  var suit = null;
  if (index%4 === 0){
    suit = 'H';
  }else if (index%4 == 1){
    suit = 'D';
  }else if (index%4 == 2){
    suit = 'C';
  }else if (index%4 == 3){
    suit = 'S';
  }

  var score = index%13;
  var face = score;

  if (score === 0){
    score = 10;
    face = 'J';
  }if (score == 11){
    score = 10;
    face = 'Q';
  }if (score == 12){
    score = 10;
    face = 'K';
  }if (score == 1){
    face = 'A'
  }
  return {'suit': suit, 'face': face, 'score': score};
}


// exports.printDeck = function(deck){
//   console.log('Deck:');
//   for (var i=0;i<52;i++){
//     deck[i].print();
//   }
//   console.log('\n\n');
// }

exports.makeDeck = function(){
  var deck = []
  for (var i=0;i<52;i++){
    var card = exports.cardFromDeckIndex(i);
    // card.print();
    deck[i] = card;
  }
  exports.shuffleDeck(deck);
  return deck;
}

exports.shuffleDeck = function(deck) {
  var i = deck.length;
  if ( i == 0 ) return false;
  while ( --i ) {
    var j = Math.floor( Math.random() * ( i + 1 ) );
    var tempi = deck[i];
    var tempj = deck[j];
    deck[i] = tempj;
    deck[j] = tempi;
  }
}

exports.makeCardSets = function(deck) {
  return {
    'flip': deck.slice(0,1),
    'dealer': deck.slice(1,7),
    'player': deck.slice(7,13),
    'crib': []
  };
}


exports.scoreHand = function(){

}
