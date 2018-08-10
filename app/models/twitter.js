// app/models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var TwitterSchema  = new Schema({
    user: String,
    location: String,
    geolocation: String,
    date: String,        //harusnya date: Date,   tp gatau knapa format di DBnya udh bukan date, jd gabisa kbaca
    tweet: String    
}, 
// { collection : 'news_analysed' });
{ collection : 'streamtweet' });

module.exports = mongoose.model('Twitter', TwitterSchema);