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
  this.deck = null;
  this.cards = null;
  this.sockets = {};
  this.roles = {};
  this.opponent = {};
  this.scores = {};

  this.setDealer = function(socketId){
    this.dealer = socketId
    this.roles[socketId] = 'dealer';
    this.sockets[this.dealer].send('You are the dealer. Please wait for a second player and the cards will be dealt.')
  }
  this.setPlayer = function(socketId){
    this.player = socketId
    this.roles[socketId] = 'player';
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
    this.scores[socket.id] = 0;
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
    this.opponent[this.dealer] = this.player
    this.opponent[this.player] = this.dealer

    this.pushHand(this.dealer);
    this.pushHand(this.player);
  }
  this.addCrib = function(socketId, cardIndices){
    var role = this.roles[socketId];
    var crib = this.cards['crib'];
    var hand = this.cards[role];
    crib.push(hand.splice(cardIndices[0], 1)[0]);
    crib.push(hand.splice(cardIndices[1]-1, 1)[0]);
    this.pushHand(socketId);
    this.sockets[this.opponent[socketId]].emit('set unflipped', {'section': 'otherhand',
                                                                'number': 4});
    this.emitToRoom('set unflipped', {'section': 'crib',
                                      'number': crib.length});

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
    this.emitToRoom('set count', {'count': this.playCount});
  }
  this.addScore = function(socketId, score){
    this.scores[socketId] += score;
    this.sendScores();
  }
  this.cardPlayed = function(socketId, cardIndex){
    this.addScore(socketId, 1);
    var role = this.roles[socketId];
    var card = this.cards[role][cardIndex];
    if(this.playCount + card['score'] > 31){
      this.requestCard(socketId);
      return;
    }
    this.playedCards[role].push(card);
    var opponent = this.opponent[socketId];
    this.sockets[socketId].emit('set disabled', {'section': 'hand',
                                                 'index': cardIndex});
    this.sockets[opponent].emit('set disabled', {'section': 'otherhand',
                                                'index': cardIndex});
    this.sockets[opponent].emit('set card', {'section':
                                            'otherhand', 'index': cardIndex,
                                            'card': this.cards[role][cardIndex]});
    this.setPlayCount(this.playCount + card['score']);
    this.requestNextCard(socketId);
  }
  this.requestNextCard = function(lastCardPlayer){
    if(this.playedCards['dealer'].length + this.playedCards['player'].length == 8){
      this.handOver();
      return
    }
    var lastCardPlayerRole = this.roles[lastCardPlayer];
    var nextCardPlayer = this.opponent[lastCardPlayer];
    var nextCardPlayerRole = this.roles[nextCardPlayer];
    if(this.canPlay(nextCardPlayerRole)) {
      this.requestCard(nextCardPlayer);
      return;
    }
    if(this.canPlay(lastCardPlayerRole)) {
      this.requestCard(lastCardPlayer);
      return;
    }
    this.setPlayCount(0);
    this.requestCard(nextCardPlayer);
  }
  this.canPlay = function(playerName){
    var cards = this.cards[playerName];
    var playedCards = this.playedCards[playerName];

    for(var cardIndex in cards) {
      var card = cards[cardIndex];
      var cardNotPlayed = playedCards.indexOf(card) == -1;
      if(cardNotPlayed && card.score + this.playCount <= 31){
        return true;
      }
    }
    return false;
  }
  this.handOver = function(){
    this.emitToRoom('set cards', {'section': 'crib',
                                       'cards': this.cards['crib']});
    this.emitToRoom('enable all');
    this.emitToRoom('new hand ready');

    this.switchPlayers();

    this.newHand();

    var game = this;
    this.sockets[this.dealer].once('start next hand', function(){
      game.setAllUnflipped(game.dealer);
      game.pushHand(game.dealer);
    });
    this.sockets[this.player].once('start next hand', function(){
      game.setAllUnflipped(game.player);
      game.pushHand(game.player);
    });
  }
  this.switchPlayers = function(){
    var currentDealer = this.dealer;
    var currentPlayer = this.player;
    this.setDealer(currentPlayer);
    this.setPlayer(currentDealer);
  }
  this.newHand = function(){
    this.deck = exports.makeDeck();
    this.cards = exports.makeCardSets(this.deck);
  }
  this.sendScores = function(){
    this.sockets[this.dealer].emit('set scores', {'score': this.scores[this.dealer],
                                                  'opponentScore': this.scores[this.player]});
    this.sockets[this.player].emit('set scores', {'score': this.scores[this.player],
                                                  'opponentScore': this.scores[this.dealer]});
  }
  this.sendToRoom = function(message){
    this.io.sockets.in(this.name).send(message);
  }
  this.emitToRoom = function(event, data){
    this.io.sockets.in(this.name).emit(event, data);
  }
  this.pushHand = function(socketId){
    var cards = this.cards[this.roles[socketId]];
    this.sockets[socketId].emit('set cards',
      {'section': 'hand',
       'cards': cards});
    if(cards.length==6){
      this.requestCrib(socketId);
    }
  }
  this.setAllUnflipped = function(socketId){
    var socket = this.sockets[socketId];
    socket.emit('set cards',{'section': 'crib', 'cards': []});
    socket.emit('set count',{'count': -1});
    socket.emit('set unflipped', {'section': 'flip',
                                  'number': 1});
    socket.emit('set unflipped', {'section': 'hand',
                                  'number': this.cards[this.roles[socketId]].length});
    var otherCards = this.cards[this.roles[this.opponent[socketId]]];
    if(otherCards){
      otherCards = otherCards.length;
    }else{
      otherCards = 6;
    }
    socket.emit('set unflipped', {'section': 'otherhand',
                                  'number': otherCards);
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
    this.sockets[socketId].emit('need cards', {'role': this.roles[socketId],
                                               'game': this.name,
                                               'number': number});
  }
  this.requestCrib = function(socketId){
    var game = this;
    this.requestCards(socketId, 2, function (cards) {
      game.addCrib(socketId, cards);
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

  this.newHand();

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
  var card = {'suit': suit, 'face': face, 'score': score};
  card.toString = function(){
    return 'Card[' + this.suit + this.face + ']';
  }
  return card;
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
