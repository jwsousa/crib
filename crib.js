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
    this.emit(socket.id, 'set scores', {'score': 0,
                                        'opponentScore': 0});
    if(this.playerCount==1){
      this.setDealer(socket.id);
      this.send(this.dealer, 'You are the dealer. Please wait for a second player and the cards will be dealt.')
    }else if(this.playerCount==2){
      this.setPlayer(socket.id);
      this.startGame();
    }
  }
  this.startGame = function(){
    this.send(this.player, 'You are NOT the dealer. ' + this.player);
    this.send(this.dealer, 'You are the dealer. ' + this.dealer);

    this.opponent[this.dealer] = this.player
    this.opponent[this.player] = this.dealer

    this.pushHand(this.dealer);
    this.pushHand(this.player);
  }
  this.addCrib = function(socketId, cardIndices){
    var role = this.roles[socketId];
    var crib = this.cards['crib'];
    var hand = this.cards[role];
    cardIndices.sort(); // Ensure cards indices to remove are sorted.

    crib.add(hand.remove(cardIndices[0]));
    crib.add(hand.remove(cardIndices[1]-1));
    this.pushHand(socketId);
    this.emitToOpponent(socketId, 'set unflipped', {'section': 'otherhand',
                                                    'number': 4});
    this.emitToRoom('set unflipped', {'section': 'crib',
                                      'number': crib.length()});
    if (crib.length() == 4){
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
    console.log('Requesting 1st card from: ' + this.player)
    this.requestCard(this.player);
  }
  this.setPlayCount = function(count){
    this.playCount = count;
    this.emitToRoom('set count', {'count': this.playCount});
  }
  this.addScore = function(socketId, score){
    if(score<1)
      return;
    console.log(socketId + ': Adding ' + score);
    this.scores[socketId] = Math.min(this.scores[socketId] + score, 121);
    this.sendScores();
    if(this.scores[socketId] == 121) {
      this.gameWon(socketId);
    }
  }
  this.gameWon = function(socketId){
    this.send(socketId, "You've won!");
    this.sendToOpponent(socketId, "You've lost!");
  }
  this.cardPlayed = function(socketId, cardIndex){
    var role = this.roles[socketId];
    var card = this.cards[role].get(cardIndex);
    if(this.playCount + card['playValue'] > 31){
      this.requestCard(socketId);
      return;
    }
    this.playedCards[role].push(card);
    this.playedCards['play'].unshift(card);

    var card = this.cards[role].get(cardIndex);
    var playNumber = this.playedCards[role].length

    this.emit(socketId, 'set disabled', {'section': 'hand',
                                         'index': cardIndex});
    this.emitToOpponent(socketId, 'set disabled', {'section': 'otherhand',
                                                   'index': cardIndex});
    this.emitToOpponent(socketId, 'set card', {'section': 'otherhand',
                                               'index': cardIndex,
                                               'card': card});
    this.emitToOpponent(socketId, 'set play number', {'section': 'otherhand',
                                                      'index': cardIndex,
                                                      'playNumber': playNumber});
    this.emit(socketId, 'set play number', {'section': 'hand',
                                            'index': cardIndex,
                                            'playNumber': playNumber});
    this.setPlayCount(this.playCount + card['playValue']);
    this.checkPlayScore(socketId);
    this.requestNextCard(socketId);
  }
  this.checkPlayScore = function(socketId){
    var score = 0;
    var playCards = this.playedCards['play'];
    console.log('Checking play score for ' + exports.cardsToString(playCards));
    if(this.playCount==15){
      this.messageToSections(socketId, '15 for +2');
      score += 2;
    }
    if(playCards.length > 1 && playCards[0].face == playCards[1].face){
      this.messageToSections(socketId, 'Pair for 2');
      score += 2;
      if(playCards.length > 2 && playCards[0].face == playCards[2].face){
        this.messageToSections(socketId, 'Royal Pair for 4 more');
        score += 4;
        if(playCards.length > 3 && playCards[0].face == playCards[3].face){
          this.messageToSections(socketId, '4 of a kind for 6 more');
          score += 6;
        }
      }
    }
    var longestRun = this.checkLastRun();
    if(longestRun) {
      this.messageToSections(socketId, 'Run for' + longestRun);
      score += longestRun;
    }
    addScore(socketId, score);
  }
  this.checkLastRun = function(){
    var playCards = this.playedCards['play'];
    for(var n=playCards.length;n>2;n--){
      var lastNCards = playCards.slice(0, n);
      if(exports.isRun(lastNCards)){
        // console.log('Run for ' + n);
        return n;
      }
    }
    return 0;
  }
  this.requestNextCard = function(lastCardPlayer){
    if(this.playedCards['dealer'].length + this.playedCards['player'].length == 8){
      console.log('Last card for one')
      this.addScore(lastCardPlayer, 1);
      this.handOver();
      return
    }
    var nextCardPlayer = this.opponent[lastCardPlayer];
    if(this.canPlay(nextCardPlayer)) {
      this.requestCard(nextCardPlayer);
      return;
    }
    if(this.canPlay(lastCardPlayer)) {
      this.addScore(lastCardPlayer, 1);
      this.requestCard(lastCardPlayer);
      return;
    }
    if(this.playCount == 31){
      console.log('31 for 2')
      this.addScore(lastCardPlayer, 2);
    }else{
      console.log('Go for 1');
      this.addScore(lastCardPlayer, 1);
    }
    this.playedCards['play'] = [];
    this.setPlayCount(0);
    this.requestCard(nextCardPlayer);
  }
  this.canPlay = function(socketId){
    var role = this.roles[socketId];
    var cards = this.cards[role];
    var playedCards = this.playedCards[role];
    for(var i=0;i<cards.length();i++) {
      var card = cards.get(i);
      var cardNotPlayed = playedCards.indexOf(card) == -1;
      if(cardNotPlayed && card.playValue + this.playCount <= 31){
        return true;
      }
    }
    return false;
  }
  this.handOver = function(){
    this.emitToRoom('set cards', {'section': 'crib',
                                  'cards': this.cards['crib'].cards});
    this.emitToRoom('enable all');
    this.emitToRoom('new hand ready');
    this.emitToRoom('set count', {'count': -1});

    this.cards['player'].flip(this.cards['flip']);
    this.cards['crib'].flip(this.cards['flip']);
    this.cards['dealer'].flip(this.cards['flip']);

    this.scoreHands();

    this.switchPlayers();
    this.newHand();

    var game = this;
    this.sockets[this.dealer].once('start next hand', function(){
      game.resetHand(game.dealer);
      game.pushHand(game.dealer);
      game.send(game.dealer, 'You are the dealer. ' + game.dealer);
    });
    this.sockets[this.player].once('start next hand', function(){
      game.resetHand(game.player);
      game.pushHand(game.player);
      game.send(game.player, 'You are NOT the dealer. ' + game.player);
    });
  }
  this.scoreHands = function(){
    this.addScore(this.player, this.scoreHand('player'));
    this.addScore(this.dealer, this.scoreHand('dealer'));
    this.addScore(this.dealer, this.scoreHand('crib'));

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
    this.emit(this.dealer, 'set scores', {'score': this.scores[this.dealer],
                                          'opponentScore': this.scores[this.player]});
    this.emit(this.player, 'set scores', {'score': this.scores[this.player],
                                          'opponentScore': this.scores[this.dealer]});
  }
  this.send = function(socketId, message){
    this.sockets[socketId].send(message);
  }
  this.sendToRoom = function(message){
    this.io.sockets.in(this.name).send(message);
  }
  this.sendToOpponent = function(socketId, message){
    socketId = this.opponent[socketId];
    this.send(socketId, message);
  }
  this.emit = function(socketId, event, data){
    this.sockets[socketId].emit(event, data);
  }
  this.emitToOpponent = function(socketId, event, data){
    socketId = this.opponent[socketId];
    this.emit(socketId, event, data);
  }
  this.emitToRoom = function(event, data){
    this.io.sockets.in(this.name).emit(event, data);
  }
  this.emitToSections = function(socketId, event, data){
    data['section'] = 'hand';
    this.emit(socketId, event, data);
    data['section'] = 'otherhand';
    this.emitToOpponent(socketId, event, data);
  }
  this.messageToSections = function(socketId, message){
    this.emitToSections(socketId, 'add message', {'message': message});
  }
  this.pushHand = function(socketId){
    var cards = this.cards[this.roles[socketId]];
    this.emit(socketId, 'set cards', {'section': 'hand',
                                      'cards': cards.cards});
    console.log('Sending ' + cards.length() + ' cards to  ' + socketId);
    if(cards.length()==6){
      console.log('Requesting crib from ' + socketId);
      this.requestCrib(socketId);
    }
  }
  this.resetHand = function(socketId){
    this.emit(socketId, 'set cards', {'section': 'crib', 'cards': []});
    this.emit(socketId, 'set unflipped', {'section': 'crib',
                                          'number': this.cards['crib'].length()});
    this.emit(socketId, 'set count', {'count': -1});
    this.emit(socketId, 'set unflipped', {'section': 'flip',
                                          'number': 1});
    this.emit(socketId, 'set unflipped', {'section': 'hand',
                                          'number': 6});
    this.emit(socketId, 'set unflipped', {'section': 'otherhand',
                                          'number': 6-this.cards['crib'].length()});
  }
  this.setCribUnflipped = function(){
    this.emitToRoom('set unflipped', {'section': 'crib', 'number': 4});
  }
  this.showFlip = function(){
    this.emitToRoom('set card', {'section': 'flip',
                                 'index': 0,
                                 'card': this.cards['flip']});
    if(this.cards['flip'].face == 'J'){
      this.addScore(this.dealer, 2);
    }

  }
  this.requestCards = function(socketId, number, callback){
    var game = this;
    this.sockets[socketId].once('cards selected', function(data){
      var cardIndices = data['cards'].map(function(cardId){
        return parseInt(cardId[4]);
      });
      return callback(cardIndices);
    });
    this.emit(socketId, 'need cards', {'role': this.roles[socketId],
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
  this.scoreHand = function(handName){
    var isCrib = handName=='crib'
    var hand = this.cards[handName];
    var socketId = handName == 'player' ? this.player : this.dealer;

    var score = 0;
    var runs = []; // Lengths of detected runs (3, 4 or 5).
    this.messageToSections(socketId, 'Scoring: ' + hand.toString());
    // Look at all possible combinations of cards.
    var combos = exports.combinations(hand.fullHand());
    // console.log(combos.length + ' combos')
    for (var i=0;i<combos.length;i++) {
      var combo = combos[i];
      var cardSum = exports.addCardSum(combo); // Sum of play values for hards in combo.
      // Check for 15s.
      if(cardSum==15){
        this.messageToSections(socketId, '-15 for 2');
        score += 2; //+2 for any 15.
      }
      // Check for pairs.
      if(combo.length==2 && combo[0].face == combo[1].face){
        this.messageToSections(socketId, '-Pair for 2');
        score += 2;//+2 for any pair. Will automatically find 3/4 of a kinds.
      }else if(combo.length>2){
        // Combos larger than 2 may contain a run.
        if(exports.isRun(combo)){
          // console.log('Run of ' + combo.length + ' (this run)');
          runs.push(combo.length);
        }
      }
    }
    runs.sort().reverse();
    // Runs array is now in reverse sorted order. For example :
    // if the hand was a double run of 4 it would look like [4, 4, 3, 3].
    for (var i=0;i<runs.length;i++) {
      if(runs[0]==runs[i]){
        // Add to score the length of any runs that are as long as the longest run.
        this.messageToSections(socketId, '-Run for ' + runs[i]);
        score += runs[i];
      }
    }
    // Check for flushes.
    if(exports.isFlush(hand.cards)){
      var flipMatches = hand.flip.suit == hand.cards[0].suit;
      if(flipMatches){
        // +5 for 5 card flush.
        this.messageToSections(socketId, '-Flush for 5');
        score += 5;
      } else if(!hand.isCrib){
        // +4 for 4 card flush if this is not the crib.
        this.messageToSections(socketId, '-Flush for 4');
        score += 4;
      }
    }
    //Check for his nobs.
    for(var i=0;i<hand.cards.length;i++){
      if(hand.cards[i].face == 'J' && hand.cards[i].suit == hand.flip.suit){
        this.messageToSections(socketId, '-His nobs for 1');
        score += 1;
      }
    }
    return score;
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
    return '(' + this.suit + this.face + ')';
  }
  return card;
}

exports.cardsToString = function(cards){
  var s = 'Cards[' + cards[0].toString();
  for(var i=1;i<cards.length;i++){
    s += ', ' + cards[i].toString();
  }
  return s + ']';

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
    'flip': deck[0],
    'dealer': new exports.Hand(deck.slice(1,7)),
    'player': new exports.Hand(deck.slice(7,13)),
    'crib': new exports.Hand([], true)
  };
}

exports.Hand = function(cards, isCrib){
  this.cards = cards;
  this.cards.sort(exports.cardCompare);
  this._flip = null;
  this.isCrib = typeof isCrib !== 'undefined' ? isCrib : false;
  this._fullHand = null;

  this.flip = function(flip){
    this._fullHand = null;
    this._flip = flip;
  }
  this.length = function(){
    return this.fullHand().length;
  }
  this.get = function(index){
    return this.fullHand()[index];
  }
  this.remove = function(index){
    this._fullHand = null;
    return this.cards.splice(index, 1)[0];
  }
  this.add = function(card){
    this._fullHand = null;
    this.cards.push(card);
    this.cards.sort(exports.cardCompare);
  }
  this.fullHand = function(){
    if(this._fullHand!==null){
      return this._fullHand;
    }
    if(this._flip===null){
      return this.cards;
    }
    this._fullHand = this.cards.slice(0)
    this._fullHand.push(this._flip);
    this._fullHand.sort(exports.cardCompare);
    return this._fullHand;
  }
  this.toString = function(){
    if(this.isCrib){
      var s = 'Crib';
    }else{
      var s = 'Hand';
    }
    s += '[' + this.cards[0].toString();
    for(var i=1;i<this.cards.length;i++){
      s += ',' + this.cards[i].toString();
    }
    if(this._flip){
      s += ' Flip:' + this._flip.toString();
    }
    return s + ']';
  }

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
  for(var i=1;i<cards.length;i++){
    if(cards[i].suit != cards[0].suit){
      return false;
    }
  }
  return true;
}
exports.isRun = function(cards){
  if(cards.length<3){
    return false;
  }
  cards = cards.slice(0);
  cards.sort(exports.cardCompare);
  for(var i=1;i<cards.length;i++){
    if(cards[0].index!=cards[i].index-i){
      return false;
    }
  }
  return true;
}
exports.cardCompare = function(card1, card2){
  return card1.index - card2.index;
}
