var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

// var privilege = Boolean(Array[
//     viewDashboard, viewintel, viewkategori, viewusermanagement, CRUD
// ])

var RoleSchema  = new Schema ({
    rolename: {
        type: String,
        required: true
    },
    permissions: [{ type: String }]
})

module.exports = mongoose.model('Roles', RoleSchema);