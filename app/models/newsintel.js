// app/models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var NewsintelSchema  = new Schema({
    source:  String,
    dari:  String,
    laporan: String,
    lokasi: Object,
    category: String,
    date: Date,
    threatlevel: String
});

module.exports = mongoose.model('Newsintel', NewsintelSchema);
