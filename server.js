// RESTfull API NATIONAL DEFENSE INFORMATION GRID (NDIG)
// GopaL - 2016

// BASE SETUP
// =============================================================================
var express     = require('express');        // call express
// var fileUpload  = require('express-fileupload'); //fileupload
var app         = express();                 // define our app using express
var bodyParser  = require('body-parser');
var Tk1         = require('./app/models/tk1');
var Tk2         = require('./app/models/tk2');
var Berita       = require('./app/models/berita'); //ini untuk anak d3 2018 (pega)
var Pesan       = require('./app/models/pesan'); //ini u=route u/ intelebot
var Laporan     = require('./app/models/laporan');
var Twitter     = require('./app/models/twitter');
var Roles       = require('./app/models/roles');
var Newsintel   = require('./app/models/newsintel');
var AnalysedInfo= require('./app/models/analysedinfo');
var DocumentCategories    = require('./app/models/documentcategories');
var PesanIntelApp = require('./app/models/pesanintelapp');  //ini hasil kerjaan rahman D4 dan arif D4
var summ        = require('./summary.js')(AnalysedInfo);
var util        = require('./util.js');
// var News     = require('./app/models/news');
// var Webpage  = require('./app/models/crawl_webpage');
var CryptoJS = require('crypto-js');
var multer      = require('multer'); 

var mongoose    = require('mongoose');
// mongoose.connect('mongodb://localhost:27017/pesanIntelDB'); // connect to our database
mongoose.connect('mongodb://192.168.1.241:27017/dias'); // connect to our database
// mongoose.connect('mongodb://192.168.1.8:27017/skmchatbot_message'); // connect to our database
// mongoose.connect('mongodb://localhost:27017/dias');

// add package untuk sistem autentikasi njwt
var uuidV4      = require('uuid/v4');
var nJwt        = require('njwt');
var morgan      = require('morgan');
var cors        = require('cors');
var generateKey = uuidV4();
var User        = require('./app/models/user');
var signingKey  = generateKey;   

// configure app to use bodyParser()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure app to use morgan and cors
app.use(morgan('dev'));
app.use(cors());

// configure app to use cors
var corsOptions = {
   origin : true,
   allowedHeaders : ["*"],
   exposedHeaders : ["x-new-jwt"]
};

// configure app to use multer for Mobile NDIG-APP
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/file')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
  })
var upload = multer({ storage: storage, limits: {fileSize: 1000*1000*40} }).array('file',10);

// add header
// app.all('/*', function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "X-Requested-With");
//   next();
// });
app.all('/*',cors(corsOptions)); // set seluruh router dengan cors

// GLOBAL VARIABEL
var port = process.env.PORT || 9099;        // set our port
var START, END;
var encryptpass = 'NDIG-DIAS'; // key untuk encrypt data
var MODE_DEVELOP = true; // mode untuk on=false/off=true encrypt data dan decrypt url
var MODE_AUTH = false; // mode untuk on/off autentikasi dengan njwt, true jika ada autentikasi



// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// middleware to use for all requests
router.use(function(req, res, next) {    
    if (!MODE_AUTH){
        next();
    } else {
        if(req.path !== ('/authenticate')) {
            if (MODE_DEVELOP || !req.headers.origin) {
                if (!req.headers.origin) {
                    var token = req.headers.authorization
                } else {
                    var token = req.query.token;
                }
            } else {
                var bytes = CryptoJS.AES.decrypt(req.url.substr(1), encryptpass);
                var decryptURI = bytes.toString(CryptoJS.enc.Utf8);
                var split = decryptURI.substr(1).slice(0, -1).split('?token=');
                var token = split[1];
            }
                if (token) {
                    nJwt.verify(token, signingKey, function(err,verifiedJwt) {
                        if (err) {
                            res.status(400).send(err);
                        } else {
                            req.body.verifiedJwt = verifiedJwt.body;
                            if (verifiedJwt.body.exp > Math.floor(Date.now()/1000)){
                                if ((verifiedJwt.body.exp-Math.floor(Date.now()/1000)) <= 60*60*2) {
                                    getToken(verifiedJwt.body, signingKey, function(err, newToken){
                                        if(err) {
                                            res.status(401).send(err);
                                        } else {
                                            res.header({ 'x-new-jwt' : newToken });
                                        }
                                    });
                                }
                                    if ( !MODE_DEVELOP && req.headers.origin ) {
                                        req.url = split[0].substr(4);
                                        req.originalUrl = split[0];
                                        req.verifiedJwt = verifiedJwt;
                                    }
                                next();
                            } else {
                                res.status(401).send(verifiedJwt);
                            }
                        }
                    });
                } else {
                    res.status(403).send({ 
                        success: false, 
                        message: 'No token provided.'
                    });
                }
        } else {
            next(); // make sure we go to the next routes and don't stop here
        }
    }
    // do logging
    console.log('---Something is happening---', req.params);
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
	res.json({ message: 'heeloww! welcome to our api!' });   
});

// ROUTING NDIG START HERE
// =============================================================================

