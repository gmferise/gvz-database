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
	var authStatusListener = function(newStatus){};
	var rowTypes = {
		"str": function(){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "TEXT",
							"pattern": ""
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			}
		},
		"num": function(decimalPlaces){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "NUMBER",
							"pattern": "0"+(decimalPlaces > 0 ? '.'+'0'.repeat(decimalPlaces) : '')
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"unum": function(decimalPlaces){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "NUMBER",
							"pattern": "0"+(decimalPlaces > 0 ? '.'+'0'.repeat(decimalPlaces) : '')
						}
					},
					"dataValidation": {
						"condition": { "type": "NUMBER_GREATER_THAN_EQ", "values": [{"userEnteredValue": "0"}] },
						"strict": true
					}
				},
				"fields": "userEnteredFormat.numberFormat,dataValidation"
			};
		},
		"date": function(format){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "DATE",
							"pattern": format
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"time": function(format){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "TIME",
							"pattern": format
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"datetime": function(format){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "DATE_TIME",
							"pattern": format
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"bool": function(){
			return {
				"cell": {
					"dataValidation": {
						"condition": { "type": "BOOLEAN" },
						"strict": true
					}
				},
				"fields": "dataValidation"
			};
		}
	};
	var GoogleAuth;
	
	
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
		keepAuth = !(keepAuth === false);
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
		methods.log('Reloading all databases...');
		checkReqs(true);
		return new Promise(function(resolve,reject){
			let params = "mimeType='application/vnd.google-apps.spreadsheet' and '"+GoogleAuth.currentUser.get().getBasicProfile().getEmail()+"' in writers and trashed = false";
			if (flair != "") {
				params += "and name contains '["+flair+"]'";
				GVZ.log('Using flair '+flair);
			}
			// get sheet listing
			gapi.client.drive.files.list({
				q: params,
			}).then(function(response) {
				// clear databases and reload each new one
				let newDatabases = response.result.files;
				databases = [];
				let requiredSuccesses = newDatabases.length;
				for (let i = 0; i < newDatabases.length; i++){
					methods.reloadDatabase(newDatabases[i].id).then(function(response){
						// after every reload check to see if we did them all
						if (databases.length >= requiredSuccesses){ 
							methods.log('Finished reloading all databases. Skipped '+(newDatabases.length-requiredSuccesses)+'/'+newDatabases.length);
							resolve(databases);
						}
					}).catch(function(){ // if any reject then ignore them
						requiredSuccesses--;
						if (databases.length >= requiredSuccesses){ 
							methods.log('Finished reloading all databases. Skipped '+(newDatabases.length-requiredSuccesses)+'/'+newDatabases.length);
							resolve(databases);
						}
					});
				}
			});
		});
	};
	
	/// RELOADS ALL INFO ON A DATABASE
	methods.reloadDatabase = function(id){
		methods.log('Reloading database "'+id+'"...');
		checkReqs(true);
		return new Promise(function(resolve,reject){
			// get spreadsheet name, id, and pages
			gapi.client.sheets.spreadsheets.get({
				spreadsheetId: id
			}).then(function(response){				
				// create new database object
				var database = {};
				database.name = response.result.properties.title;
				database.id = id;
				database.pages = [];
				let sheets = response.result.sheets; // response's pages
				let ranges = [];
				
				// start building the pages
				for (let i = 0; i < sheets.length; i++){
					let page = {};
					page.name = sheets[i].properties.title;
					page.id = sheets[i].properties.sheetId;
					page.rows = [];
					database.pages.push(page);
					ranges.push(sheets[i].properties.title+'!1:2');
				}
				
				// get extra page data
				gapi.client.sheets.spreadsheets.get({
					spreadsheetId: id,
					ranges: ranges,
					fields: 'sheets/data/rowData/values/userEnteredFormat/numberFormat,sheets/data/rowData/values/dataValidation,sheets/data/rowData/values/formattedValue'
				}).then(function(response){
					try { // potential parsing errors, reject if any happen
						// finish building the pages
						for (let i = 0; i < response.result.sheets.length; i++){
							let hrow = response.result.sheets[i].data[0].rowData[0].values;
							let drow = response.result.sheets[i].data[0].rowData[1].values;
						
							for (let r = 0; r < hrow.length; r++){
								let row = {};
								try { row.header = hrow[r].formattedValue; }
								catch (e) { row.header = ""; }
								try { row.datatype = drow[r].userEnteredFormat.numberFormat; }
								catch (e) { row.datatype = undefined; }
								try { row.validation = drow[r].dataValidation; }
								catch (e) { row.validation = undefined; }
								database.pages[i].rows.push(row);
							}
						}
						
						// remove any old instances of the database id
						for (let i = 0; i < databases.length; i++){
							if (databases[i].id == id){
								databases.splice(i,1);
								i--;
							}
						}
						// add the new database version
						databases.push(database);
						methods.log('Successfully reloaded database "'+id+'"');
						resolve(database);
					}
					catch (e) {
						methods.log('Failed to reload database "'+id+'"');
						reject();
					}
				});
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
		for (let i = 0; i < databases.length; i++){
			if (id == databases[i].id) { return true; }
		}
		return false;
	};
	
	/// RETURNS WHETHER A PAGE ID IS VALID ON A DATABASE
	methods.isPage = function(database,page){
		let pages = methods.getDatabase(database).pages;
		for (let i = 0; i < pages.length; i++){
			if (page == pages[i].id) { return true; }
		}
		return false;
	}
	
	/// CREATES A DATABASE
	methods.createDatabase = function(name,pages){
		
	};
	
	/// CREATES A DATABASE FROM DATABASE OBJECT
	methods.generateDatabase = function(object){
		
	};
	
	/// SETS DATABASE IDENTIFIER
	methods.setFlair = function(string){
		flair = ""+string;
	};
	
	/// GETS DATABASE IDENTIFIER
	methods.getFlair = function(){
		return flair;
	};
	
	/// CLEARS DATABASE IDENTIFIER
	methods.clearFlair = function(){
		flair = "";
	};
	
	/// *****************
	/// * QUERY METHODS *
	/// *****************
	
	/// MAIN QUERY FUNCTION
	methods.query = function(database,page,string){
		checkReqs(true);		
		if (databases.length === 0){ methods.err('No databases are known. Try GVZ.reloadDatabases()'); }
		// Ensure database is valid
		if (!methods.isDatabase(database)) { methods.err('Unknown Database ID "'+database+'"'); }
		if (!methods.isPage(database,page)) { methods.err('Unknown Page ID "'+page+'"'); }
		
		let unparsed = string.split(/[\s\n]+/); // merge all whitespace and split by it
		// remove any "" caused by leading/trailing whitespace
		for (let i = 0; i < unparsed.length; i++){
			if (unparsed[i] == "") { unparsed.splice(i,1); i--; }
		}	
		// Look for commands
		p = unparsed.shift(0).toUpperCase();
		switch (p){
			case 'SELECT':
				GVZ.log(p);
			case 'UPDATE':
				GVZ.log(p);
			case 'APPEND':
				GVZ.log(p);
			default:
				methods.err('Unexpected token "'+p+'" (expected SELECT UPDATE APPEND)');
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
