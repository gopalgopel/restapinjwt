// app/models/bear.js

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DocumentCategoriesSchema = new Schema({
	// _id: String,
	code: String,
	name: String,
	sub1: [{
		code: String,
		name: String,
		sub2: [{
			code: String,
			name: String,
		}]
	}]
}, 
{ collection : 'documentCategories' });

module.exports = mongoose.model('DocumentCategories', DocumentCategoriesSchema);