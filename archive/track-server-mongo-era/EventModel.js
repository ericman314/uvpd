var mongoose = require('mongoose');
var CarModel = require('./CarModel.js');

var EventSchema = mongoose.Schema({
  name:  String,
  date:  Date,
  code:  String,
  options: mongoose.Schema.Types.Mixed,
  multiplier: {type: Number, default: 1},
  cars: [CarModel.schema]
});

module.exports = mongoose.model('Event', EventSchema);
