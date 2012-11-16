"use strict";

var deck;

function printDeck(deck){
  console.log('Deck:');
  for (var i=0;i<52;i++){
    deck[i].print();
  }
  console.log('\n\n');
}

function makeDeck(){
  var deck = []
  for (var i=0;i<52;i++){
    var card = cardFromDeckIndex(i);
    // card.print();
    deck[i] = card;
  }
  shuffleDeck(deck);
  return deck;
}

function shuffleDeck(deck) {
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



function scoreHand(){

}
