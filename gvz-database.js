var GVZ = (function() {
	'use strict';
	
	/// LIBRARY VARIABLES
	var methods = {};
	var internal = {};
	var databases = [];
	var logging = true;
	var GoogleAuth;
	
	/// USER VARIABLES
	var authStatusListener = function(){};
	
	/* var databases = 
	(Array)[
		(DatabaseObject){
			"name": "SHEET NAME",
			"id": "SHEET ID",
			"pages": (Array)[
				(PageObject){
					"name": "PAGE NAME",
					"id": "PAGE ID"
				},
				...
			]
		},
		...
	]
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
		if (logging){ console.log(string); }
	};
	
	/// LOADS DATABASES FROM USER'S DRIVE
	methods.loadDatabases = function(){
		let params = "mimeType='application/vnd.google-apps.spreadsheet' and '"+GoogleAuth.currentUser.get().getBasicProfile().getEmail()+"' in writers and trashed = false";
		gapi.client.drive.files.list({
			q: params,
		}).then(function(response) {
			let dbs = response.result.files;
			for (let i = 0; i < dbs.length; i++){
				methods.reloadDatabase(dbs[i].id);
			}
		});
	};
	
	/// RELOADS ALL INFO ON A DATABASE INTO databases
	methods.reloadDatabase = function(id){
		gapi.client.sheets.spreadsheets.get({
			spreadsheetId: id
		}).then(function(response){
			let pages = {};
			for (let i = 0; i < response.result.sheets.length; i++){
				pages[response.result.sheets[i].properties.sheetId] = response.result.sheets[i].properties.title;
			}
			databases.push({
				"name":response.result.properties.title,
				"id":id,
				"pages": pages
			});
		});
	};
	
	/// LOADS THE GOOGLEAUTH VARIABLE
	methods.initialize = function(apiKey,clientId,keepAuth){
		// Check if gapi can be used
		keepAuth = (keepAuth === true);
		if (typeof(gapi) === undefined){ throw 'GVZ Error: gapi is undefined. Did the API load properly?'; }
		// Call gapi load function
		gapi.load('client:auth2', function(){
			// Then initialize its client
			gapi.client.init({ // Initialize a client with these properties
				"apiKey":apiKey,
				"discoveryDocs":["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest","https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest"],
				"clientId":clientId,
				"scope":"https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets"
			}).then(function(){
				// Then assign GoogleAuth and call the user's listener
				GoogleAuth = gapi.auth2.getAuthInstance();
				GoogleAuth.isSignedIn.listen(authStatusListener);
				// Sign out unless told to do otherwise
				if (!keepAuth){ GoogleAuth.signOut(); }
				else { authStatusListener(); }
			});
		});
	};
	
	/// TOGGLES AUTH STATUS AND TRIGGERS DIALOGUE OR SIGNS OUT
	methods.toggleAuth = function(){
		if (typeof(GoogleAuth) === undefined){ throw 'GVZ Error: GoogleAuth is undefined. Try calling GVZ.initialize()'; }
		if (GoogleAuth.isSignedIn.get()) { GoogleAuth.signOut(); }
		else { GoogleAuth.signIn(); }
	}
	
	/// GETS CURRENT AUTH STATUS
	methods.getAuthStatus = function(){
		if (typeof(GoogleAuth) === undefined){ throw 'GVZ Error: GoogleAuth is undefined. Try calling GVZ.initialize()'; }
		return GoogleAuth.isSignedIn.get();
	};
	
	/// SIGNS IN 
	methods.signIn = function(){
		GoogleAuth.signIn();
	}
	
	/// SIGNS OUT
	methods.signOut = function(){
		GoogleAuth.signOut();
	}
	
	/// SETS THE LISTENER FOR CHANGE IN AUTH STATUS
	methods.setAuthListener = function(callback){
		if (typeof(GoogleAuth) === undefined){ throw 'GVZ Error: GoogleAuth is undefined. Try calling GVZ.initialize()'; }
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
