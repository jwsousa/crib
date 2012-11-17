// "use strict";

function Card(data){
  this.suit = data['suit'];
  this.face = data['face'];
  this.playValue = data['playValue'];

  this.toJSON = function(){
    return {'suit':this.suit, 'face':this.face}
  }

  this.print = function(){
    console.log('Card:'+ this.toString());
  }

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
    var code = '';
    if (this.suit=='S'){
      code += 'A';
    } else if (this.suit=='H'){
      code += 'B';
    } else if (this.suit=='D'){
      code += 'C';
    } else if (this.suit=='C'){
      code += 'D';
    }
    if (this.face=='J'){
      code += 'B';
    } else if (this.face=='Q'){
      code += 'D';
    } else if (this.face=='K'){
      code += 'E';
    } else {
      code += this.playValue;
    }
    code += ';';
    code += ' ' + code + ' ' + this.playValue + ' ' + this.face;
    code = '&#x1F0' + code;
    return code;
  }

  this.toHTML = function(){
    // html = $('<div/>').html(this.fancyString());
    var html = $('<div/>').html(this.htmlCode());
    html.addClass('card');
    html.addClass(this.suit);
    return html;
  }
}

function setCard(section, index, cardData){
  var cardDiv = $('#' + section + ' .cards .card#card' + index);
  var card = new Card(cardData);
  cardDiv.html(card.htmlCode());
  cardDiv.addClass(card.suit);
  cardDiv.addClass('flipped');

}

function setCardsOnPage(section, cards){
  var cardsDiv = $('#' + section + ' .cards');
  cardsDiv.html('');
  for (var i=0;i<cards.length;i++){
    var card = new Card(cards[i]);
    var cardDiv = $('<div/>');
    cardDiv.attr("id",'card'+i);
    cardDiv.addClass('card');
    cardDiv.html(card.htmlCode());
    cardDiv.addClass(card.suit);
    cardDiv.addClass('flipped');
    cardsDiv.append(cardDiv);
  }
}


function makeUnflippedCard(index){
  var card = $('<div/>');
  card.attr("id",'card'+index);
  card.addClass('card');
  card.addClass('unflipped');
  card.html('&#x1f0a0;');
  return card;
}

function setUnflipped(section, number){
  var cardsDiv = $('#' + section + ' .cards');
  cardsDiv.html('');
  for(var i=0;i<number;i++)
    cardsDiv.append(makeUnflippedCard(i));
}

function setDisabled(section, index){
  var cardDiv = $('#' + section + ' .cards .card#card' + index);
  console.debug(cardDiv);
  cardDiv.addClass('disabled');
}

function setCount(count){
  var countDiv = $('#count');
  if(count < 0){
    countDiv.html('');
  }else{
    countDiv.html('Count: ' + count);
  }
}

function setScores(score, opponentScore){
  $('#score').html('Score: ' + score);
  $('#opponentscore').html('Opponent Score: ' + opponentScore);
}

function selectCards(number){
  $('.card').unbind('click').removeClass('selectable');
  var selectableCards = $('#hand .card:not(.disabled)');
  console.log('select card:');
  console.debug(selectableCards);
  selectableCards.addClass('selectable');
  selectableCards.click(function() {
    console.log('selectable card clicked');
    $(this).toggleClass('selected');
    var selectedCardsInHand = $('#hand .card.selected');
    if(selectedCardsInHand.length == number){
      selectedCardsInHand.removeClass('selected');
      var cards = [];
      selectedCardsInHand.each(function(){
        cards.push($(this).attr('id'));
      });
      $('.card').unbind('click').removeClass('selectable');
      socket.emit('cards selected', {'cards': cards});
    }
  });
}

function gameDisconnected(){
  $('.cards').html('');
  $('.message').html('Game has been disconnected, try again.');
}

var socket = null;

function initSocket(__bool){
    if ( !socket ) {
    socket = io.connect();//{secure:false}
    socket.on('connect', function(){console.log('connected')});
    socket.on('disconnect', function (){console.log('disconnected')});
  } else {
    socket.removeAllListeners();
    socket.disconnect()
    socket.socket.connect();
  }
}

function startNextHand(){
  socket.emit('start next hand');
}

function startNewGame(){
  console.log('Starting new game.');
  initSocket();

  socket.on('message', function(message){
    console.debug('message received: ' + message);
    $('.message').html(message);
  });

  socket.on('set cards', function(data) {
    console.debug('set cards received:');
    console.debug(data);
    var cards = data['cards'];
    setCardsOnPage(data['section'], cards);
  });

  socket.on('set card', function(data) {
    console.debug('set card received:');
    console.debug(data);
    var section = data['section'];
    var index = data['index'];
    var card = data['card'];
    setCard(section, index, card);
  });

  socket.on('need cards', function(data) {
    console.debug('need cards received:');
    console.debug(data);
    selectCards(data['number']);
  });

  socket.on('set unflipped', function(data) {
    console.debug('set unflipped received:');
    console.debug(data);
    setUnflipped(data['section'], data['number']);
  });

  socket.on('set disabled', function(data) {
    console.debug('set disabled received:');
    console.debug(data);
    setDisabled(data['section'], data['index']);
  });

  socket.on('set count', function(data) {
    console.debug('set count received:');
    console.debug(data);
    setCount(data['count']);
  });

  socket.on('enable all', function() {
    console.debug('enable all received:');
    $('.disabled').removeClass('disabled');
  });

  socket.on('disconnect', function(){
    console.log('disconnected!');
    gameDisconnected();
  });

  socket.on('new hand ready', function(){
    console.log('new hand ready received');
    $('#newHand.button').removeClass('hidden');
  });

  socket.on('set scores', function(data){
    console.debug('set scores received:');
    console.debug(data);
    setScores(data['score'], data['opponentScore']);
  })
};
