function Card(suit, face){
  this.suit = suit;
  this.face = face;
  this.print = function(){
    console.log('Card:'+ this.toString());
  };
  this.toString = function(){
    return this.suit + this.face;
  }
  this.fancyString = function(){
    return this.fancySuit() + this.face;
  }
  this.fancySuit = function(){
    if (this.suit=='H'){
      return '\u2665';
    } else if (this.suit=='D'){
      return '\u2666';
    } else if (this.suit=='S'){
      return '\u2660';
    } else if (this.suit=='C'){
      return '\u2663';
    }
  }
  this.htmlCode = function(){
    var code = '&#x1F0';
    if (this.suit=='S'){
      code += 'A';
    } else if (this.suit=='H'){
      code += 'B';
    } else if (this.suit=='D'){
      code += 'C';
    } else if (this.suit=='C'){
      code += 'D';
    }
    if (this.face=='10'){
      code += 'A';
    } else if (this.face=='J'){
      code += 'B';
    } else if (this.face=='Q'){
      code += 'D';
    } else if (this.face=='K'){
      code += 'E';
    }else{
      code += this.face;
    }
    code += ';';
    return code;
  }
  this.toHTML = function(){
    // html = $('<div/>').html(this.fancyString());
    html = $('<div/>').html(this.htmlCode());
    html.addClass('card');
    html.addClass(this.suit);
    return html;
  }
}

function makeCard(index){
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
  return new Card(suit, face);
}

function printDeck(deck){
  console.log('Deck:');
  for (i=0;i<52;i++){
    deck[i].print();
  }
  console.log('\n\n');
}

function makeDeck(){
  var deck = []
  for (i=0;i<52;i++){
    card = makeCard(i);
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

function setCards(hand, cards){
  cards_div = $('.' + hand + ' .cards');
  cards_div.html('');
  for (var i=0;i<cards.length;i++){
    card = cards[i];
    cards_div.append(card.toHTML());
  }
}
var deck;
function deal(){
  setUnflipped('flip', 1);
  deck = makeDeck();
  var hand1 = deck.slice(0,6);
  var hand2 = deck.slice(6,12);

  setCards('hand1', hand1);
  setCards('hand2', hand2);
}

function cut(){
  var flip = deck.slice(12,13);
  setCards('flip', flip);
}

function printHand(hand){
  conosole.log()
}

function makeUnflippedCard(){
   // html = $('<div/>').html('\u2623');
   html = $('<div/>').html('&#x1f0a0;');
   html.addClass('card');
   html.addClass('unflipped');
   return html;
}

function setUnflipped(hand, number){
  cards_div = $('.' + hand + ' .cards');
  cards_div.html('');
  for (var i=0;i<number;i++){
    cards_div.append(makeUnflippedCard());
  }
}

function setAllUnflipped(){
  setUnflipped('flip', 1);
  setUnflipped('hand1', 6);
  setUnflipped('hand2', 6);
}

function scoreHand(){

}