// PESAN INTEL DAN NEWS
router.route('/newsintel')
    // A2. mengakses semua pesan
    .get(function(req, res) {
        var temp = [];
        Pesan.find(function(err, pesanasli) {
            if (err)
                res.send(err);

            for(i=0; i<pesanasli.length; i++){
                var pesanmodif = new Newsintel();      // create a new instance of the Pesan model
                pesanmodif.source       = 'intel';
                pesanmodif.dari         = pesanasli[i].dari;  
                pesanmodif.laporan      = pesanasli[i].laporan;           
                if(pesanasli[i].lokasi)  {pesanmodif.lokasi       = pesanasli[i].lokasi;} else {pesanmodif.lokasi = null;}
                if(pesanasli[i].category){pesanmodif.category     = pesanasli[i].category;} else {pesanmodif.category = null;}
                pesanmodif.date         = pesanasli[i].date;
                pesanmodif.threatlevel  = null;    

                temp.push(pesanmodif);
            }
            
            AnalysedInfo.find(function(err, newsasli) {
                if (err)
                    res.send(err);

                for(i=0; i<newsasli.length; i++){
                    var newsmodif = new Newsintel();      // create a new instance of the Pesan model
                    newsmodif.source       = newsasli[i].dataSource;
                    newsmodif.dari         = newsasli[i].contentLocator;  
                    newsmodif.laporan      = newsasli[i].contentSubject;
                    if(newsasli[i].eventLat && newsasli[i].eventLon){newsmodif.lokasi = {latitude : newsasli[i].eventLat, longitude : newsasli[i].eventLon};} else {newsmodif.lokasi = null;}
                    newsmodif.category = newsasli[i].categoryMain;
                    if(newsasli[i].categorySub1) {newsmodif.category += ','+newsasli[i].categorySub1;}
                    if(newsasli[i].categorySub2) {newsmodif.category += ','+newsasli[i].categorySub2;}
                    newsmodif.date         = newsasli[i].eventDateDate;
                    newsmodif.threatlevel  = newsasli[i].threatWarning;

                    temp.push(newsmodif);
                }
                // Encrypt
                res.json( encryptData(temp, encryptpass) );
            });
        });
    });

router.route('/newsintel/filter/:paramwaktu')
    .get(function(req, res) {
        var nPrev;
        if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
        var thePrevDate = util.getNPrevDate(nPrev);
        
        // akses DB
        var temp = [];
        Pesan.find({'date': {$gte: thePrevDate}}, function(err, pesanasli) {
            if (err)
                res.send(err);

            for(i=0; i<pesanasli.length; i++){
                var pesanmodif = new Newsintel();      // create a new instance of the vid model
                pesanmodif.source       = 'intel';
                pesanmodif.dari         = pesanasli[i].dari;  
                pesanmodif.laporan      = pesanasli[i].laporan;           
                if(pesanasli[i].lokasi)  {pesanmodif.lokasi       = pesanasli[i].lokasi;} else {pesanmodif.lokasi = null;}
                if(pesanasli[i].category){pesanmodif.category     = pesanasli[i].category;} else {pesanmodif.category = null;}
                pesanmodif.date         = pesanasli[i].date;
                pesanmodif.threatlevel  = null;    

                temp.push(pesanmodif);
            }
            
            AnalysedInfo.find({'eventDateDate': {$gte: thePrevDate}},function(err, newsasli) {
                if (err)
                    res.send(err);

                for(i=0; i<newsasli.length; i++){
                    var newsmodif = new Newsintel();      // create a new instance of the Pesan model
                    newsmodif.source       = newsasli[i].dataSource;
                    newsmodif.dari         = newsasli[i].contentLocator;  
                    newsmodif.laporan      = newsasli[i].contentSubject;
                    if(newsasli[i].eventLat && newsasli[i].eventLon){newsmodif.lokasi = {latitude : newsasli[i].eventLat, longitude : newsasli[i].eventLon};} else {newsmodif.lokasi = null;}
                    newsmodif.category = newsasli[i].categoryMain;
                    if(newsasli[i].categorySub1) {newsmodif.category += ','+newsasli[i].categorySub1;}
                    if(newsasli[i].categorySub2) {newsmodif.category += ','+newsasli[i].categorySub2;}
                    newsmodif.date         = newsasli[i].eventDateDate;
                    newsmodif.threatlevel  = newsasli[i].threatWarning;

                    temp.push(newsmodif);
                }
                // Encrypt
                res.json( encryptData(temp, encryptpass) );
            });
        });
    })




// -------------- batas provinsi kota kabupaten ----------------
// -------------- batas provinsi provinsi kota kabupaten ----------------
// -------------- batas provinsi provinsi kota kabupaten ----------------
// -------------- batas provinsi provinsi kota kabupaten ----------------
router.route('/tk1')
    .post(function(req, res) {        
        var tk1 = new Tk1();      // create a new instance of the Pesan model
        tk1.geometry    = req.body.geometry
        tk1.type        = req.body.type
        tk1.properties  = req.body.properties

        // save the pesan and check for errors
        tk1.save(function(err, tk1) {
            if (err)
                res.send(err);
            res.json({ message: 'tk1 '+tk1+' berhasil digenerate!' });
        });
    })
    .get(function(req, res) {
        Tk1.find(function(err, tk1) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(tk1, encryptpass) );
        });
    });

router.route('/tk2')
    .post(function(req, res) {        
        var tk2 = new Tk2();      // create a new instance of the Pesan model
        tk2.geometry    = req.body.geometry
        tk2.type        = req.body.type
        tk2.properties  = req.body.properties

        // save the pesan and check for errors
        tk2.save(function(err, tk2) {
            if (err)
                res.send(err);
            res.json({ message: 'tk2 '+tk2+' berhasil digenerate!' });
        });
    })
    .get(function(req, res) {
        Tk2.find(function(err, tk2) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(tk2, encryptpass) );
        });
    });
