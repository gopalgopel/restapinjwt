// app/models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var PesanSchema  = new Schema({
    dari: String,
    type: String,
    date: Date,
    category: String,
    laporan: String,
    lokasi: Object,
    foto: String,
    video: String
}, 
// { collection : 'news_analysed' });
{ collection : 'pesanintel_raw' });

module.exports = mongoose.model('Pesan', PesanSchema);
