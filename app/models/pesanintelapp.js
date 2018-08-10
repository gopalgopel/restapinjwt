var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;

var PesanIntelAppSchema  = new Schema ({
    laporan: String,
    category: String,
    date: Date,
    dari: String,
    lokasiUser: Object,
    lokasiTKP: Object,
    attachmentInfo: Object
});

module.exports = mongoose.model('PesanIntelApp', PesanIntelAppSchema);