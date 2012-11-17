exports.index = function(req, res){
  res.render('crib', { title: 'Cribbage!' });
};
exports.scoring = function(req, res){
  res.render('scoring', { title: 'Scoring' });
};
