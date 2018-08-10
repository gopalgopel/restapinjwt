// util.js
// Place your global function in here

module.exports = {
	getNPrevDate : function(nprev) {
		var today = new Date();
		var prevDate = new Date(new Date().setDate(today.getDate()-nprev));
		prevDate.setHours(0);
		prevDate.setMinutes(0);
		prevDate.setSeconds(0);
		prevDate.setMilliseconds(0);

		return prevDate;
	}
}