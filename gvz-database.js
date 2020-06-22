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
		
	/// *******************
	/// * PRIVATE METHODS *
	/// *******************
	
	function getFlairString(){
		return flair === '' ? flair : '['+flair+'] ';
	}
	
	const datatypes = {
		"string": function(ignored){
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
		"date": function(ignored){
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
		"time": function(ignored){
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
		"datetime": function(ignored){
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
		"duration": function(ignored){
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
		"boolean": function(ignored){
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
	
	// Converts library datatype to sheets JSON
	function datatypeToJSON(datatype){
		return datatypes[datatype.type](datatype.decimals);
	}
	
	// Converts JSON to library datatype
	function JSONtoDatatype(json){
		// Clean up the JSON for better comparisons
		delete json.formattedValue;
		// Ignore/fix patterns and strictness of validation
		if (json.hasOwnProperty("userEnteredFormat")){
			json.userEnteredFormat.numberFormat.pattern = "";
		}
		if (json.hasOwnProperty("dataValidation")){
			json.dataValidation.strict = true;
		}		
		
		// See which datatype it matches
		for (var type in datatypes){
			// Clean up datatype format for comparison
			let format = datatypes[type]().cell;
			if (type !== "boolean"){ format.userEnteredFormat.numberFormat.pattern = ""; }
			// Do comparison
			if (JSON.stringify(format) === JSON.stringify(json)){
				if (type === "number" || type === "unumber"){
					// Converts existing number pattern to number of decimals
					return new Datatype(type,json.userEnteredFormat.numberFormat.pattern.replace(/[^0#\.]/g,"").replace(/([0#]+)?\.?/,"").length);
				}
				else { return new Datatype(type); }
			}
		}
		return undefined;
	}
	
	// Identifies the datatype of an input
	function parseDatatype(input){
		return input;
	}
	
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
	
	// ASYNC RETURN!
	// Configures the GoogleAuth variable, creates a client for api requests
	methods.initialize = function(apiKey,clientId,keepAuth){
		checkReqs();
		keepAuth = !(keepAuth === false); // validation, allows undefined value
		return new Promise(function(resolve,reject){
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
					resolve();
				},
				function(response){
					reject(response.error);
				});
			});
		});
	};
	
	// ASYNC RETURN!
	// Toggles auth status, triggering sign-in popup or signing out
	methods.toggleAuth = function(){
		checkReqs();
		if (GoogleAuth.isSignedIn.get()) { return GoogleAuth.signOut(); }
		else { return GoogleAuth.signIn(); }
	};
	
	// Returns current auth status
	methods.isAuth = function(){
		checkReqs();
		return GoogleAuth.isSignedIn.get();
	};
	
	// ASYNC RETURN!
	// Signs in, triggering sign-in popup
	methods.signIn = function(){
		checkReqs();
		return GoogleAuth.signIn();
	};
	
	// ASYNC RETURN!
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

	// Returns info about the authenticated user, or undefined
	methods.getUserInfo = function(){
		checkReqs();
		if (GoogleAuth.isSignedIn.get()){
			let profile = GoogleAuth.currentUser.get().getBasicProfile();
			return {
				firstName: profile.getGivenName(),
				lastName: profile.getFamilyName(),
				email: profile.getEmail(),
				picture: profile.getImageUrl()
			};
		}
		else {
			return undefined;
		}
	};

	/// DATABASE HANDLING METHODS
	
	// ASYNC RETURN!
	// Creates online database from database template object
	// Also causes a database reload at the end
	methods.createDatabase = function(database){
		methods.log('Creating new database "'+getFlairString()+database.name+'"...	');
		if (!database.isValid()){ methods.err('Failed to create new database "'+getFlairString()+database.name+'" malformed template'); }
		
		// Clone database template object so we can modify it
		database = JSON.parse(JSON.stringify(database));
		database.name = getFlairString()+database.name;
		
		checkReqs(true);
		return new Promise(function(resolve,reject){
			gapi.client.sheets.spreadsheets.create({
				'properties': { 
					'title': database.name
				}
			}).then(function(response){
				if (response.status != 200){ reject(response); }
				
				// Store new id
				database.id = response.result.spreadsheetId;
				
				let requests = [];
				// Add new pages
				for (let i = 0; i < database.tables.length; i++){
					requests.push({
						'addSheet': {
							'properties': {
								'title':database.tables[i].name
							}
						}
					})
				}
				// Remove first page
				requests.push({
					'deleteSheet': {
						'sheetId': 0
					}
				});
				
				// Do first batch
				gapi.client.sheets.spreadsheets.batchUpdate({
					'spreadsheetId': database.id,
					'resource': {
						'requests': requests
					}
				}).then(function(response){
					if (response.status != 200){ reject(response); }
					
					// See what the new page ids are
					gapi.client.sheets.spreadsheets.get({
						'spreadsheetId': database.id
					}).then(function(response){
						if (response.status != 200){ reject(response); }
						
						// Assign the new the page ids
						for (let i = 0; i < response.result.sheets.length; i++){
							for (let t = 0; t < database.tables.length; t++){
								if (database.tables[t].name == response.result.sheets[i].properties.title){
									database.tables[t].id = response.result.sheets[i].properties.sheetId;
									break;
								}
							}
						}
						
						// Now build the requests to configure the columns 
						let requests = [];
						for (let t = 0; t < database.tables.length; t++){
							let headers = [];
							for (let c = 0; c < database.tables[t].columns.length; c++){
								// Applies format
								let json = datatypeToJSON(database.tables[t].columns[c].datatype);
								requests.push({
									'repeatCell': {
										'range': {
											'sheetId': database.tables[t].id,
											'startRowIndex': 1,
											'startColumnIndex': c,
											'endColumnIndex': c+1
										},
										'cell': json.cell,
										'fields': json.fields
									}
								});
								// Applies header
								headers.push({'userEnteredValue': {'stringValue': database.tables[t].columns[c].header }});
							}
							// Only one action is needed for the headers
							requests.push({
								'updateCells': {
									'rows': [{
										'values': headers
									}],
									'fields': 'userEnteredValue',
									'start': {
										'sheetId': database.tables[t].id,
										'rowIndex': 0,
										'columnIndex': 0
									}
								}
							});
						}
						// Now do all the requests for each page
						gapi.client.sheets.spreadsheets.batchUpdate({
							'spreadsheetId': database.id,
							'resource': {
								'requests': requests
							}
						}).then(function(response){
							if (response.status != 200){ reject(response); }
							methods.reloadDatabase(database.id).then(function(newDatabase){
								methods.log('Created new database "'+newDatabase.name+'"');
								resolve(newDatabase);
							});
						});
					});
					
				});
			});
		});
	}
	
	// ASYNC RETURN!
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
				if (response.status != 200){ reject(response); }
				
				let newDatabases = response.result.files;
				
				// filter recieved databases if necessary
				if (flair != ""){
					methods.log('Filtering by flair "['+flair+']"');
					for (let i = 0; i < newDatabases.length; i++){
						if (newDatabases[i].name.substring(0, ('['+flair+']').length) != '['+flair+']'){
							methods.log('Filtered out database "'+newDatabases[i].name+'"');
							newDatabases.splice(i,1);
							i--;
						}
					}
				}
				
				if (newDatabases.length < 1){
					resolve(databases); // no databases, oh well
				}
				
				// clear databases array and reload each new one
				// gross because async
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
	
	// ASYNC RETURN!
	// Reloads all info on single database from user's Google Drive
	// Resolves with new database object
	methods.reloadDatabase = function(id){
		methods.log('Reloading database "'+id+'"...');
		checkReqs(true);
		return new Promise(function(resolve,reject){
			// get spreadsheet name, id, and pages
			gapi.client.sheets.spreadsheets.get({
				spreadsheetId: id
			}).then(function(response){
				if (response.status != 200){ reject(response); }				
				
				// create new database object from base methods
				var database = new Database(response.result.properties.title, id, []);
				methods.log(database.id+': '+database.name);
				
				// start building the pages
				let sheets = response.result.sheets; // response's pages
				let ranges = []; // header and datatype rows to check
				
				for (let i = 0; i < sheets.length; i++){
					let table = new Table(sheets[i].properties.title, sheets[i].properties.sheetId);
					database.pushTable(table);
					ranges.push(sheets[i].properties.title+'!1:2');
				}
				
				// get extra page data
				gapi.client.sheets.spreadsheets.get({
					spreadsheetId: id,
					ranges: ranges,
					fields: 'sheets/data/rowData/values/userEnteredFormat/numberFormat,sheets/data/rowData/values/dataValidation,sheets/data/rowData/values/formattedValue'
				}).then(function(response){
					if (response.status != 200){ reject(response); }
					try { // potential parsing errors, reject if any happen
						// finish building the pages
						for (let i = 0; i < response.result.sheets.length; i++){
							let hrow = response.result.sheets[i].data[0].rowData[0].values;
							let drow = response.result.sheets[i].data[0].rowData[1].values;
						
							for (let c = 0; c < hrow.length; c++){
								let col = new Column();
								try { col.header = hrow[c].formattedValue; }
								catch (e) { col.header = ""; }
								col.datatype = JSONtoDatatype(drow[c]);
								if (col.datatype === undefined){
									methods.err('Could not determine datatype for column '+c+' ('+col.header+')');
								}
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
		else { methods.err('Unknown Database ID "'+database+'"'); }
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

	/// ***********
	/// * CLASSES *
	/// ***********
	
	class DatabaseTemplate {
		constructor(name, tables){
			this.name = name;
			this.tables = (tables === undefined) ? [] : tables;
		}
		
		// Checks if database has valid name and tables
		isValid(){
			return (this.name !== undefined && this.name !== '' && this.tablesAreValid());
		}
		
		// Checks if all tables have unique names and are valid
		tablesAreValid(){
			let names = [];
			for (let i = 0; i < this.tables.length; i++){
				names.push(this.tables[i].name);
				if (!this.tables[i].isValid()){
					return false;
				}
			}
			return (findDuplicates(names).length < 1 && this.tables.length > 0);
		}
	}
	
	class TableTemplate { 
		constructor(name, columns){
			this.name = name;
			this.columns = (columns === undefined) ? [] : columns;
		}
		
		// Checks if table has valid columns
		isValid(){
			for (let i = 0; i < this.columns.length; i++){
				if (!this.columns[i].isValid()){
					return false;
				}
			}
			return (this.columns.length > 0 && this.name !== '' && this.name !== undefined);
		}
	}
	
	class ColumnTemplate {
		constructor(header, type, decimals){
			this.header = header;
			this.datatype = new DatatypeTemplate(type, decimals);
		}
		
		// Returns if there is a header and a datatype
		isValid(){
			return (this.header !== undefined && this.header !== "" && this.datatype !== undefined);
		}
	}
	
	class DatatypeTemplate {
		constructor(type, decimals){
			if (!type in datatypes){ methods.err('Unknown type "'+type+'", expected {string|number|unumber|date|time|datetime|duration|boolean}'); }
			this.type = type;
			if (decimals !== undefined){
				this.decimals = decimals;
			}
		}
	}
	
	class Database {
		constructor(name, id){
			this.name = name;
			this.id = id;
			this.tables = [];
		}
		
		// push tables, only use method
		pushTable(table){
			table.parentId = this.id;
			this.tables.push(table);
		}
		
		// Returns table object given id or undefined
		getTable(id){
			for (let i = 0; i < this.tables.length; i++){
				if (id == this.tables[i].id){ return this.tables[i]; }
			}
			return undefined;
		}
	}
	
	class Table { 
		constructor(name, id, columns){
			this.name = name;
			this.id = id;
			this.columns = (columns === undefined) ? [] : columns;
			this.parentId = undefined;
		}
        
        // Turns an array into a valid row for this table
        parseRowdata(arr){
            if (arr.length !== this.columns.length) { return undefined; }
            
            let out = [];
            for (let i = 0; i < arr.length; i++){
                let v = this.columns[i].validateValue(arr[i]);
                if (v === undefined){
                    return undefined;
                }
                else {
                    out.push(v);
                }
            }
            return out;
        }
		
		// ASYNC RETURN!
		// Pushes rowdata in array to end of table
        push(arr){
			checkReqs(true);
            let rowdata = this.parseRowdata(arr);
            if (rowdata === undefined){ methods.err('Malformed rowdata'); }
            
            // Prepare any properties since this object becomes unaccessable in the promise
            let parentId = this.parentId;
            let name = this.name;
            let width = this.columns.length;
            
            return new Promise(function(resolve,reject){
                gapi.client.sheets.spreadsheets.values.append({
                    'spreadsheetId': parentId,
                    'range': name+'!'+'A:'+indexToLetter(width),
                    'valueInputOption': 'USER_ENTERED',
                    'resource': {
                        'values': rowdata
                    }
                }).then(function(response){
                    if (response.status == 200){ reject(response); }
                    resolve();
                });
            });
		}
	}
	
	class Column {
		constructor(header, datatype){
			this.header = header;
			this.datatype = datatype;
		}
        
        validateValue(value){
            switch (this.datatype.type){
                case 'string':
                    return value.toString();
                case 'number':
                    return value.toString().match(/^[0123456789]+(\.[0123456789]+)?$/) ? value : undefined;
                case 'unumber':
                    return value.toString().match(/^-?[0123456789]+(\.[0123456789]+)?$/) ? value : undefined;
                case 'date':
                    return value instanceof Date ? isoDate(value) : undefined;
                case 'time':
                    return value instanceof Date ? isoTime(value) : undefined;
                case 'datetime':
                    return value instanceof Date ? isoDateTime(value) : undefined;
                case 'duration':
                    return value instanceof Date ? isoDuration(value) : undefined;
                case 'boolean':
                    return typeof(value) == 'boolean' || value === 'true' || value === 'false';
                default:
                    return undefined;
            }
        }
	}
	
	class Datatype {
		constructor(type, decimals){
			if (!type in datatypes){ methods.err('Unknown type "'+type+'", expected {string|number|unumber|date|time|datetime|duration|boolean}'); }
			this.type = type;
			if (decimals !== undefined){
				this.decimals = decimals;
			}
		}
	}

	// Include template versions in public stuff
	methods.Database = DatabaseTemplate;
	methods.Table = TableTemplate;
	methods.Column = ColumnTemplate;
	
	/// EXPOSE PUBLIC METHODS TO USER
	return methods;
	
})();

// YYYY-MM-DD HH:MM:SS
function isoDateTime(dateObj){
	return isoDate(dateObj)+' '+isoTime(dateObj);
}

// YYY-MM-DD
function isoDate(dateObj){
	return dateObj.getFullYear()+'-'+padZeroes(2,dateObj.getMonth()+1)+'-'+padZeroes(2,dateObj.getDate())
}

// HH:MM:SS
function isoTime(dateObj){
	return padZeroes(2,dateObj.getHours())+':'+padZeroes(2,dateObj.getMinutes())+':'+padZeroes(2,dateObj.getSeconds());
}
// HH+:MM:SS
function isoDuration(dateObj){
    let ms = dateObj.getTime();
    return padZeroes(2,Math.floor(ms/(1000*60*60))) +':'+ padZeroes(2,Math.floor(ms/(1000*60)) % 60) +':'+ padZeroes(2,Math.floor(ms/1000) % 60);
}

// Index to letter
function indexToLetter(num){
	let letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	out = letters[num % 26];
	num = Math.floor(num/26)-1;
	while (num > 0){
		out = letters[num % 26] + out;
		num = Math.floor(num/26);
	}
	return out;
}

// Pads a number to match the desired length
function padZeroes(width, num){
	width -= num.toString().length;
	if (width > 0){
		return new Array(width+(/\./.test(num) ? 2 : 1)).join('0')+num;
	}
	return num+"";
}

// Returns duplicates in an array
function findDuplicates(arr){
	let sorted_arr = arr.slice().sort();
	let results = [];
	for (let i = 0; i < sorted_arr.length - 1; i++) {
		if (sorted_arr[i+1] == sorted_arr[i]) {
			results.push(sorted_arr[i]);
		}
	}
	return results;
}