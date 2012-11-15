"use strict";

var hand_divs;
function makeHandDivsMap(){
  hand_divs = {0:$('.flip'), 1:$('.hand1'), 2:$('.hand2')};
}

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
    }else{
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

function setCardsOnPage(){
  var hand_div = hand_divs[hand_index];
  for (var i=0;i<hand.length;i++){
    var card = new Card(hand[i]);
    var card_div = $('.cards .card' + i, hand_div);
    card_div.html(card.htmlCode());
    card_div.addClass(card.suit);
    card_div.addClass('flipped');
    card_div.removeClass('unflipped');
  }
}


function deal(){
  setUflipped('flip', 1);

  var hand1 = deck.slice(0,6);
  var hand2 = deck.slice(6,12);

  setCardsOnPage('hand1', hand1);
  setCardsOnPage('hand2', hand2);
}

function cut(){
  var flip = deck.slice(12,13);
  setCardsOnPage('flip', flip);
}

function printHand(hand){
  conosole.log()
}

function setAllUnflipped(){
   $('.card').html('&#x1f0a0;').addClass('unflipped');
}

function showHand(index){
  socket.emit('get hand', index)
}


function sendCrib(hand_div){
  var selectedCardsInHand = hand_div.find('.card.selected');
  if(selectedCardsInHand.length == 2){
    hand_div.find('.card').addClass('unselected').removeClass('selected');
    var crib = [];
    selectedCardsInHand.each(function(){
      for(var i=0;i<this.classList.length;i++){
        var className = this.classList[i];
        if(className.length==5 && className.indexOf('card')==0){
          var card = hand[parseInt(className[4], 10)];
          console.log(card);
          crib.push(card);
        }
      }
    });
    selectedCardsInHand.remove();
    $('.card').unbind('click');
    socket.emit('crib selected', {'crib': crib});
  }
}

function makeCribSelectable(){
  $('.card', hand_divs[hand_index]).click(function() {
    if($(this).hasClass('unflipped')){
      return;
    }
    if($(this).hasClass('selected')){
      $(this).addClass('unselected').removeClass('selected');
    }else{
      $(this).addClass('selected').removeClass('unselected');
      sendCrib($(this).parent());
    }
  });
}
