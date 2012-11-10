var yourCard = function (){
var card = Math.ceil(Math.random()*52);
var suit = "J"; 
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

console.log (card);
console.log (suit);
console.log (score);
console.log (face);
console.log('hello world');
};
yourCard();