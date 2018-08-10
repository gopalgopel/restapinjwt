var express = require('express'),
    router  = express.Router();
var Roles   = require('./app/models/roles');
var User    = require('./app/models/user');
var sourceFile = require('./server');
var encryptData = sourceFile.encryptData;

// ----------------------------ROlE MANAGEMENT----------------------------------
// ----------------------------ROlE MANAGEMENT----------------------------------
// ----------------------------ROlE MANAGEMENT----------------------------------
// ----------------------------ROlE MANAGEMENT----------------------------------

router.post('/create', function(req,res) {
    var roleId = req.body.verifiedJwt.role;
    Roles.findById(roleId, function(err, role){
        if (err) {
            res.status(404).send(err);
        } else {
            if(role.permissions.indexOf("create-role") !== -1) { // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)
                if(!req.body.rolename) {
                    res.status(404)
                        .send('Please Insert Data')
                } else {
                    Roles.findOne({ rolename: req.body.rolename }, function(err, rolename) {
                        if(rolename) {
                            res.status(409)
                            .send('Rolename already exists!');
                        } else {
                            var newRole = new Roles({
                                rolename: req.body.rolename,
                                permissions: req.body.permissions
                            });

                            newRole.save(function(err, newRole) {
                                if(err) {
                                    res.status(409).send(err);
                                }
                                res.send(newRole.rolename + ' created!');
                            });
                        }
                    });
                }
            } else {
                res.status(403).send('YOU ARE FORBIDDEN!');
            }
        }
    });
});

router.get('/role-data', function(req, res) {
    var roleId = req.body.verifiedJwt.role;
    Roles.findById(roleId, function(err, role){
        if (err) {
            res.status(404).send(err)
        } else {
            if(role.permissions.indexOf("view-role-data") !== -1 ){ // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)
                Roles.find({}, function(err, roles){
                    if (err){
                        res.status(404).send(err);
                    } else {
                        // Encrypt    
                        res.json( encryptData(roles, sourceFile.encryptpass) );
                    }
                })
            } else {
                res.status(403).send('YOU ARE FORBIDDEN!');
            }
        }
    })
});

router.route('/update/:id')
    .get(function(req,res) {
            Roles.findById(req.params.id, function(err, roles){
                if(err){
                    res.status(404).send(err);
                } else {
                    res.send(roles);
                }
            })
    })

    .put(function(req, res) {
        var roleId = req.body.verifiedJwt.role;
        Roles.findById(roleId, function(err, role){
            if (err) {
                res.status(404).send(err)
            } else {
                if(role.permissions.indexOf("update-role") !== -1 ){ // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)    
                    Roles.findById(req.params.id, function(err, roles) {
                        if(req.params.id === req.body.verifiedJwt.role) {
                            res.status(400).send("CANNOT UPDATE THIS ROLE!");
                        } else {
                            if(err) {
                                res.status(404).send(err);
                            } else {
                                if(!req.body.rolename || !req.body.permissions) {
                                    res.status(404)
                                    .send('Please insert the data!');
                                } else {
                                    roles.rolename = req.body.rolename,
                                    roles.permissions = req.body.permissions
                                    
                                    roles.save(function(err, roles){
                                        if(err){
                                            return err;
                                        }
                                        res.send(roles.rolename + ' succesfully updated');
                                    });
                                }
                            }
                        }
                    })
                } else {
                    res.status(403).send('YOU ARE FORBIDDEN!');
                }
            }
        });
});
    
router.delete('/delete/:id', function(req, res) {
    var id_role = req.params.id;
    var roleId = req.body.verifiedJwt.role;
    Roles.findById(roleId, function(err, role){
        if (err) {
            res.status(404).send(err)
        } else {
            if(role.permissions.indexOf("delete-role") !== -1 ){ // kondisi jika value tidak ada pada array (jika ada akan mereturn nilai (0-n) index value tersebut)    
                Roles.findById(id_role, function (err, role){
                    if(err) {
                        res.status(404).send(err);
                    } else {
                        User.find({role: id_role}, function(err, user) {
                            if(user != '') {           
                                res.status(400).send('Failed to delete this role');
                            } else {
                                role.remove();
                                res.send('Role ' + role.rolename + ' deleted');
                            }
                        });    
                    }
                });
            } else {
                res.status(403).send('YOU ARE FORBIDDEN!');
            }
        }
    });
});

module.exports = router;