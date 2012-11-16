"use strict";

function Card(data){
  this.suit = data['suit'];
  this.face = data['face'];

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
    } else if (this.face=='A'){
      code += '1';
    } else{
      code += this.face;
    }
    code += ';';
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

function setCardsOnPage(div, hand){
  div = $('.cards', div);
  div.html('');
  for (var i=0;i<hand.length;i++){
    var card = new Card(hand[i]);
    var cardDiv = $('<div/>');
    cardDiv.attr("id",'card'+i);
    cardDiv.addClass('card');
    cardDiv.html(card.htmlCode());
    cardDiv.addClass(card.suit);
    cardDiv.addClass('flipped');
    div.append(cardDiv);
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

function resetAllUnflipped(){
  $('.cards').html('')

  $('.flip .cards').append(makeUnflippedCard(0));

  for(var i=0;i<6;i++)
    $('.otherhand .cards').append(makeUnflippedCard(i));

  for(var i=0;i<6;i++)
    $('.hand .cards').append(makeUnflippedCard(i));
}


function sendCrib(){
  var selectedCardsInHand = $('.hand .card.selected');
  if(selectedCardsInHand.length == 2){
    selectedCardsInHand.removeClass('selected');
    var crib = [];
    selectedCardsInHand.each(function(){
      crib.push($(this).attr('id'));
    });
    $('.card').unbind('click');
    socket.emit('crib selected', {'crib': crib});
  }
}

function makeCribSelectable(){
  $('.hand .card').click(function() {
    $(this).toggleClass('selected');
    sendCrib();
  });
}
