var deck = new Object();
var card = new Object(face, suit);
    this.face = face;
    this.suit = suit;

  if (card%4 === 0){
    suit = "H";
  }else if (card%4 == 1){
    suit = "D";
  }else if (card%4 == 2){
    suit = "C";
  }else if (card%4 == 3){
    suit = "S";
  }
  var score = card%13;
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

function shuffleDeck(deck) {
  var i = deck.length;
  if ( i == 0 ) return false;
  while ( --i ) {
    var j = Math.floor( Math.random() * ( i + 1 ) );
    var tempi = myArray[i];
    var tempj = myArray[j];
    deck[i] = tempj;
    deck[j] = tempi;
  }
}