// -------------- batas provinsi kota kabupaten ----------------
// -------------- batas provinsi kota kabupaten ----------------
// -------------- batas provinsi kota kabupaten ----------------
// -------------- batas provinsi kota kabupaten ----------------
// -------------- batas provinsi kota kabupaten ----------------

// -----------------------LAPORAN-----------------------------
// -----------------------LAPORAN-----------------------------
// -----------------------LAPORAN-----------------------------
router.route('/laporan')
    .post(function(req, res) {        
        var laporan = new Laporan();      // create a new instance of the Pesan model
        
        laporan.foto1 = req.body.foto1;
        laporan.foto2 = req.body.foto2;
        laporan.tanggal = req.body.tanggal;
        laporan.kategori = req.body.kategori;
        laporan.isi = req.body.isi;
        laporan.judul = req.body.judul;
        laporan.lokasi = req.body.lokasi;
        laporan.lat = req.body.lat;
        laporan.lon = req.body.lon;
        laporan.tingkat = req.body.tingkat;
        laporan.orang = req.body.orang;            

        // save the pesan and check for errors
        laporan.save(function(err, laporan) {
            if (err)
                res.send(err);
            res.json({ message: 'laporan '+laporan+' berhasil digenerate!' });
        });
    })

    .get(function(req, res) {
        Laporan.find(function(err, laporan) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(laporan, encryptpass) );
        });
    });
// -----------------------LAPORAN-----------------------------
// -----------------------LAPORAN-----------------------------
// -----------------------LAPORAN-----------------------------

// -----------------------BERITAMOBILE-----------------------------
// -----------------------BERITAMOBILE-----------------------------
// -----------------------BERITAMOBILE-----------------------------
// -----------------------BERITAMOBILE-----------------------------
router.route('/beritamobile')
    .post(function(req, res) {        
        
        upload(req, res, function(err) {
                if(err) {
                    res.status(404).send(err);
                } else {
                    console.log ("HAHAHAHAHAHAHA");
                    var berita = new Berita();      // create a new instance of the Pesan model
                    berita.judul = req.body.judul;
                    berita.isi = req.body.isi;
                    berita.category = req.body.category;
                    berita.pengirim = req.body.pengirim;
                    berita.date_berita = req.body.date_berita;
                    berita.date_pengirim = req.body.date_pengirim;
                    berita.lok_pengirim = req.body.lok_pengirim;
                    berita.lok_berita = req.body.lok_berita;
                    // berita.file = req.body.file;
                    berita.file = req.files.map(function (info){
                        // var filterinfo = {
                            // size: info.size,
                            // path: info.path,
                            // mimetype: info.mimetype,
                            // encoding: info.encoding        
                        // };
                        return info.path;
                    });
                    
                    // save the pesan and check for errors
                    berita.save(function(err, berita) {
                        if(err) {
                            res.send(err);
                        } else {
                            if (req.files)
                                console.log('file successfully saved to server');
                            res.json({ message: 'berita '+berita+' dari NDIG-App berhasil digenerate!' });
                        }
                    });



                }
        });
    })

           
        

    .get(function(req, res) {
        Berita.find(function(err, berita) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(berita, encryptpass) );
        });
    });
// -----------------------BERITAMOBILE-----------------------------
// -----------------------BERITAMOBILE-----------------------------
// -----------------------BERITAMOBILE-----------------------------
// -----------------------BERITAMOBILE-----------------------------

// -----------------------PESANS-----------------------------
// -----------------------PESANS-----------------------------
// -----------------------PESANS-----------------------------
// -----------------------PESANS-----------------------------

// A. mengakses semua pesan dan menyimpan pesan 
router.route('/rawpesans')

// A1. menyimpan pesan k DB
	.post(function(req, res) {        
		var pesan = new Pesan();      // create a new instance of the Pesan model
		pesan.dari      = req.body.dari;  // ngisi param
		pesan.type      = req.body.type;
		pesan.date      = req.body.date;
		pesan.category  = req.body.category;
		pesan.laporan   = req.body.pesan;
        pesan.foto      = req.body.foto;
        pesan.video     = req.body.video;

console.log("pesan ", pesan);
		// save the pesan and check for errors
		pesan.save(function(err, pesan) {
			if (err)
				res.send(err);
			res.json({ message: 'pesan '+pesan+' berhasil digenerate!' });
		});
	})

// A2. mengakses semua pesan
    .get(function(req, res) {
        Pesan.find(function(err, pesans) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(pesans, encryptpass) );
        });
    });


// -------------------------------------------------------------------
// B. mengakses pesan intel tertentu:
// B1. berdasarkan pengirim
router.route('/rawpesans/dari/:nama')
    .get(function(req, res) {
        Pesan.find({ 'dari': {$regex:req.params.nama, $options: 'i'}}, function (err, pesan) {
            if (err) 
                res.send(err);
            // Encrypt
            res.json( encryptData(pesan, encryptpass) );
        });
    })

// B2. berdasarkan type
router.route('/rawpesans/type/:tipe')
    .get(function(req, res) {
        Pesan.find({ 'type': req.params.tipe}, function (err, pesan) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(pesan, encryptpass) );
        });
    })

