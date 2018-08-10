var express = require('express'),
    router  = express.Router();
var Roles   = require('./app/models/roles');
var User    = require('./app/models/user');
var sourceFile = require('./server');
var encryptData = sourceFile.encryptData;

// -----------------------USER AUTHENTICATION-----------------------------
// -----------------------USER AUTHENTICATION-----------------------------
// -----------------------USER AUTHENTICATION-----------------------------
// -----------------------USER AUTHENTICATION-----------------------------

router.route('/signup')
// Router Signup
.post(function(req, res) {
//if (port === corsOptions.port){
var roleId = req.body.verifiedJwt.role;
Roles.findById(roleId, function(err, role){
    if (err) {
        res.status(404).send(err);
    } else {
        if(role.permissions.indexOf("create-user") !== -1) { // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)
            if(!req.body.username || !req.body.password || !req.body.role){
                res.status(404)
                    .send('Please insert the account data!');
            } else {
                User.findOne({username: req.body.username}, function(err, user){
                    if(user) {
                        res.status(409)
                        .send('Username already exists!');
                    } else {
                        var newUser = new User({
                            username: req.body.username,
                            password: req.body.password,
                            role: req.body.role
                        });

                        newUser.save(function(err, newUser){
                            if(err){
                                res.status(409).send(err);
                            }
                            res.send(newUser.username + ' created!');
                        });
                    }
                });
            }
        } else {
            res.status(403).send('YOU ARE FORBIDDEN!');
        }
    }
});
//} else {
//    res.status(403).send('This is CORS-enabled for only http://localhost:' + corsOptions.port);
//}
});

// Router get data user dari mongoDB
router.route('/account-data')
.get(function(req, res) {
    var roleId = req.body.verifiedJwt.role;
    Roles.findById(roleId, function(err, role){
        if (err) {
            res.status(404).send(err);
        } else {
            if(role.permissions.indexOf("view-user-data") !== -1) { // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)
                // Encrypt
                User.find({}, function(err, users) {
                    if (err) {
                        res.status(404).send(err);
                    } else {
                        res.json( encryptData(users, sourceFile.encryptpass) );
                    }
                })
            } else {
                res.status(403).send('YOU ARE FORBIDDEN!');
            }
        }
    })
});

// Router update data user
router.route('/update/:id')
.get(function(req, res){
    User.findById(req.params.id, function(err,user){
        if(err){
            res.status(404).send(err);
        } else {
            res.send(user);
        }
    })
})

.put(function(req, res) {
    var roleId = req.body.verifiedJwt.role;
    Roles.findById(roleId, function(err, role){
        if (err) {
            res.status(404).send(err);
        } else {
            if(role.permissions.indexOf("update-user") !== -1) { // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)
                User.findById(req.params.id, function(err, user){
                    if(req.params.id === req.body.verifiedJwt._id) {
                        res.status(400).send("CANNOT UPDATE THIS ACCOUNT!");
                    } else {
                        if (err) {
                            res.status(404).send(err);
                        } else {
                            if(!req.body.username || !req.body.role || !req.body.password ) {
                                res.status(404)
                                .send('Please insert the account data!');
                            } else {
                                user.username = req.body.username;
                                user.password = req.body.password;
                                user.role = req.body.role;

                                user.save(function(err, user){
                                    if(err){
                                        return err;
                                    }
                                    res.send('Succesfully updated');
                                });
                            }
                        }
                    }
                });
            } else {
                res.status(403).send('YOU ARE FORBIDDEN!');
            }
        }
    });
});

// Router Delete user
router.route('/delete/:id')
.delete(function(req, res){
    var roleId = req.body.verifiedJwt.role;
    Roles.findById(roleId, function(err, role){
        if (err) {
            res.status(404).send(err);
        } else {
            if(role.permissions.indexOf("delete-user") !== -1) { // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)
                User.findById(req.params.id, function(err,user){
                    if(req.params.id === req.body.verifiedJwt._id) {
                        res.status(400).send("CANNOT DELETED THIS ACCOUNT!");
                    } else {
                            if(err){
                                res.status(404).send(err);
                            } else {
                                user.remove();
                                res.json({
                                    msg: 'Account ' + user.username + ' successfully deleted',
                                    id: user.id
                                });
                            }
                    }
                })
            } else {
                res.status(403).send('YOU ARE FORBIDDEN!');
            }
        }
    });
});

module.exports = router;