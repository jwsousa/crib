// "use strict";

function Card(data){
  this.suit = data['suit'];
  this.face = data['face'];
  this.playValue = data['playValue'];
  this.index = data['index'];

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
    if (this.face==10){
      code += 'A';
    } else if (this.face=='J'){
      code += 'B';
    } else if (this.face=='Q'){
      code += 'D';
    } else if (this.face=='K'){
      code += 'E';
    } else {
      code += this.playValue;
    }
    code += ';';
    // code += ' ' + code + ' ' + this.playValue + ' ' + this.face + ' ' + this.index;
    code = '&#x1F0' + code;
    return code;
  }

  this.toHTML = function(){
    // html = $('<div/>').html(this.fancyString());
    var html = $('<p/>').html(this.htmlCode());
    html.addClass('card');
    html.addClass(this.suit);
    return html;
  }
}

function setPlayNumber(section, index, playNumber){
  var cardElement = $('#' + section + ' .cards .card#card' + index);
  var marginSize = 10 * (4 - playNumber);
  if (section == 'hand'){
    cardElement.animate({marginTop: marginSize+'px'}, 100);
  }else{
    cardElement.animate({marginBottom: marginSize+'px'}, 100);
  }


}

function setCard(section, index, cardData){
  var cardElement = $('#' + section + ' .cards .card#card' + index);
  var card = new Card(cardData);
  cardElement.html(card.htmlCode());
  cardElement.addClass(card.suit);
  cardElement.addClass('flipped');
}

function setCardsOnPage(section, cards){
  var cardsElement = $('#' + section + ' .cards');
  cardsElement.html('');
  for (var i=0;i<cards.length;i++){
    var card = new Card(cards[i]);
    var cardElement = $('<p/>');
    cardElement.attr("id",'card'+i);
    cardElement.addClass('card');
    cardElement.html(card.htmlCode());
    cardElement.addClass(card.suit);
    cardElement.addClass('flipped');
    cardsElement.append(cardElement);
  }
}


function makeUnflippedCard(index){
  var card = $('<p/>');
  card.attr("id",'card'+index);
  card.addClass('card');
  card.addClass('unflipped');
  card.html('&#x1f0a0;');
  return card;
}

function setUnflipped(section, number){
  var cardsElement = $('#' + section + ' .cards');
  cardsElement.html('');
  for(var i=0;i<number;i++)
    cardsElement.append(makeUnflippedCard(i));
}

function setDisabled(section, index){
  var cardElement = $('#' + section + ' .cards .card#card' + index);
  //console.debug(cardElement);
  cardElement.addClass('disabled');
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
  //console.debug(selectableCards);
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

function addMessage(section, message){
  var element = $('#' + section + ' textarea');
  if(element.html()){
    element.append('\n');
  }
  element.append(message);
  // element.scrollTop(element[0].scrollHeight - element.height());
  element.scrollTop(element[0].scrollHeight);

}

function startNewGame(){
  console.log('Starting new game.');
  initSocket();

  socket.on('message', function(message){
    //console.debug('message received: ' + message);
    $('.message').html(message);
  });

  socket.on('set cards', function(data) {
    console.log('set cards received:');
    //console.debug(data);
    var cards = data['cards'];
    setCardsOnPage(data['section'], cards);
  });

  socket.on('set card', function(data) {
    console.log('set card received:');
    //console.debug(data);
    var section = data['section'];
    var index = data['index'];
    var card = data['card'];
    setCard(section, index, card);
  });

  socket.on('need cards', function(data) {
    console.log('need cards received:');
    //console.debug(data);
    selectCards(data['number']);
  });

  socket.on('set unflipped', function(data) {
    console.log('set unflipped received:');
    //console.debug(data);
    setUnflipped(data['section'], data['number']);
    if(data['section'] == 'hand'){
      $('.controls #newHand').addClass('hidden');
    }
  });

  socket.on('set disabled', function(data) {
    console.log('set disabled received:');
    //console.debug(data);
    setDisabled(data['section'], data['index']);
  });

  socket.on('set count', function(data) {
    console.log('set count received:');
    //console.debug(data);
    setCount(data['count']);
  });

  socket.on('enable all', function() {
    console.log('enable all received:');
    $('.disabled').removeClass('disabled');
    $('.card').addClass('handover');
  });

  socket.on('disconnect', function(){
    console.log('disconnected!');
    gameDisconnected();
  });

  socket.on('new hand ready', function(){
    console.log('new hand ready received');
    $('.controls #newHand').removeClass('hidden');
  });

  socket.on('set scores', function(data){
    console.log('set scores received:');
    //console.debug(data);
    setScores(data['score'], data['opponentScore']);
  });

  socket.on('set play number', function(data){
    console.log('set play number received:');
    //console.debug(data);
    setPlayNumber(data['section'], data['index'], data['playNumber']);
  });

  socket.on('add message', function(data){
    console.log('add message received:');
    //console.debug(data);
    addMessage(data['section'], data['message']);
  });
};