// B3. berdasarkan id tertentu
router.route('/rawpesans/:pesan_id')
    .get(function(req, res) {
        Pesan.findOne({_id: req.params.pesan_id}, function(err, pesan) {
            if (err) 
                res.send(err);
            // Encrypt
            res.json( encryptData(pesan, encryptpass) );
        });
    })

   .put(function(req, res) {
		Pesan.findOne({_id: req.params.pesan_id}, function(err, pesan) {
            // console.log(req.param);
			if (err)
				res.send(err);

			// update the pesan 
			pesan.dari      = pesan.dari;  // ngisi param
			pesan.type      = pesan.type;
			pesan.date      = pesan.date;
			pesan.category  = pesan.category;
			pesan.laporan   = pesan.laporan;
			pesan.lokasi    = req.body.lokasi;
            pesan.foto      = pesan.foto;
            pesan.video     = pesan.video;

			// var pesan = new Pesan();      // create a new instance of the Pesan model
			// pesan.dari      = req.body.dari;  // ngisi param
			// pesan.type      = req.body.type;
			// pesan.date      = req.body.date;
			// pesan.category  = req.body.category;
			// pesan.laporan   = req.body.pesan;


			// save the pesan
			pesan.save(function(err) {
				if (err)
					res.send(err);
				res.json({ message: 'Pesan updated!' });
			});
		});
	})


// B4. berdasarkan date tertentu
// router.route('/rawpesans/:st/:fn')
//     .get(function(req, res) {
//         START = new Date(req.params.st);
//         END = new Date(req.params.fn);
//         END.setDate(END.getDate() + 1);
//         Pesan.find({'date': {$gt: START, $lte: END}}, function(err, pesan) {
//             if (err)
//                 res.send(err);
//             res.json(pesan);
//         });
//     })

// B4.5 berdasarkan filter param date
router.route('/rawpesans/filter/:paramwaktu')
    .get(function(req, res) {
        var nPrev;
        if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
        var thePrevDate = util.getNPrevDate(nPrev);
        
        Pesan.find({'date': {$gte: thePrevDate}}, function(err, pesan) {
            if (err) 
                res.send(err);
            // Encrypt
            res.json( encryptData(pesan, encryptpass) );
        });
    })

// B5. berdasarkan isi pesan (ANALISIS ISI PESAN INTEL)
router.route('/rawpesans/isi/:pesan')
    .get(function(req, res) {
        Pesan.find({ 'pesan': {$regex:req.params.pesan, $options: 'i'}}, function (err, pesan) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(pesan, encryptpass) );
        });
    })


// -------------------------------------------------------------------
// C. update (put) pesan intel dgn id tertentu:
// router.route('/rawpesans/put/:pesan_id')
//    .put(function(req, res) {

//         // use our bear model to find the bear we want
//         Pesan.findOne(req.params.pesan_id, function(err, pesan) {
//             if (err)
//                 res.send(err);

//             // update the pesan 
//             pesan.dari      = req.body.dari;  
//             pesan.type      = req.body.type;
//             pesan.penerima  = req.body.penerima;
//             pesan.date      = req.body.date;
//             pesan.pesan     = req.body.pesan;

//             // save the pesan
//             pesan.save(function(err) {
//                 if (err)
//                     res.send(err);
//                 res.json({ message: 'Pesan updated!' });
//             });
//         });
//     })

// -------------------------------------------------------------------
// D. delete pesan intel dgn id tertentu
// router.route('/rawpesans/delete/:pesan_id')
//     .delete(function(req, res) {
//         Pesan.remove({_id: req.params.pesan_id}, function(err, pesan) {
//             if (err)
//                 res.send(err);
//             res.json({ message: 'Pesan '+pesan+' successfully deleted' });
//         });
//     });




// -----------------------TWITTER-----------------------------
// -----------------------TWITTER-----------------------------
// -----------------------TWITTER-----------------------------
// -----------------------TWITTER-----------------------------
// mengakses semua twitter dan menyimpan twitter
router.route('/rawtwitters')
   .post(function(req, res) {        
		var twitter = new Twitter();      // create a new instance of the Pesan model
		twitter.user        = req.body.user;  // ngisi param
		twitter.location    = req.body.location;
		twitter.geolocation = req.body.geolocation;
		twitter.date        = req.body.date;
		twitter.tweet       = req.body.tweet;
		// save the pesan and check for errors
		twitter.save(function(err, twit) {
			if (err)
				res.send(err);
			res.json({ message: 'tweet '+twit+' berhasil digenerate!' });
		});
    })
    
    .get(function(req, res) {
        Twitter.find(function(err, twit) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(twit, encryptpass) );
        });
    });




// // -------------------------------------------------------------------
// // B. mengakses pesan Twitter tertentu:
// // B1. berdasarkan pengirim
// router.route('/twitters/user/:nama')
//     .get(function(req, res) {
//         Twitter.find({ 'user': {$regex:req.params.nama, $options: 'i'}}, function (err, twitter) {
//             if (err)
//                 res.send(err);
//             res.json(twitter);
//         });
//     })

// // B2. berdasarkan lokasi
// router.route('/twitters/location/:loc')
//     .get(function(req, res) {
//         Twitter.find({ 'location': {$regex:req.params.loc, $options: 'i'}}, function (err, twitter) {
//             if (err)
//                 res.send(err);
//             res.json(twitter);
//         });
//     })

