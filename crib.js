"use strict";

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
  return [deck.slice(0,1), deck.slice(1,7), deck.slice(7,13)]
}


exports.scoreHand = function(){

}
