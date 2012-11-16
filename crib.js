"use strict";

var gameCount = 0;

exports.Game = function(io){
  this.io = io;
  this.name = 'crib' + gameCount++;
  this.playerCount = 0;
  this.deck = exports.makeDeck();
  this.cards = exports.makeCardSets(this.deck);
  this.sockets = {};
  this.playersById = {};
  this.oponent = {'player': 'dealer', 'dealer': 'player'};

  this.setDealer = function(socket){
    this.sockets['dealer'] = socket;
    this.playersById[socket.id] = 'dealer';
    this.playerCount++;
    this.setAllUnflipped('dealer');
    socket.send('You are the dealer. Please wait for a second player and the cards will be dealt.')
  }
  this.setPlayer = function(socket){
    this.sockets['player'] = socket;
    this.playersById[socket.id] = 'player';
    this.playerCount++;
    this.setAllUnflipped('player');
  }
  this.addClient = function(socket){
    if(this.playerCount==0){
      this.setDealer(socket);
    }else if(this.playerCount==1){
      this.setPlayer(socket);
    }
    if(this.playerCount==2){
      this.startGame();
    }
  }
  this.startGame = function(){
   this.pushHand('player');
   this.pushHand('dealer');
    // this.io.sockets.in(this.name).emit('need crib');
   this.requestCrib('player');
   this.requestCrib('dealer');
  }
  this.addCrib = function(playerName, cardIds){
    var cardIndices = cardIds.map(function(cardId){
      return parseInt(cardId[5]);
    });
    var crib = this.cards['crib'];
    var hand = this.cards[playerName];
    crib.push(hand.splice(cardIndices[0], 1)[0]);
    crib.push(hand.splice(cardIndices[1], 1)[0]);
    this.pushHand(playerName);
    this.sockets[this.oponent[playerName]].emit('set unflipped', {'section': 'otherhand', 'number': 4});
  }
  this.pushHand = function(playerName){
    this.sockets[playerName].emit('set cards',
      {'hand': 'hand',
       'cards': this.cards[playerName]});
  }
  this.requestCrib = function(playerName){
    var game = this;
    this.sockets[playerName].once('crib selected', function (data) {
      game.addCrib(playerName, data['crib']);
    });
    this.sockets[playerName].emit('need crib');
  }
  this.setAllUnflipped = function(playerName){
    this.sockets[playerName].emit('set unflipped', {'section': 'flip', 'number': 1});
    this.sockets[playerName].emit('set unflipped', {'section': 'hand', 'number': 6});
    this.sockets[playerName].emit('set unflipped', {'section': 'otherhand', 'number': 6});
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
  return {'suit': suit, 'face': face};
}


exports.printDeck = function(deck){
  console.log('Deck:');
  for (var i=0;i<52;i++){
    deck[i].print();
  }
  console.log('\n\n');
}

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
