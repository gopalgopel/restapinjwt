// analyses.js

module.exports = function(AnalysedInfo){
	var async = require('async');
	var dateFormat = require('dateformat');
	var summArr = new Array();
	var util = require('./util.js');

	// ada double disini, dihandle nanti lagi
	var DocumentCategories = require('./app/models/documentcategories');

	getProvinceSummary = function (fn){
		summArr.length = 0;
		// Ambil list kota
		AnalysedInfo.distinct("eventDaerahTk1", function(err, provinces) {
			if (err)
				res.send(err);

			getEachProvSummary(provinces, fn);
		});
	}

	getEachProvSummary = function(provinces, fn)
	{
		async.each(provinces, function(province , eachcallback)
		{
			var newSumm = new Object();

			async.series([
				function(callback) {
					// Ambil jumlah low threats
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"threatWarning": "low"}]}, function(err, lowthreats) {
						if (err)
							res.send(err);

						// callback(null, lowthreats.length);

						// ambil summari kategori
						AnalysedInfo.distinct("categoryMain", {$and: [{"eventDaerahTk1" : province}, {"threatWarning":"low"}]}, function(err, catSumm) {
							if (err)
								res.send(err);

							callback(null, {"nLow": lowthreats.length, "catSumm": catSumm});
						});
					});
				},
				function(callback) {
					// Ambil jumlah medium threats
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"threatWarning": "medium"}]}, function(err, medthreats) {
						if (err)
							res.send(err);

						// callback(null, medthreats.length);

						// ambil summari kategori
						AnalysedInfo.distinct("categoryMain", {$and: [{"eventDaerahTk1" : province}, {"threatWarning":"medium"}]}, function(err, catSumm) {
							if (err)
								res.send(err);

							callback(null, {"nMed": medthreats.length, "catSumm": catSumm});
						});
					});
				},
				function(callback) {
					// Ambil jumlah high threats
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"threatWarning": "high"}]}, function(err, highthreats) {
						if (err)
							res.send(err);

						// callback(null, highthreats.length);

						// ambil summari kategori
						AnalysedInfo.distinct("categoryMain", {$and: [{"eventDaerahTk1" : province}, {"threatWarning":"high"}]}, function(err, catSumm) {
							if (err)
								res.send(err);

							callback(null, {"nHigh": highthreats.length, "catSumm": catSumm});
						});
					});
				}
			],
			// optional callback
			function(err, results) {
				// results is now equal to ['one', 'two']
				if (err) fn(err);

				// push the array
				AnalysedInfo
				.where('eventDaerahTk1', province)
				.select('eventLat eventLon') 		// hanya mengambil field eventLat dan eventLon
				.limit(1)
				.exec(function (err, docs) {
					newSumm.lokasi = province;
					newSumm.nLow = results[0].nLow;
					newSumm.nMed = results[1].nMed;
					newSumm.nHigh = results[2].nHigh;
					newSumm.lowCatSumm = results[0].catSumm;
					newSumm.medCatSumm = results[1].catSumm;
					newSumm.highCatSumm = results[2].catSumm;
					newSumm.lat = docs[0].eventLat;
					newSumm.lon = docs[0].eventLon;

					summArr.push(newSumm);
				
					// tell the each async that the operation for each item is finished
					eachcallback();
				});
			});
		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getCategorySummary = function (fn){
		console.log("getCategorySummary");
		summArr.length = 0;

		// Ambil list kota
		AnalysedInfo.distinct("eventDaerahTk1", function(err, provinces) {
			if (err)
				res.send(err);

			getProvCatSummary(provinces, fn);
		});
	}

	getProvCatSummary = function(provinces, fn)
	{
		DocumentCategories.find({}, function (err, documentcategories) {
			async.each(provinces, function(province , eachcallback)
			{
				var newSumm = new Object();
				var catList = new Array();

				// iterate the array of documentcategories
				async.each(documentcategories, function(kat, katcallback) {
					// Perform operation on file here.
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"categoryMain": kat.name}]}, function(err, data) {
						if (err)
							res.send(err);

						var catSum = new Object();
						catSum.name = kat.name;
						catSum.n = data.length;

						catList.push(catSum);

						katcallback();
					});
				}, 
				function(err) {
					// if any of the file processing produced an error, err would equal that error
					if( err ) {
						// One of the iterations produced an error.
						// All processing will now stop.
						console.log('Something wrong when processing category query');
					}

					AnalysedInfo
					.where('eventDaerahTk1', province)
					.select('eventLat eventLon') 		// hanya mengambil field eventLat dan eventLon
					.limit(1)
					.exec(function (err, docs) {
						newSumm.lokasi = province;
						newSumm.lat = docs[0].eventLat;
						newSumm.lon = docs[0].eventLon;
						newSumm.category = catList;

						summArr.push(newSumm);
					
						// tell the each async that the operation for each item is finished
						eachcallback();
					});
				});

			}, 
			function(err){
				if (err)
					fn(err);
				else
					fn(summArr);
			});
		});
	}

	getPiechartSummary = function (fn, paramwaktu, paramsource){
		console.log("getPiechartSummary " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list kategori
		// AnalysedInfo.distinct("categoryMain", function(err, categories) {
		// 	if (err)
		// 		res.send(err);

		// 	getPiechartData(categories, fn, paramwaktu, paramsource);
		// });
		AnalysedInfo.aggregate([{ "$group": { "_id": "$categoryMain" }}, {$sort:{"_id":1}}], function(err, categories) {
			if (err)
				res.send(err);

			getPiechartData(categories, fn, paramwaktu, paramsource);
		});
	}

	getPiechartData = function(categories, fn, paramwaktu, paramsource)
	{
		async.eachSeries(categories, function(category , eachcallback)
		{
			var newSumm = new Object();

			var nPrev;
			if (paramwaktu == "lastday"){nPrev=1};
			if (paramwaktu == "lastweek"){nPrev=7};
			if (paramwaktu == "lastmonth"){nPrev=30};
			if (paramwaktu == "lastyear"){nPrev=365};
			var thePrevDate = util.getNPrevDate(nPrev);
			
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category._id},
						{'eventDateDate': {$gte: thePrevDate}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category._id;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category._id},
						{'dataSource': paramsource},
						{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category._id;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			}
		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getPiechartCategorySummary = function (fn, paramCat, paramwaktu, paramsource){
		console.log("getPiechartCategorySummary " + paramCat + " " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list subcategory dari maincategory tertentu
		// Tested, the result is just the array of subcategory1 list. Eg Bencana = ["Bencana Alam","Bencana ulah Manusia"]
		DocumentCategories.distinct("sub1.name", {"name" : paramCat}, function(err, subcategories) { 
			if (err)
				fn(err);

			getPiechartCategoryData(subcategories, fn, paramCat, paramwaktu, paramsource);
		});
	} 

	getPiechartCategoryData = function(subcategories, fn, paramCat, paramwaktu, paramsource)
	{
		var nPrev;
		if (paramwaktu == "lastday"){nPrev=1};
		if (paramwaktu == "lastweek"){nPrev=7};
		if (paramwaktu == "lastmonth"){nPrev=30};
		if (paramwaktu == "lastyear"){nPrev=365};
		var thePrevDate = util.getNPrevDate(nPrev);

		if (subcategories.length == 0) {
			var newSumm = new Object();
			// just get the categoryMain data
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : paramCat},
						{'eventDateDate': {$gte: thePrevDate}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = paramCat;
					newSumm.amount = info.length;
					summArr.push(newSumm);
					fn(summArr);
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : paramCat},
						{'dataSource': paramsource},
						{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = paramCat;
					newSumm.amount = info.length;
					summArr.push(newSumm);
					fn(summArr);
				});
			}
		} 
		else if (subcategories.length > 0) {

			async.each(subcategories, function(subcategory , eachcallback)
			{
				var newSumm = new Object();
				
				if (paramsource == "all"){
					AnalysedInfo.find({
						$and: [
							// {'categoryMain' : paramCat},
							{'categorySub1' : subcategory},
							{'eventDateDate': {$gte: thePrevDate}}
						]
					}, function (err, info) {
						if (err)
							fn(err);

						newSumm.category = subcategory;
						newSumm.amount = info.length;
						summArr.push(newSumm);

						eachcallback();
					});
				} 
				else {
					AnalysedInfo.find({
						$and: [
							// {'categoryMain' : paramCat},
							{'categorySub1' : subcategory},
							{'dataSource': paramsource},
							{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
						]
					}, function (err, info) {
						if (err)
							fn(err);

						newSumm.category = subcategory;
						newSumm.amount = info.length;
						summArr.push(newSumm);

						eachcallback();
					});
				}
			}, 
			function(err){
				if (err)
					fn(err);
				else
					fn(summArr);
			});
		}
	}

	getPiechartSubcategory1Summary = function (fn, paramSubCat1, paramwaktu, paramsource){
		console.log("getPiechartSubcategory1Summary " + paramSubCat1 + " " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list subcategory2 dari subcategory1 tertentu
		// Tested, the result is like this: Konflik Vertikal = [{"_id":"599a873c9ab6f9041466a7cf","sub1":[{"code":"105.002.000.000","name":"Konflik Vertikal","sub2":[{"code":"105.002.001.000","name":"Demo"},{"code":"105.002.002.000","name":"Kerusuhan"}]}]}]
		DocumentCategories.find({"sub1.name" : paramSubCat1}, {'sub1.$': 1}, function(err, subcategories2) { // OK, well tested
			if (err)
				res.send(err);

			getPiechartSubcategory1Data(subcategories2, fn, paramSubCat1, paramwaktu, paramsource);
		});
	} 

	getPiechartSubcategory1Data = function(subcategories2, fn, paramSubCat1, paramwaktu, paramsource)
	{
		var nPrev;
		if (paramwaktu == "lastday"){nPrev=1};
		if (paramwaktu == "lastweek"){nPrev=7};
		if (paramwaktu == "lastmonth"){nPrev=30};
		if (paramwaktu == "lastyear"){nPrev=365};
		var thePrevDate = util.getNPrevDate(nPrev);

		console.log(subcategories2);

		if (subcategories2.length > 0 && subcategories2[0].sub1[0].sub2) {

			async.each(subcategories2[0].sub1[0].sub2, function(subcategory2, eachcallback)
			{
				var newSumm = new Object();
				
				if (paramsource == "all"){
					AnalysedInfo.find({
						$and: [
							{'categorySub2' : subcategory2.name},
							{'eventDateDate': {$gte: thePrevDate}}
						]
					}, function (err, info) {
						if (err)
							fn(err);

						newSumm.category = subcategory2.name;
						newSumm.amount = info.length;
						summArr.push(newSumm);

						eachcallback();
					});
				} 
				else {
					AnalysedInfo.find({
						$and: [
							{'categorySub2' : subcategory2.name},
							{'dataSource': paramsource},
							{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
						]
					}, function (err, info) {
						if (err)
							fn(err);

						newSumm.category = subcategory2.name;
						newSumm.amount = info.length;
						summArr.push(newSumm);

						eachcallback();
					});
				}
			}, 
			function(err){
				if (err)
					fn(err);
				else
					fn(summArr);
			});
		}
		else {
			var newSumm = new Object();
			// just get the categoryMain data
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categorySub1' : paramSubCat1},
						{'eventDateDate': {$gte: thePrevDate}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = paramSubCat1;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					fn(summArr);
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categorySub1' : paramSubCat1},
						{'dataSource': paramsource},
						{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = paramSubCat1;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					fn(summArr);
				});
			}
		}
	}

	getPiechartSubcategory2Summary = function (fn, paramSubCat2, paramwaktu, paramsource){
		console.log("getPiechartSubcategory2Summary " + paramSubCat2 + " " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		var nPrev;
		if (paramwaktu == "lastday"){nPrev=1};
		if (paramwaktu == "lastweek"){nPrev=7};
		if (paramwaktu == "lastmonth"){nPrev=30};
		if (paramwaktu == "lastyear"){nPrev=365};
		var thePrevDate = util.getNPrevDate(nPrev);

		var newSumm = new Object();
		// just get the categoryMain data
		if (paramsource == "all"){
			AnalysedInfo.find({
				$and: [
					{'categorySub2' : paramSubCat2},
					{'eventDateDate': {$gte: thePrevDate}}
				]
			}, function (err, info) {
				if (err)
					fn(err);

				newSumm.category = paramSubCat2;
				newSumm.amount = info.length;
				summArr.push(newSumm);

				fn(summArr);
			});
		} 
		else {
			AnalysedInfo.find({
				$and: [
					{'categorySub2' : paramSubCat2},
					{'dataSource': paramsource},
					{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					fn(err);

				newSumm.category = paramSubCat2;
				newSumm.amount = info.length;
				summArr.push(newSumm);

				fn(summArr);
			});
		}
	} 

	getPiechartThreatSummary = function (fn, paramLev, paramwaktu, paramsource){
		console.log("getPiechartThreatSummary " + paramLev + " " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list kota
		AnalysedInfo.distinct("categoryMain", function(err, categories) {
			if (err)
				res.send(err);

			getPiechartThreatData(categories, fn, paramLev, paramwaktu, paramsource);
		});
	}

	getPiechartThreatData = function(categories, fn, paramLev, paramwaktu, paramsource)
	{
		async.each(categories, function(category , eachcallback)
		{
			var newSumm = new Object();

			var nPrev;
			if (paramwaktu == "lastday"){nPrev=1};
			if (paramwaktu == "lastweek"){nPrev=7};
			if (paramwaktu == "lastmonth"){nPrev=30};
			if (paramwaktu == "lastyear"){nPrev=365};
			var thePrevDate = util.getNPrevDate(nPrev);
			
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category},
						{'threatWarning' : paramLev},
						{'eventDateDate': {$gte: thePrevDate}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category},
						{'threatWarning' : paramLev},
						{'dataSource': paramsource},
						{'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			}
		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getLinechartSummary = function (fn, paramwaktu, paramsource){
		console.log("getLinechartSummary " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var awalWaktu = util.getNPrevDate(iter+1);
			var akhirWaktu;
			if (iter == 0 ) akhirWaktu = new Date();
			else akhirWaktu = util.getNPrevDate(iter);

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				var linechartData = new Object();
				linechartData.date = dateFormat(awalWaktu, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (paramsource == "all") 
				{
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
							{'eventDateDate': {$gte: awalWaktu}},
							{'eventDateDate': {$lt: akhirWaktu}}
						]
					}, function(err, doc) {
						if (err) console.log(err);
						
						callback2(null, {"desc" : threat, "n": doc.length});
					});
				} else {
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
							{'dataSource': paramsource},
							{'eventDateDate': {$gte: awalWaktu}},
							{'eventDateDate': {$lt: akhirWaktu}}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				}
			}
		}
	}

	getLinechartCategorySummary = function (fn, paramCat, paramwaktu, paramsource) {
		console.log("getLinechartCategorySummary " + paramCat + " " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var awalWaktu = util.getNPrevDate(iter+1);
			var akhirWaktu;
			if (iter == 0 ) akhirWaktu = new Date();
			else akhirWaktu = util.getNPrevDate(iter);

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(awalWaktu, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (paramsource == "all") 
				{
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
							{'eventDateDate': {$gte: awalWaktu}},
							{'eventDateDate': {$lt: akhirWaktu}},
							{'categoryMain' : paramCat}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				} else {
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
							{'dataSource': paramsource},
							{'eventDateDate': {$gte: awalWaktu}},
							{'eventDateDate': {$lt: akhirWaktu}},
							{'categoryMain' : paramCat}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				}
			}
		}
	}

	getLinechartSubcategory1Summary = function (fn, paramSubCat1, paramwaktu, paramsource) {
		console.log("getLinechartSubcategory1Summary " + paramSubCat1 + " " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var awalWaktu = util.getNPrevDate(iter+1);
			var akhirWaktu = util.getNPrevDate(iter);

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(awalWaktu, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (paramsource == "all") 
				{
					if (iter == 0) {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'eventDateDate': {$gte: awalWaktu}},
								{'categorySub1' : paramSubCat1}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					} else {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'eventDateDate': {$gte: awalWaktu}},
								{'eventDateDate': {$lt: akhirWaktu}},
								{'categorySub1' : paramSubCat1}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					}
				} else {
					if (iter == 0) {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'dataSource': paramsource},
								{'eventDateDate': {$gte: awalWaktu}},
								{'categorySub1' : paramSubCat1}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					} else {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'dataSource': paramsource},
								{'eventDateDate': {$gte: awalWaktu}},
								{'eventDateDate': {$lt: akhirWaktu}},
								{'categorySub1' : paramSubCat1}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					}
				}
			}
		}
	}

	getLinechartSubcategory2Summary = function (fn, paramSubCat2, paramwaktu, paramsource) {
		console.log("getLinechartSubcategory2Summary " + paramSubCat2 + " " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var awalWaktu = util.getNPrevDate(iter+1);
			var akhirWaktu = util.getNPrevDate(iter);

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(awalWaktu, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (paramsource == "all") 
				{
					if (iter == 0) {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'eventDateDate': {$gte: awalWaktu}},
								{'categorySub2' : paramSubCat2}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					} else {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'eventDateDate': {$gte: awalWaktu}},
								{'eventDateDate': {$lt: akhirWaktu}},
								{'categorySub2' : paramSubCat2}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					}
				} else {
					if (iter == 0) {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'dataSource': paramsource},
								{'eventDateDate': {$gte: awalWaktu}},
								{'categorySub2' : paramSubCat2}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					} else {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'dataSource': paramsource},
								{'eventDateDate': {$gte: awalWaktu}},
								{'eventDateDate': {$lt: akhirWaktu}},
								{'categorySub2' : paramSubCat2}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					}
				}
			}
		}
	}

	getLinechartThreatSummary = function (fn, paramLev, paramwaktu, paramsource){
		console.log("getLinechartThreatSummary " + paramLev + " " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var awalWaktu = util.getNPrevDate(iter+1);
			var akhirWaktu;
			if (iter == 0 ) akhirWaktu = new Date();
			else akhirWaktu = util.getNPrevDate(iter);

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(awalWaktu, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (threat == paramLev) {
					if (paramsource == "all") 
					{
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'eventDateDate': {$gte: awalWaktu}},
								{'eventDateDate': {$lt: akhirWaktu}}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					} else {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'dataSource': paramsource},
								{'eventDateDate': {$gte: awalWaktu}},
								{'eventDateDate': {$lt: akhirWaktu}}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					}
				} else {
					callback2(null, {"desc" : threat, "n": 0});
				}
			}
		}
	}

	/*make some functions as public */
	return {
		getProvinceSummary : function(fn){
			getProvinceSummary(fn);
		},
		getCategorySummary : function(fn){
			getCategorySummary(fn);
		},
		getPiechartSummary : function(fn, paramwaktu, paramsource){
			getPiechartSummary(fn, paramwaktu, paramsource);
		},
		getPiechartCategorySummary : function(fn, paramCat, paramwaktu, paramsource){
			getPiechartCategorySummary(fn, paramCat, paramwaktu, paramsource);
		},
		getPiechartSubcategory1Summary : function(fn, paramSubCat1, paramwaktu, paramsource){
			getPiechartSubcategory1Summary(fn, paramSubCat1, paramwaktu, paramsource);
		},
		getPiechartSubcategory2Summary : function(fn, paramSubCat2, paramwaktu, paramsource){
			getPiechartSubcategory2Summary(fn, paramSubCat2, paramwaktu, paramsource);
		},
		getPiechartThreatSummary : function(fn, paramLev, paramwaktu, paramsource){
			getPiechartThreatSummary(fn, paramLev, paramwaktu, paramsource);
		},
		getLinechartSummary : function(fn, paramwaktu, paramsource){
			getLinechartSummary(fn, paramwaktu, paramsource);
		},
		getLinechartCategorySummary : function(fn, paramCat, paramwaktu, paramsource){
			getLinechartCategorySummary(fn, paramCat, paramwaktu, paramsource);
		},
		getLinechartSubcategory1Summary : function(fn, paramSubCat1, paramwaktu, paramsource){
			getLinechartSubcategory1Summary(fn, paramSubCat1, paramwaktu, paramsource);
		},
		getLinechartSubcategory2Summary : function(fn, paramSubCat2, paramwaktu, paramsource){
			getLinechartSubcategory2Summary(fn, paramSubCat2, paramwaktu, paramsource);
		},
		getLinechartThreatSummary : function(fn, paramLev, paramwaktu, paramsource){
			getLinechartThreatSummary(fn, paramLev, paramwaktu, paramsource);
		}
	}
}