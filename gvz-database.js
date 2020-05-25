var GVZ = (function() {
	'use strict';
	
	/// *********************
	/// * PRIVATE VARIABLES *
	/// *********************
	var databases = [];
	var logging = false;
	var flair = "";
	var authStatusListener = function(newStatus){};
	var GoogleAuth;
	
	/// TODO: Rework into a class
	var datatypes = {
		"string": function(){
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
		"number": function(decimalPlaces){
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
		"unumber": function(decimalPlaces){
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
		"date": function(){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "DATE",
							"pattern": "yyyy-mm-dd"
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"time": function(){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "TIME",
							"pattern": "hh:mm:ss.000"
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"datetime": function(){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "DATE_TIME",
							"pattern": "yyyy-mm-dd hh:mm:ss.000"
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"duration": function(){
			return {
				"cell": {
					"userEnteredFormat": {
						"numberFormat": {
							"type": "TIME",
							"pattern": "[hh]:[mm]:[ss].000"
						}
					}
				},
				"fields": "userEnteredFormat.numberFormat"
			};
		},
		"boolean": function(){
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
	
	
	/// *******************
	/// * PRIVATE METHODS *
	/// *******************
	
	// Checks whether requirements for running a method are met
	// Always requires gapi and GoogleAuth to be loaded
	// requireAuth (optional) true requires user to be signed in with GoogleAuth
	var checkReqs = function(requireAuth){
		if (typeof(gapi) === undefined) { methods.err('gapi is undefined. Did the API load properly?'); }
		if (typeof(GoogleAuth) === undefined) { methods.err('GoogleAuth is undefined. Try calling GVZ.initialize()'); }
		if (requireAuth === true && GoogleAuth.isSignedIn.get() == false) { methods.err('Request failed. The user is not signed in.'); }
	};
	
	/// ******************
	/// * PUBLIC METHODS *
	/// ******************
	var methods = {};
	
	// All of library's log/debug statements
	methods.log = function(string){
		if (logging){ console.log(string); }
	};
	
	// Control whether logging is on or off
	methods.setLogging = function(bool){
		logging = bool;
	};
	
	// Toggle whether logging is on or off
	methods.toggleLogging = function(bool){
		logging = (!logging);
	};
	
	// All of library's error messages, cannot be disabled
	methods.err = function(string){
		throw 'GVZ Error: '+string;
	};

	/// AUTH METHODS
	
	/// ASYNC RETURN?
	// Configures the GoogleAuth variable, creates a client for api requests
	methods.initialize = function(apiKey,clientId,keepAuth){
		checkReqs();
		keepAuth = !(keepAuth === false); // validation, allows undefined value
		// Call gapi load function
		gapi.load('client:auth2', function(){
			// Then initialize its client
			gapi.client.init({ // Initialize a client with these properties
				"apiKey":apiKey,
				"discoveryDocs":["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest","https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest"],
				"clientId":clientId,
				"scope":"https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets"
			}).then(function(){
				// Then assign GoogleAuth and configure the listener callback pointer
				GoogleAuth = gapi.auth2.getAuthInstance();
				GoogleAuth.isSignedIn.listen(authStatusListener);
				// Sign out unless told to do otherwise
				if (!keepAuth){ GoogleAuth.signOut(); }
				else { authStatusListener(); }
			});
		});
	};
	
	/// ASYNC RETURN?
	// Toggles auth status, triggering sign-in popup or signing out
	methods.toggleAuth = function(){
		checkReqs();
		if (GoogleAuth.isSignedIn.get()) { return GoogleAuth.signOut(); }
		else { return GoogleAuth.signIn(); }
	};
	
	// Returns current auth status
	methods.getAuthStatus = function(){
		checkReqs();
		return GoogleAuth.isSignedIn.get();
	};
	
	/// ASYNC RETURN?
	// Signs in, triggering sign-in popup
	methods.signIn = function(){
		checkReqs();
		return GoogleAuth.signIn();
	};
	
	/// ASYNC RETURN?
	// Signs out
	methods.signOut = function(){
		checkReqs();
		return GoogleAuth.signOut();
	};
	
	// Sets listener for change in auth status
	// Listener function is provided with new auth status
	methods.setAuthListener = function(callback){
		authStatusListener = function(){
			checkReqs();
			callback(GoogleAuth.isSignedIn.get());
		};
	};
	
	// Clears listnener for change in auth status
	methods.clearAuthListener = function(){
		authStatusListener = function(newStatus){};
	};

	/// DATABASE HANDLING METHODS
	
	/// ASYNC RETURN!
	//Loads all databses from user's Google Drive
	methods.reloadDatabases = function(){
		methods.log('Reloading all databases...');
		checkReqs(true);
		return new Promise(function(resolve,reject){
			let params = "mimeType='application/vnd.google-apps.spreadsheet' and '"+GoogleAuth.currentUser.get().getBasicProfile().getEmail()+"' in writers and trashed = false";
			// get sheet listing
			gapi.client.drive.files.list({
				q: params,
			}).then(function(response) {
				let newDatabases = response.result.files;
				
				// filter recieved databases if necessary
				if (flair != ""){
					methods.log("Filtering by flair '["+flair+"]'");
					for (let i = 0; i < newDatabases.length; i++){
						if (newDatabases[i].name.substring(0, ('['+flair+']').length) != '['+flair+']'){
							methods.log("Filtered out database '"+newDatabases[i].name+"'");
							newDatabases.splice(i,1);
							i--;
						}
					}
				}
				
				// clear databases array and reload each new one
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
	
	/// ASYNC RETURN!
	// Reloads all info on single database from user's Google Drive
	methods.reloadDatabase = function(id){
		methods.log('Reloading database "'+id+'"...');
		checkReqs(true);
		return new Promise(function(resolve,reject){
			// get spreadsheet name, id, and pages
			gapi.client.sheets.spreadsheets.get({
				spreadsheetId: id
			}).then(function(response){				
				// create new database object from base methods
				var database = Object.create(dmethods);
				database.name = response.result.properties.title;
				database.id = id;
				methods.log(database.id+': '+database.name);
				database.tables = [];
				
				// start building the pages
				let sheets = response.result.sheets; // response's pages
				let ranges = [];
				
				for (let i = 0; i < sheets.length; i++){
					let table = {};
					table.name = sheets[i].properties.title;
					table.id = sheets[i].properties.sheetId;
					table.columns = [];
					database.tables.push(table);
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
								let col = {};
								try { col.header = hrow[r].formattedValue; }
								catch (e) { col.header = ""; }
								try { col.datatype = drow[r].userEnteredFormat.numberFormat; }
								catch (e) { col.datatype = undefined; }
								try { col.validation = drow[r].dataValidation; }
								catch (e) { col.validation = undefined; }
								database.tables[i].columns.push(col);
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
	
	// Returns databases variable 
	methods.getDatabases = function(){
		return databases;
	};
	
	// Returns info on single database given id
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
	
	// Returns whether a database exists give its id
	methods.isDatabase = function(id){
		for (let i = 0; i < databases.length; i++){
			if (id == databases[i].id) { return true; }
		}
		return false;
	};
	
	// Sets database identifier flair
	methods.setFlair = function(string){
		flair = ""+string;
	};
	
	// Gets database identifier flair
	methods.getFlair = function(){
		return flair;
	};
	
	// Clears database identifier flair
	methods.clearFlair = function(){
		flair = "";
	};
	
	/// TODO: Put this in a class
	dmethods.hasTable = function(table){
		for (let i = 0; i < this.tables.length; i++){
			if (table == this.tables[i].id) { return true; }
		}
		return false;
	}
	
	/// QUERY METHODS
	
	/// ASYNC RETURN!
	// Main query function
	methods.query = function(database, table, string){
		checkReqs(true);		
		if (databases.length === 0){ methods.err('No databases are known. Try GVZ.reloadDatabases()'); }
		// Ensure database is valid
		if (!methods.isDatabase(database)) { methods.err('Unknown Database ID "'+database+'"'); }
		if (!methods.isTable(database,table)) { methods.err('Unknown Table ID "'+table+'"'); }
		
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
	
	/// EXPOSE PUBLIC METHODS TO USER
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
