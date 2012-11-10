function Card(suit, face){
  this.suit = suit;
  this.face = face;
  this.print = function(){
    console.log("Card:"+ this.suit + " " + this.face);
  };
}

function makeCard(index){
  if (index%4 === 0){
    suit = "H";
  }else if (index%4 == 1){
    suit = "D";
  }else if (index%4 == 2){
    suit = "C";
  }else if (index%4 == 3){
    suit = "S";
  }

  var score = index%13;
  var face = score;

  if (score === 0){
    score = 10;
    face = "Jack";
  }if (score == 11){
    score = 10;
    face = "Queen";
  }if (score == 12){
    score = 10;
    face = "King";
  }
  return new Card(suit, face);
}

function printDeck(deck){
  for (i=0;i<52;i++){
    deck[i].print();
  }
  console.log();
}

function makeDeck(){
  var deck = []
  for (i=0;i<52;i++){
    card = makeCard(i);
    // card.print();
    deck[i] = card;
  }
  printDeck(deck);
  shuffleDeck(deck);
  printDeck(deck);
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