// // B3. berdasarkan id tertentu
// router.route('/twitters/:pesan_id')
//     .get(function(req, res) {
//         Twitter.findOne(req.params.pesan_id, function(err, twitter) {
//             if (err)
//                 res.send(err);
//             res.json(twitter);
//         });
//     })

// // B4. berdasarkan isi tweet
// router.route('/twitters/isi/:kata')
//     .get(function(req, res) {
//         Twitter.find({ 'tweet': {$regex:req.params.kata, $options: 'i'}}, function (err, twitter) {
//             if (err)
//                 res.send(err);
//             res.json(twitter);
//         });
//     })



// -----------------------ANALYSED INFO-----------------------------
// -----------------------ANALYSED INFO-----------------------------
// -----------------------ANALYSED INFO-----------------------------
// -----------------------ANALYSED INFO-----------------------------

// NAMBAHIN CRUD BUAT BERITA MANUAL
// A1. mengakses semua analysed info (hasil analisa dias)
router.route('/analysedinfo')
    .get(function(req, res) {
        // var intel = new Intel();      // create a new instance of the Intel model
        AnalysedInfo.find().sort('-eventDateDate').find(function(err, news) {
            if (err)
                res.send(err);
            // Encrypt
            res.json( encryptData(news, encryptpass) );
        });
    })

// .find().sort('-posted')

    .post(function(req, res) {        
        var analysedInfo = new AnalysedInfo();      // create a new instance of the model
        // _id: String,
        analysedInfo.dataSource         = "admin";
        analysedInfo.sourceMongoHost    = "192.168.1.241";
        analysedInfo.sourceMongoPort    = "27017";
        analysedInfo.sourceDbName       = "Dias";
        analysedInfo.sourceCollection   = "filtered_news";
        analysedInfo.sourceObjectId     = "adminadmin";
        analysedInfo.categoryMain       = req.body.categoryMain;
        analysedInfo.categorySub1       = req.body.categorySub1;
        analysedInfo.categorySub2       = req.body.categorySub2;
        analysedInfo.contentSubject     = req.body.contentSubject;
        analysedInfo.contentLocator     = req.body.contentLocator;
        analysedInfo.eventDateDate      = req.body.eventDateDate;
        analysedInfo.eventDateString    = req.body.eventDateString;
        analysedInfo.eventLat           = req.body.eventLat;
        analysedInfo.eventLon           = req.body.eventLon;
        analysedInfo.eventDaerahTk1     = req.body.eventDaerahTk1;
        analysedInfo.eventDaerahTk2     = req.body.eventDaerahTk2;
        analysedInfo.threatWarning      = req.body.threatWarning;
        analysedInfo.timeStamp          = req.body.timeStamp;
        
        // save the pesan and check for errors
        analysedInfo.save(function(err, twit) {
            if (err)
                res.send(err);
            res.json({ message: 'laporan manual '+twit+' berhasil digenerate!' });
        });
    })

router.route('/analysedinfo/:aaaid')
    .get(function(req, res) {
        AnalysedInfo.findOne({_id: req.params.aaaid}, function(err, ainfo) {
            if (err) 
                res.send(err);
            // Encrypt
            res.json( encryptData(ainfo, encryptpass) );
	
        });
    })

   .put(function(req, res) {
        AnalysedInfo.findOne({_id: req.params.aaaid}, function(err, ainfo) {
            if (err)
                res.send(err);

            // update the ainfo
            ainfo.dataSource         = "admin";
            ainfo.sourceMongoHost    = "192.168.1.241";
            ainfo.sourceMongoPort    = "27017";
            ainfo.sourceDbName       = "Dias";
            ainfo.sourceCollection   = "filtered_news";
            ainfo.sourceObjectId     = "adminadmin";
        // ainfo.dataSource         = req.body.dataSource;
            // ainfo.sourceMongoHost    = req.body.sourceMongoHost;
            // ainfo.sourceMongoPort    = req.body.sourceMongoPort;
            // ainfo.sourceDbName       = req.body.sourceDbName;
            // ainfo.sourceCollection   = req.body.sourceCollection;
            // ainfo.sourceObjectId     = req.body.sourceObjectId;
            ainfo.categoryMain       = req.body.categoryMain;
            ainfo.categorySub1       = req.body.categorySub1;
            ainfo.categorySub2       = req.body.categorySub2;
            ainfo.contentSubject     = req.body.contentSubject;
            ainfo.contentLocator     = req.body.contentLocator;
            ainfo.eventDateDate      = req.body.eventDateDate;
            ainfo.eventDateString    = req.body.eventDateString;
            ainfo.eventLat           = req.body.eventLat;
            ainfo.eventLon           = req.body.eventLon;
            ainfo.eventDaerahTk1     = req.body.eventDaerahTk1;
            ainfo.eventDaerahTk2     = req.body.eventDaerahTk2;
            ainfo.threatWarning      = req.body.threatWarning;
            ainfo.timeStamp          = req.body.timeStamp;            

            // save the pesan
            ainfo.save(function(err) {
                if (err)
                    res.send(err);
                res.json({ message: 'analized info updated!' });
            });
        });
    })

    .delete(function(req, res) {
        AnalysedInfo.remove({_id: req.params.aaaid}, function(err, ainfo) {
            if (err)
                res.send(err);
            res.json({ message: 'Laporan '+ainfo+' successfully deleted' });
        });
    });


