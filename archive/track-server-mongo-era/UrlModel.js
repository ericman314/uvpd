var mongoose = require('mongoose');

var UrlSchema = mongoose.Schema({
  longUrl:  String,
  shortUrl: String,
});

module.exports = mongoose.model('Url', UrlSchema);
