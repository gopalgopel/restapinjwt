// app/models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var BeritamobileSchema  = new Schema({
    judul: String,
    isi: String,
    category: String,
    pengirim: String,
    file: Array,
    date_berita: Date,
    date_pengirim: Date,
    lok_pengirim: Object,
    lok_berita: Object
}, 
{ collection : 'beritamobile' });

module.exports = mongoose.model('Berita', BeritamobileSchema);