// A2. DASHBOARD - FILTER - SOURCE 
// paramsource = [all, news, twitter, intel]
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
router.route('/analysedinfo/filter/:paramwaktu/source/:paramsource')
    .get(function(req, res) {
        var nPrev;
        if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
        var thePrevDate = util.getNPrevDate(nPrev);
        
        if (req.params.paramsource == "all"){
            AnalysedInfo.find({'eventDateDate': {$gte: thePrevDate}}, function (err, info) {
                if (err)
                    res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
            });
        } 
        else {
            AnalysedInfo.find({
                $and: [
                      {'dataSource': req.params.paramsource},
                      {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
                ]
            }, function (err, info) {
                if (err)
                    res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
            });
        }
    });


// A3. CATEGORY - FILTER - SOURCE 
// paramCat = lihat documentCategories.json atau category_summary.ods
// paramLev = [low, med, high]

// router.route('/analysedinfo/category/:paramcat')
//     .get(function(req, res) {
//         AnalysedInfo.find({ 'categoryMain': req.params.paramcat}, function (err, info) {
//             if (err)
//                 res.send(err);
//             res.json(info);
//         });
//     });

router.route('/analysedinfo/category/:paramcat/filter/:paramwaktu/source/:paramsource')
    .get(function(req, res) {
        var nPrev;
        if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
        var thePrevDate = util.getNPrevDate(nPrev);
        
        if (req.params.paramsource == "all"){
            AnalysedInfo.find({
                $and: [
                      {'categoryMain': req.params.paramcat},
                      {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
                ]
            }, function (err, info) {
                if (err)
                    res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
            });
        } 
        else {
            AnalysedInfo.find({
                $and: [
                      {'categoryMain': req.params.paramcat},
                      {'dataSource': req.params.paramsource},
                      {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
                ]
            }, function (err, info) {
                if (err)
                    res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
            });
        }
    });


// A4. THREATLEVEL - FILTER - SOURCE 
// paramLev = [low, med, high]

// router.route('/analysedinfo/threatlevel/:paramlev')
//     .get(function(req, res) {
//         AnalysedInfo.find({ 'threatWarning': req.params.paramlev}, function (err, info) {
//             if (err)
//                 res.send(err);
//             res.json(info);
//         });
//     });

router.route('/analysedinfo/threatlevel/:paramlev/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		var nPrev;
		if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
		var thePrevDate = util.getNPrevDate(nPrev);
		
		if (req.params.paramsource == "all"){
			AnalysedInfo.find({
				$and: [
					  {'threatWarning': req.params.paramlev},
					  {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
            });
		} 
		else {
			AnalysedInfo.find({
				$and: [
					  {'threatWarning': req.params.paramlev},
					  {'dataSource': req.params.paramsource},
					  {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
			});
		}
	});


// A5. SUBCATEGORY1 - FILTER - SOURCE 
// paramSubCat1 = lihat documentCategories.json atau category_summary.ods
// paramLev = [low, med, high]

// router.route('/analysedinfo/subcategory1/:paramcat')
//     .get(function(req, res) {
//         AnalysedInfo.find({ 'categorySub1': req.params.paramcat}, function (err, info) {
//             if (err)
//                 res.send(err);
//             res.json(info);
//         });
//     });

router.route('/analysedinfo/subcategory1/:paramcat/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		var nPrev;
		if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
		var thePrevDate = util.getNPrevDate(nPrev);
		
		if (req.params.paramsource == "all"){
			AnalysedInfo.find({
				$and: [
					  {'categorySub1': req.params.paramcat},
					  {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					res.send(err);
				// Encrypt
                res.json( encryptData(info, encryptpass) );
			});
		} 
		else {
			AnalysedInfo.find({
				$and: [
					  {'categorySub1': req.params.paramcat},
					  {'dataSource': req.params.paramsource},
					  {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					res.send(err);
                // Encrypt
                res.json( encryptData(info, encryptpass) );
            });
		}
	});


// A6. SUBCATEGORY2 - FILTER - SOURCE 
// paramSubCat2 = lihat documentCategories.json atau category_summary.ods
// paramLev = [low, med, high]

// router.route('/analysedinfo/subcategory2/:paramcat')
//     .get(function(req, res) {
//         AnalysedInfo.find({ 'categoryMain': req.params.paramcat}, function (err, info) {
//             if (err)
//                 res.send(err);
//             res.json(info);
//         });
//     });

router.route('/analysedinfo/subcategory2/:paramcat/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		var nPrev;
		if (req.params.paramwaktu == "lastday"){nPrev=1};
        if (req.params.paramwaktu == "last3day"){nPrev=3};
        if (req.params.paramwaktu == "lastweek"){nPrev=7};
        if (req.params.paramwaktu == "lastmonth"){nPrev=30};
        if (req.params.paramwaktu == "lastyear"){nPrev=365};
		var thePrevDate = util.getNPrevDate(nPrev);
		
		if (req.params.paramsource == "all"){
			AnalysedInfo.find({
				$and: [
					  {'categorySub2': req.params.paramcat},
					  {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					res.send(err);
				// Encrypt
                res.json( encryptData(info, encryptpass) );
			});
		} 
		else {
			AnalysedInfo.find({
				$and: [
					  {'categorySub2': req.params.paramcat},
					  {'dataSource': req.params.paramsource},
					  {'eventDateDate': {$gte: thePrevDate}} //sama dengan date.month bulan ini
				]
			}, function (err, info) {
				if (err)
					res.send(err);
				// Encrypt
                res.json( encryptData(info, encryptpass) );
			});
		}
	});



// -----------------------SUMMARY-----------------------------
// -----------------------SUMMARY-----------------------------
// -----------------------SUMMARY-----------------------------
// -----------------------SUMMARY-----------------------------


// mengakses summari analysed info tiap provinsi
router.route('/threatsummary')
    .get(function(req, res) {
        console.log("Accessing /threatsummary");
        summ.getProvinceSummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );
        });
    });

// mengakses summari category dari analysed info tiap provinsi
router.route('/categorysummary')
    .get(function(req, res) {
        console.log("Accessing /categorysummary");
        summ.getCategorySummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );
        });
    });



// -----------------------PIECHART-----------------------------
// -----------------------PIECHART-----------------------------
// -----------------------PIECHART-----------------------------
// -----------------------PIECHART-----------------------------


// PIECHART - FILTER - SOURCE 
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
// paramsource = [all, news, twitter, intel]
router.route('/piechart/filter/:paramwaktu/source/:paramsource')
    .get(function(req, res) {
        console.log("Accessing /piechart with filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 
        summ.getPiechartSummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );
        }, req.params.paramwaktu, req.params.paramsource);
    });


// PIECHART - CATEGORY - FILTER - SOURCE 
// paramCat = lihat documentCategories.json
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
// paramsource = [all, news, twitter, intel]
router.route('/piechart/category/:paramcat/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		console.log("Accessing /piechart with category " + req.params.paramcat + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource);

		summ.getPiechartCategorySummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );                        
		}, req.params.paramcat, req.params.paramwaktu, req.params.paramsource);
	});


