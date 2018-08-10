var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var LaporanSchema  = new Schema({
    foto1: String,
    foto2: String,
    tanggal: Date,
    kategori: String,
    isi: String,
    judul: String,
    lokasi: String,
    lat: String,
    lon: String,
    tingkat: String,
    orang: [{
		agama: String,
		alamat: String,
		fotoorg1: String,
		fotoorg2: String,
		fotoorg3: String,		
		nama: String,
		sebagai: String,
		suku: String,
		umur: String
	}]
}, 
{ collection : 'laporanbhi' });

module.exports = mongoose.model('Laporan', LaporanSchema);
