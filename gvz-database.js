var GVZ = (function() {
	'use strict';
	
	/// LIBRARY VARIABLES
	var methods = {};
	var internal = {};
	var databases = [];
	var logging = false;
	var flair = "";
	var checkReqs = function(requireAuth){
		if (typeof(gapi) === undefined) { methods.err('gapi is undefined. Did the API load properly?'); }
		if (typeof(GoogleAuth) === undefined) { methods.err('GoogleAuth is undefined. Try calling GVZ.initialize()'); }
		if (requireAuth === true && GoogleAuth.isSignedIn.get() == false) { methods.err('Request failed. The user is not signed in.'); }
	};
	var GoogleAuth;
	
	/// USER VARIABLES
	var authStatusListener = function(newStatus){};
	
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
	
	/// *******************
	/// * LOGGING METHODS *
	/// *******************
	
	/// LIBRARY EXTRA LOGS
	methods.log = function(string){
		if (logging){ console.log(string); }
	};
	
	/// SET LOGGING
	methods.setLogging = function(bool){
		logging = bool;
	};
	
	/// TOGGLE LOGGING
	methods.toggleLogging = function(bool){
		logging = (!logging);
	};
	
	/// LIBRARY ERRORS
	methods.err = function(string){
		throw 'GVZ Error: '+string;
	};
		
	/// ****************
	/// * AUTH METHODS *
	/// ****************
	
	/// LOADS THE GOOGLEAUTH VARIABLE
	methods.initialize = function(apiKey,clientId,keepAuth){
		checkReqs();
		keepAuth = (keepAuth === false);
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
		checkReqs();
		if (GoogleAuth.isSignedIn.get()) { GoogleAuth.signOut(); }
		else { GoogleAuth.signIn(); }
	};
	
	/// GETS CURRENT AUTH STATUS
	methods.getAuthStatus = function(){
		checkReqs();
		return GoogleAuth.isSignedIn.get();
	};
	
	/// SIGNS IN 
	methods.signIn = function(){
		checkReqs();
		GoogleAuth.signIn();
	};
	
	/// SIGNS OUT
	methods.signOut = function(){
		checkReqs();
		GoogleAuth.signOut();
	};
	
	/// SETS THE LISTENER FOR CHANGE IN AUTH STATUS
	methods.setAuthListener = function(callback){
		authStatusListener = function(){
			checkReqs();
			callback(GoogleAuth.isSignedIn.get());
		};
	};
	
	/// CLEARS THE LISTENER FOR CHANGE IN AUTH STATUS
	methods.clearAuthListener = function(){
		authStatusListener = function(newStatus){};
	};

	/// ********************
	/// * DATABASE METHODS *
	/// ********************
	
	/// LOADS DATABASES FROM USER'S DRIVE
	methods.reloadDatabases = function(){
		checkReqs(true);
		return new Promise(function(resolve,reject){
			let params = "mimeType='application/vnd.google-apps.spreadsheet' and '"+GoogleAuth.currentUser.get().getBasicProfile().getEmail()+"' in writers and trashed = false";
			if (flair != "") { params += "and name contains '["+flair+"]'"; }
			gapi.client.drive.files.list({
				q: params,
			}).then(function(response) {
				let newDatabases = response.result.files;
				databases = [];
				let successes = 0;
				for (let i = 0; i < newDatabases.length; i++){
					methods.reloadDatabase(newDatabases[i].id).then(function(response){
						successes++;
						if (successes >= newDatabases.length){ resolve(databases); }
					});
				}
			});
		});
	};
	
	/// RELOADS ALL INFO ON A DATABASE
	methods.reloadDatabase = function(id){
		checkReqs(true);
		return new Promise(function(resolve,reject){
			gapi.client.sheets.spreadsheets.get({
				spreadsheetId: id
			}).then(function(response){
				let pages = {};
				for (let i = 0; i < response.result.sheets.length; i++){
					pages[response.result.sheets[i].properties.sheetId] = response.result.sheets[i].properties.title;
				}
				let database = {
					"name":response.result.properties.title,
					"id":id,
					"pages": pages
				};
				// remove any old instances of the database
				for (let i = 0; i < databases.length; i++){
					if (databases[i].id == id){
						databases.splice(i,1);
						i--;
					}
				}
				// add the new version
				databases.push(database);
				resolve(database);
			});
		});
	};
	
	/// RETURNS DATABASES VARIABLE
	methods.getDatabases = function(){
		return databases;
	};
	
	/// RETURNS INFO ON SINGLE DATABASE
	methods.getDatabase = function(id){
		if (methods.isDatabase(id)){
			for (let i = 0; i < databases.length; i++){
				if (databases[i].id == id) { return databases[i]; }
			}
		}
		else {
			methods.err('Unknown Database ID "'+database+'"');
		}
	};
	
	/// RETURNS WHETHER A DATABASE ID IS VALID
	methods.isDatabase = function(id){
		let ids = [];
		for (let i = 0; i < databases.length; i++){
			ids.push(databases[i].id);
		}
		return (ids.includes(id));
	};
	
	/// SETS DATBASE IDENTIFIER
	methods.setFlair = function(string){
		flair = ""+string;
	};
	
	/// CLEARS DATABASE IDENTIFIER
	methods.clearFlair = function(){
		flair = "";
	};
	
	/// *****************
	/// * QUERY METHODS *
	/// *****************
	
	/// MAIN QUERY FUNCTION
	methods.query = function(string){
		checkReqs(true);
		if (databases.length === 0){ methods.err('No databases are known. Try GVZ.reloadDatabases()'); }
		let unparsed = string.split(/[\s\n]+/); // merge all whitespace and split by it
		// remove any "" caused by leading/trailing whitespace
		for (let i = 0; i < unparsed.length; i++){
			if (unparsed[i] == "") { unparsed.splice(i,1); i--; }
		}	
		
		// First word should be USING
		let p = unparsed.shift(0).toUpperCase(); // removes and returns index 0 or undefined
		if (p != 'USING') { methods.err('Unexpected token "'+p+'" (expected USING)'); }
		
		// Second word should be the database id
		let database = unparsed.shift(0);
		if (!methods.isDatabase(database)) { methods.err('Unknown Database ID "'+database+'"'); }
		
		// Third word should be FROM
		p = unparsed.shift(0).toUpperCase();
		if (p != 'FROM') { methods.err('Unexpected token "'+p+'" (expected FROM)'); }
		
		// Fourth word should be the page index
		let page = parseInt(unparsed.shift(0));
		if (page < 0 || page >= databases[database].pages.length || isNaN(page)) { methods.err('Unknown Page ID "'+page+'"'); }
		
		// Fifth word should be the command
		// The rest is handled by each command handler
		p = unparsed.shift(0).toUpperCase();
		switch (p){
			case 'CREATE':
				GVZ.log(p);
			case 'DELETE':
				GVZ.log(p);
			case 'SELECT':
				GVZ.log(p);
			case 'UPDATE':
				GVZ.log(p);
			case 'APPEND':
				GVZ.log(p);
			default:
				methods.err('Unexpected token "'+p+'" (expected CREATE DELETE SELECT UPDATE APPEND)');
		}
	};
	
	/// EXPOSE METHODS TO USER
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