// PIECHART - SUBCATEGORY1 - FILTER - SOURCE 
// paramsubcat1 = lihat documentCategories.json atau category_summary.ods
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
// paramsource = [all, news, twitter, intel]
router.route('/piechart/subcategory1/:paramsubcat1/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		console.log("Accessing /piechart with subcategory1 " + req.params.paramsubcat1 + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 
		
		summ.getPiechartSubcategory1Summary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );            
		}, req.params.paramsubcat1, req.params.paramwaktu, req.params.paramsource);
	});


// PIECHART - SUBCATEGORY2 - FILTER - SOURCE 
// paramsubcat2 = lihat documentCategories.json atau category_summary.ods
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
// paramsource = [all, news, twitter, intel]
router.route('/piechart/subcategory2/:paramsubcat2/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		console.log("Accessing /piechart with subcategory2 " + req.params.paramsubcat2 + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 
		
		summ.getPiechartSubcategory2Summary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );  
		}, req.params.paramsubcat2, req.params.paramwaktu, req.params.paramsource);
	});


// PIECHART - THREATLEVEL - FILTER - SOURCE 
// paramLev = [low, med, high]
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
// paramsource = [all, news, twitter, intel]
router.route('/piechart/threatlevel/:paramlev/filter/:paramwaktu/source/:paramsource')
    .get(function(req, res) {
        console.log("Accessing /piechart with threat level " + req.params.paramlev + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 
        summ.getPiechartThreatSummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );
        }, req.params.paramlev, req.params.paramwaktu, req.params.paramsource);
    });



// -----------------------LINECHART-----------------------------
// -----------------------LINECHART-----------------------------
// -----------------------LINECHART-----------------------------
// -----------------------LINECHART-----------------------------


// LINECHART - FILTER - SOURCE 
// paramsource = [all, news, twitter, intel]
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
router.route('/linechart/filter/:paramwaktu/source/:paramsource')
    .get(function(req, res) {
        console.log("Accessing /linechart with filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 
        summ.getLinechartSummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );
        }, req.params.paramwaktu, req.params.paramsource);
    });


// LINECHART - CATEGORY - FILTER - SOURCE 
// paramCat = lihat documentCategories.json
// paramsource = [all, news, twitter, intel]
router.route('/linechart/category/:paramcat/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		console.log("Accessing /linechart with category " + req.params.paramcat + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 

		summ.getLinechartCategorySummary(function(summary) {
			// Encrypt
            res.json( encryptData(summary, encryptpass) );
		}, req.params.paramcat, req.params.paramwaktu, req.params.paramsource);
	});


// LINECHART - SUBCATEGORY1 - FILTER - SOURCE 
// paramsubcat1 = lihat documentCategories.json atau category_summary.ods
// paramsource = [all, news, twitter, intel]
router.route('/linechart/subcategory1/:paramsubcat1/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		console.log("Accessing /linechart with subcategory1 " + req.params.paramsubcat1 + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 

		summ.getLinechartSubcategory1Summary(function(summary) {
			// Encrypt
            res.json( encryptData(summary, encryptpass) );
		}, req.params.paramsubcat1, req.params.paramwaktu, req.params.paramsource);
	});


