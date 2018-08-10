// app/models/bear.js

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AnalysedInfoSchema = new Schema({
	// _id: String,
	dataSource: String,
	sourceMongoHost: String,
	sourceMongoPort: String,
	sourceDbName: String,
	sourceCollection: String,
	sourceObjectId: String,
	categoryMain: String,
	categorySub1: String,
	categorySub2: String,
	contentSubject: String,
	contentLocator: String,
	eventDateDate: Date,
	eventDateString: String,
	eventLat: Number,
	eventLon: Number,
	eventDaerahTk1: String,
	eventDaerahTk2: String,
	threatWarning: String,
	timeStamp: Date
}, 
// { collection : 'news_analysed' });
{ collection : 'analysed_info' });

module.exports = mongoose.model('AnalysedInfo', AnalysedInfoSchema);