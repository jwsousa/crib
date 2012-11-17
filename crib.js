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
  }
  this.setPlayer = function(socketId){
    this.player = socketId
    this.roles[socketId] = 'player';
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
    this.resetHand(socket.id);
    this.sockets[socket.id].emit('set scores', {'score': 0,
                                                'opponentScore': 0});
    if(this.playerCount==1){
      this.setDealer(socket.id);
      this.sockets[this.dealer].send('You are the dealer. Please wait for a second player and the cards will be dealt.')
    }else if(this.playerCount==2){
      this.setPlayer(socket.id);
      this.sockets[this.player].send('You are NOT the dealer.');
      this.sockets[this.dealer].send('You are the dealer.');
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
    this.playedCards = {'dealer':[], 'player':[], 'play':[]}
    this.requestCard(this.player);
  }
  this.setPlayCount = function(count){
    this.playCount = count;
    this.emitToRoom('set count', {'count': this.playCount});
  }
  this.addScore = function(socketId, score){
    if(score<1)
      return;
    console.log('Adding: ' + score);
    this.scores[socketId] = Math.min(this.scores[socketId] + score, 121);
    this.sendScores();
    if(this.scores[socketId] == 121) {
      this.gameWon(socketId);
    }
  }
  this.gameWon = function(socketId){
      this.sockets[socketId].send("You've won!");
      this.sockets[this.opponent[socketId]].send("You've lost!");
  }
  this.cardPlayed = function(socketId, cardIndex){
    var role = this.roles[socketId];
    var card = this.cards[role][cardIndex];
    if(this.playCount + card['playValue'] > 31){
      this.requestCard(socketId);
      return;
    }
    this.playedCards[role].push(card);
    this.playedCards['play'].unshift(card);
    var opponent = this.opponent[socketId];
    this.sockets[socketId].emit('set disabled', {'section': 'hand',
                                                 'index': cardIndex});
    this.sockets[opponent].emit('set disabled', {'section': 'otherhand',
                                                'index': cardIndex});
    this.sockets[opponent].emit('set card', {'section':
                                            'otherhand', 'index': cardIndex,
                                            'card': this.cards[role][cardIndex]});
    this.setPlayCount(this.playCount + card['playValue']);

    this.addScore(socketId, this.checkPlayScore());
    this.requestNextCard(socketId);
  }
  this.checkPlayScore = function(){
    var score = 0;
    var playCards = this.playedCards['play'];
    if(this.playCount==15){
      console.log('Hit 15: +2');
      score += 2;
    }
    if(playCards > 1 && playCards[0].face == playCards[1].face){
      console.log('Pair: +2');
      score += 2;
    }
    if(playCards > 2 && playCards[0].face == playCards[2].face){
      console.log('Royal Pair: +4');
      score += 4;
    }
    if(playCards > 3 && playCards[0].face == playCards[3].face){
      console.log('4 of a Kind: +12');
      score += 6;
    }
    score += this.checkLastRun()
    return score;
  }
  this.checkLastRun = function(){
    var playCards = this.playedCards['play'];
    function nLastThanConsecutive(n){
      var sorted = playCards.slice(playCards.length-n,playCards.length).sort(exports.cardCompare);
      for(var i=1;i<n;i++){
        if(sorted[0].index!=sorted[i].index-i){
          return false;
        }
      }
      return true;
    };
    for(var n=playCards.length;n>2;n--){
      if(nLastThanConsecutive(n)){
        console.log('Run: +'+n);
        return n;
      }
    }
    return 0;
  }
  this.requestNextCard = function(lastCardPlayer){
    if(this.playedCards['dealer'].length + this.playedCards['player'].length == 8){
      this.addScore(lastCardPlayer, 1);
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
    if(this.playCount == 31){
      this.addScore(lastCardPlayer, 2);
    }else{
      this.addScore(lastCardPlayer, 1);
    }
    this.playedCards['play'] = [];
    this.setPlayCount(0);
    this.requestCard(nextCardPlayer);
  }
  this.canPlay = function(playerName){
    var cards = this.cards[playerName];
    var playedCards = this.playedCards[playerName];

    for(var cardIndex in cards) {
      var card = cards[cardIndex];
      var cardNotPlayed = playedCards.indexOf(card) == -1;
      if(cardNotPlayed && card.playValue + this.playCount <= 31){
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

    var dealerHandScore = exports.scoreHand(this.cards['dealer'], this.cards['flip'][0], false);
    var playerHandScore = exports.scoreHand(this.cards['player'], this.cards['flip'][0], false);
    var cribHandScore = exports.scoreHand(this.cards['crib'], this.cards['flip'][0], true);
    addScore(this.player, playerHandScore);
    addScore(this.dealer, dealerHandScore);
    addScore(this.dealer, cribHandScore);

    this.switchPlayers();
    this.newHand();

    var game = this;
    this.sockets[this.dealer].once('start next hand', function(){
      game.resetHand(game.dealer);
      game.pushHand(game.dealer);
    });
    this.sockets[this.player].once('start next hand', function(){
      game.resetHand(game.player);
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
  this.resetHand = function(socketId){
    var socket = this.sockets[socketId];
    socket.emit('set cards',{'section': 'crib', 'cards': []});
    socket.emit('set unflipped', {'section': 'crib',
                                  'number': this.cards['crib'].length});
    socket.emit('set count',{'count': -1});
    socket.emit('set unflipped', {'section': 'flip',
                                  'number': 1});
    socket.emit('set unflipped', {'section': 'hand',
                                  'number': 6});
    socket.emit('set unflipped', {'section': 'otherhand',
                                  'number': 6-this.cards['crib'].length});
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
  var index = index%13;
  var playValue = Math.min(index+1, 10);
  var face = index+1;
  if (index == 0){
    face = 'A';
  }else if (index == 10){
    face = 'J';
  }else if (index == 11){
    face = 'Q';
  }else if (index == 12){
    face = 'K'
  }
  var card = {'suit': suit, 'face': face, 'playValue': playValue, 'index': index};
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


exports.scoreHand = function(hand, flip, isCrib){
  var fullHand = hand.slice(0).push(flip);
  var score = 0;
  var combos = exports.combinations(fullHand);
  var runs = [];
  for (var i=0;i<combos.length;i++) {
    var combo = combos[i];
    var cardSum = exports.addCardSum(combo);
    if(cardSum==15){
      score += 2;
    }
    if(combo.length==2 && combo[0].face == combo[1].face){
      score += 2;
    }else if(combo.length>2){
      if(exports.isRun(combo)){
        runs.push(combo.length);
      }
    }
  }
  runs.sort().reverse();
  for (var i=0;i<runs.length;i++) {
    if(runs[0]==runs[i]){
      score += runs[i];
    }
  }
  if(exports.isFlush(hand)){
    score += 4;
    if(!isCrib && flip.suit == hand[0].suit){
      score += 1;
    }
  }
  return score;
}
exports.combinations = function(cards) {
  var fn = function(n, src, got, all) {
    if (n == 0) {
      if (got.length > 0) {
        all[all.length] = got;
      }
      return;
    }
    for (var j = 0; j < src.length; j++) {
      fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
    }
    return;
  }
  var all = [];
  for (var i = 0; i < cards.length; i++) {
    fn(i, cards, [], all);
  }
  all.push(cards);
  return all;
}
exports.addCardSum = function(cards){
  var total = 0;
  for(var cardIndex=0;cardIndex<cards.length;cardIndex++){
    total += cards[cardIndex].playValue;
  }
  return total;
}
exports.isFlush = function(cards){
  var suit = cards[0].suit;
  var flushLenth = 1;
  for(var i=1;i<cards.length;i++){
    if(cards[i].suit == suit){
      flushLenth += 1;
    }
  }
  return flushLenth;
}
exports.isRun = function(cards){
  if(cards.length<3){
    return false;
  }
  sorted = cards.slice(0).sort(exports.cardCompare);
  for(var i=1;i<cards.length;i++){
    if(sorted[0].index!=sorted[i].index-i){
      return false;
    }
  }
  return true;
}
exports.cardCompare = function(card1, card2){
  return card1.index - card2.index;
}
