var mongoose = require('mongoose');
var ResultModel = require('./ResultModel.js');

var CarSchema = mongoose.Schema({
  name:  String,
  nickname: String,
  weight:  Number,
  com: Number,
  den: String,
  achievements: [String],
  racingLane: Number,
  onDeckLane: Number,
  results: [ResultModel.schema]
});

module.exports = mongoose.model('Car', CarSchema);
