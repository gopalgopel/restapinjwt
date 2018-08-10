// app/models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Tk1Schema  = new Schema({
    geometry: Object,
    type: String,
    properties: Object
}, 
// { collection : 'news_analysed' });
{ collection : 'id_daerah_tk1' });

module.exports = mongoose.model('Tk1', Tk1Schema);
