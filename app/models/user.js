var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;

var UserSchema  = new Schema ({
    username: {
        type: String,
        unique: true,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('User', UserSchema);