// LINECHART - SUBCATEGORY1 - FILTER - SOURCE 
// paramsubcat1 = lihat documentCategories.json atau category_summary.ods
// paramsource = [all, news, twitter, intel]
router.route('/linechart/subcategory2/:paramsubcat2/filter/:paramwaktu/source/:paramsource')
	.get(function(req, res) {
		console.log("Accessing /linechart with subcategory2 " + req.params.paramsubcat2 + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 

		summ.getLinechartSubcategory2Summary(function(summary) {
			// Encrypt
            res.json( encryptData(summary, encryptpass) );
		}, req.params.paramsubcat2, req.params.paramwaktu, req.params.paramsource);
	});


// LINECHART - THREATLEVEL - FILTER - SOURCE 
// paramLev = [low, med, high]
// paramwaktu = [lastday, lastweek, lastmonth, lastyear]
// paramsource = [all, news, twitter, intel]
router.route('/linechart/threatlevel/:paramlev/filter/:paramwaktu/source/:paramsource')
    .get(function(req, res) {
        console.log("Accessing /linechart with threat level " + req.params.paramlev + " and filter " + req.params.paramwaktu + " and source " + req.params.paramsource); 
        summ.getLinechartThreatSummary(function(summary) {
            // Encrypt
            res.json( encryptData(summary, encryptpass) );
        }, req.params.paramlev, req.params.paramwaktu, req.params.paramsource);
    });

// -----------------------ROUTER LOGIN-----------------------------
// -----------------------ROUTER LOGIN-----------------------------
// -----------------------ROUTER LOGIN-----------------------------
router.post('/authenticate', function(req, res){
    User.findOne({
        username: req.body.username
    }, function(err, user){
        if(err) throw err;
    
        if(!user){
            res.status(404)
                .send('Authentication failed! Username not found');
        } else if(user){
            if(req.body.password === user.password) {
                getToken(user, signingKey, function(err, token) {
                    if(err) {
                        res.send(err)
                    } else {
                        res.json({ token: token });
                    }
                })
            } else {
                    res.status(404)
                        .send('Authentication failed! Wrong password');
            }
        }
    });
    });

// -----------------------Fungsi generate Token dan encrypt data-----------------------------
// -----------------------Fungsi generate Token dan encrypt data-----------------------------
// -----------------------Fungsi generate Token dan encrypt data-----------------------------
// function get token using njwt
function getToken(user, secretKey, callback) {
    Roles.findOne(user.role, function(err, roles) {
        if (err) {
          callback(err, null);
        } else {
            var claims = {
                iss: "NDIG-DIAS",
                sub: user.username,
                username: user.username,
                role: user.role,
                _id: user._id,
                permissions: roles.permissions
            };    
            var jwt = nJwt.create(claims, secretKey);
            jwt.setExpiration(Date.now() + (60*60*10*1000)); //(second * minute * 1000) in milisecond
            var token = jwt.compact();
            callback(null, token);
        }
    });
    };
    
// function encrypt data
var encryptData = function (data, encryptpass) {
    if (MODE_DEVELOP === true) {    
        return JSON.parse(JSON.stringify({
            data: data
        }));
    } else {
        var encryptData = CryptoJS.AES.encrypt(JSON.stringify(data), encryptpass);
        return JSON.parse(JSON.stringify({
            data: encryptData.toString(),
            secta: true
        }));
    }
    };
module.exports = {              // export kebutuhan di file lain
    encryptpass: encryptpass,
    encryptData: encryptData
};

// ROUTER FOR MOBILE NDIG-APP
router.route('/pesanintelapp')
// Menyimpan pesan dan attachmentinfo ke DB
.post(function(req, res) {
    var verifiedJwt = req.body.verifiedJwt;
    upload(req, res, function(err) {
        if(err) {
            res.status(404).send(err);
        } else {
            if(!req.body.pesan || !req.body.category || !req.body.date || !req.body.longitudeUser || !req.body.latitudeUser || !req.body.longitudeTKP || !req.body.latitudeTKP){
                res.status(404).send('Data belum diisi lengkap!');
            } else {
                var pesan = new PesanIntelApp();

                pesan.laporan = req.body.pesan;
                pesan.category = req.body.category;
                pesan.date = req.body.date;
                pesan.dari = verifiedJwt.username;
                pesan.lokasiUser = {
                    longitude: req.body.longitudeUser,
                    latitude: req.body.latitudeUser
                };
                pesan.lokasiTKP = {
                    longitude: req.body.longitudeTKP,
                    latitude: req.body.latitudeTKP
                };
                    
                pesan.attachmentInfo = req.files.map(function (info){
                    var filterinfo = {
                        size: info.size,
                        path: info.path,
                        mimetype: info.mimetype,
                        encoding: info.encoding        
                    };
                    return filterinfo;
                });

                pesan.save(function(err, pesanintelapp) {
                    if(err) {
                        res.send(err);
                    }
                    else {
                        if (req.files)
                            console.log('Attachment info successfully saved to database');
                        res.json({ message: 'pesan '+pesanintelapp.laporan+' dari NDIG-App berhasil digenerate!' });
                    }
                });
            }
        }
    })
})
// Mengakses semua pesan
.get(function(req, res){
    var username = req.body.verifiedJwt.username;
    PesanIntelApp.find({'dari': {$regex:username, $options: 'i'} }, function(err, pesans) {
        if(err) {
            res.status(404).send(err);
        } else {
            res.json(pesans);
        }
    })
})

// =============================================================================
// all of our routes will be prefixed with /api
app.use('/api', router);
router.use('/usermanagement', require('./router-usermanagement')); // panggil router di file js lain
router.use('/rolemanagement', require('./router-rolemanagement')); // panggil router di file js lain

// START THE SERVER
// =============================================================================
app.listen(port);
console.log(" ");
console.log("===========================================================");
console.log("initializing National Defense Information Grid API service");
console.log("gopal's magic happens on port " + port);
