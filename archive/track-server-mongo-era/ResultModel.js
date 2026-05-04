var mongoose = require('mongoose');

var ResultSchema = mongoose.Schema({
  lane:  Number,
  time:  Number,
  place: Number,
  date:  Date
});

module.exports = mongoose.model('Result', ResultSchema);
