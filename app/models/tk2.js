// app/models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Tk2Schema  = new Schema({
    geometry: Object,
    type: String,
    properties: Object
}, 
// { collection : 'news_analysed' });
{ collection : 'id_daerah_tk2' });

module.exports = mongoose.model('Tk2', Tk2Schema);
