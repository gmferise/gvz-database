var GVZ = (function() {
	'use strict';
	
	/// LIBRARY VARIABLES
	var methods = {};
	var databases = {};
	var GoogleAuth;
	
	/// USER VARIABLES
	var authStatusListener = function(){};
	
	/* DATABASES FORMAT: {
	"SHEET ID" : [
		"SHEET NAME",{
			"PAGE ID":"PAGE NAME",
			...
		}
	],
	...	
	}
	*/

	/// MAIN QUERY FUNCTION
	methods.query = function(string){
		if (Object.keys(databases).length === 0){ throw 'GVZ Error: No databases are known. Try GVZ.loadDatabases()'; }
		let unparsed = string.split(' ');
		let p = unparsed.pop(0);
		switch (p){
			case 'FROM':
				methods.log(unparsed);
			default:
				throw 'GVZ Error: Unexpected token "'+p+'" (expected FROM)';
		}
	};
	
	methods.log = function(string){
		console.log(string);
	};
	
	/// LOADS DATABASES FROM USER'S DRIVE
	methods.loadDatabases = function(){
		
	};
	
	/// LOADS THE GOOGLEAUTH VARIABLE
	methods.loadAuth = function(keepAuth){
		// Check if gapi can be used
		keepAuth = (keepAuth === true);
		if (typeof(gapi) === undefined){ throw 'GVZ Error: gapi is undefined. Did the API load properly?'; }
		// Call gapi load function
		gapi.load('client:auth2', function(){
			// Then initialize its client
			gapi.client.init({ // Initialize a client with these properties
				"apiKey":"AIzaSyDIptkXtN8vcrOr5LPBvk21WuAk8UmVwAs",
				"discoveryDocs":["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest","https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest"],
				"clientId":"1031491199015-pbjmtfn9kj0tvcl24k7vntelua6glb90.apps.googleusercontent.com",
				"scope":"https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets"
			}).then(function(){
				// Then assign GoogleAuth and call the user's listener
				GoogleAuth = gapi.auth2.getAuthInstance();
				GoogleAuth.isSignedIn.listen(authChangeListener);
				// Sign out unless told to do otherwise
				if (!keepAuth){ GoogleAuth.signOut(); }
				else { authStatusListener(); }
			});
		});
	};
	
	/// TOGGLES AUTH STATUS AND TRIGGERS DIALOGUE OR SIGNS OUT
	methods.toggleAuth = function(){
		if (typeof(GoogleAuth) === undefined){ throw 'GVZ Error: GoogleAuth is undefined. Try calling GVZ.loadAuth()'; }
		if (GoogleAuth.isSignedIn.get()) { GoogleAuth.signOut(); }
		else { GoogleAuth.signIn(); }
	}
	
	/// GETS CURRENT AUTH STATUS
	methods.getAuthStatus = function(){
		if (typeof(GoogleAuth) === undefined){ throw 'GVZ Error: GoogleAuth is undefined. Try calling GVZ.loadAuth()'; }
		return GoogleAuth.isSignedIn.get();
	};
	
	/// SETS THE LISTENER FOR CHANGE IN AUTH STATUS
	methods.setAuthListener = function(callback){
		if (typeof(GoogleAuth) === undefined){ throw 'GVZ Error: GoogleAuth is undefined. Try calling GVZ.loadAuth()'; }
		authStatusListener = function(){ callback(GoogleAuth.isSignedIn.get()); };
	};
	
	/// CLEARS THE LISTENER FOR CHANGE IN AUTH STATUS
	methods.clearAuthListener = function(){
		authStatusListener = function(){};
	};
		
	return methods;
	
})();

// Converts a date object into localized time ISO
// YYYY-MM-DD HH:MM:SS
function isoDate(dateObj){
	return dateObj.getFullYear()+"-"+padZeroes(2,dateObj.getMonth()+1)+"-"+padZeroes(2,dateObj.getDate())+" "+padZeroes(2,dateObj.getHours())+":"+padZeroes(2,dateObj.getMinutes())+":"+padZeroes(2,dateObj.getSeconds());
}

// Pads a number to match the desired length
function padZeroes(width, num){
	width -= num.toString().length;
	if (width > 0){
		return new Array(width+(/\./.test(num) ? 2 : 1)).join('0')+num;
	}
	return num+"";
}
