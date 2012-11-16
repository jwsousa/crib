"use strict";

var game_counter = 0;

exports.Game = function(){
  this.name = 'crib' + game_counter++;
  this.player_count = 0;
  this.deck = exports.makeDeck();
  this.hands = exports.makeHands(this.deck);
  this.dealer_socket = null;
  this.player_socket = null;

  this.setDealer = function(socket){
    this.dealer_socket = socket;
    this.player_count++;
  }
  this.setPlayer = function(socket){
    this.player_socket = socket;
    this.player_count++;
  }
  this.addClient = function(socket){
    if(this.player_count==0){
      this.setDealer(socket);
    }else if(this.player_count==1){
      this.setPlayer(socket);
    }
    if(this.player_count==2){
      this.startGame();
    }
  }
  this.startGame = function(){
    this.dealer_socket.emit('hand', {'index': 2, 'hand': this.hands['dealer']});
    this.player_socket.emit('hand', {'index': 2, 'hand': this.hands['player']});
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

exports.makeHands = function(deck) {
  return {
    'flip': deck.slice(0,1),
    'dealer': deck.slice(1,7),
    'player': deck.slice(7,13)
  };
}


exports.scoreHand = function(){

}
