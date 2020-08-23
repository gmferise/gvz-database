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
    
    /// ******************
    /// * PUBLIC METHODS *
    /// ******************
    var methods = {};
    
    /// BASIC METHODS
    
    // ASYNC RETURN!
    // Configures the GoogleAuth variable, creates a client for api requests
    methods.initialize = function(apiKey,clientId,keepAuth){
        if (typeof(gapi) === 'undefined'){ methods.err('You must import https://apis.google.com/js/api.js before calling GVZ.initialize()'); }
        keepAuth = !(keepAuth === false); // validation, allows undefined value
        methods.log('Initializing GVZ library... '+keepAuth ? '(will attempt auto auth)' : '(will not attempt auto auth)');
        
        return new Promise(function(resolve,reject){
            // Call gapi load function
            gapi.load('client:auth2', function(){
                methods.log('Configured Google JavaScript API');
                // Then initialize its client
                gapi.client.init({ // Initialize a client with these properties
                    "apiKey":apiKey,
                    "discoveryDocs":["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest","https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest"],
                    "clientId":clientId,
                    "scope":"https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets"
                }).then(function(){
                    methods.log('Initialized authentication client');
                    // Then assign GoogleAuth and configure the listener callback pointer
                    GoogleAuth = gapi.auth2.getAuthInstance();
                    GoogleAuth.isSignedIn.listen(authStatusListener);
                    // Sign out unless told to do otherwise
                    if (!keepAuth){ GoogleAuth.signOut(); }
                    else { authStatusListener(); }
                    resolve();
                },
                function(response){
                    reject('Failed to initialize authentication client.\n Response: '+response.error);
                });
            });
        });
    };
    
    // All of library's log/debug statements
    methods.log = function(string){
        if (logging){ console.log(string); }
    };
    
    // Control whether logging is on or off
    methods.setLogging = function(bool){
        logging = (bool === true);
    };
    
    // Toggle whether logging is on or off
    methods.toggleLogging = function(){
        logging = (!logging);
        return logging;
    };
    
    // All of library's error messages, cannot be disabled
    methods.err = function(string){
        throw 'GVZ Error: '+string;
    };

    /// AUTH METHODS
    
    // Sets listener for change in auth status
    // Listener function is provided with new auth status
    methods.setAuthListener = function(callback){
        authStatusListener = function(){
            callback(GoogleAuth.isSignedIn.get());
        };
    };
    
    // Clears listnener for change in auth status
    methods.clearAuthListener = function(){
        authStatusListener = function(newStatus){};
    };
        
    // Returns current auth status
    methods.isAuth = function(){
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.isAuth()'); }
        return GoogleAuth.isSignedIn.get();
    };
    
    // ASYNC RETURN!
    // Signs in, triggering sign-in popup
    methods.signIn = function(){
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.signIn()'); }
        methods.log('Asking user to authenticate...');
        return GoogleAuth.signIn();
    };
    
    // ASYNC RETURN!
    // Signs out
    methods.signOut = function(){
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.signOut()'); }
        methods.log('Deauthenticating...');
        return GoogleAuth.signOut();
    };
    
    // ASYNC RETURN!
    // Toggles auth status, triggering sign-in popup or signing out
    methods.toggleAuth = function(){
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.toggleAuth()'); }
        if (GoogleAuth.isSignedIn.get()){
            methods.log('Deauthenticating...');
            return GoogleAuth.signOut();
        }
        else {
            methods.log('Asking user to authenticate...');
            return GoogleAuth.signIn();
        }
    };
    
    // Returns info about the authenticated user, or undefined
    methods.getUserInfo = function(){
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.getUserInfo()'); }
        if (!methods.isAuth()) { methods.err('Failed to get user info: user is not signed in.'); }
        let profile = GoogleAuth.currentUser.get().getBasicProfile();
        return {
            firstName: profile.getGivenName(),
            lastName: profile.getFamilyName(),
            email: profile.getEmail(),
            picture: profile.getImageUrl()
        };
    };

    /// DATABASE HANDLING METHODS
    
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
    
    // ASYNC RETURN!
    // Loads all databses from user's Google Drive
    methods.reloadDatabases = function(){
        methods.log('Reloading all databases...');
        if (typeof(gapi) === 'undefined'){ methods.err('You must import https://apis.google.com/js/api.js before calling GVZ.reloadDatabases()'); }
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.reloadDatabases()'); }
        if (!methods.isAuth()) { methods.err('Failed to reload databases: user is not signed in.'); }
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
        if (typeof(gapi) === 'undefined'){ methods.err('You must import https://apis.google.com/js/api.js before calling GVZ.reloadDatabase()'); }
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.reloadDatabase()'); }
        if (!methods.isAuth()) { methods.err('Failed to reload database "'+id+'": user is not signed in.'); }
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
        for (let i = 0; i < databases.length; i++){
            if (databases[i].id == id) { return databases[i]; }
        }
        methods.err('Unknown Database ID "'+database+'"');
    };
    
    // Returns whether a database exists give its id
    methods.isDatabase = function(id){
        for (let i = 0; i < databases.length; i++){
            if (id == databases[i].id) { return true; }
        }
        return false;
    };
    
    // ASYNC RETURN!
    // Creates online database from database template object
    // Also causes a database reload at the end
    methods.createDatabase = function(database){
        methods.log('Creating new database "'+getFlairString()+database.name+'"...  ');
        if (typeof(gapi) === 'undefined'){ methods.err('You must import https://apis.google.com/js/api.js before calling GVZ.createDatabase()'); }
        if (typeof(GoogleAuth) === 'undefined'){ methods.err('You must call GVZ.initialize() before using GVZ.createDatabase()'); }
        if (!database.isValid()){ methods.err('Failed to create new database "'+getFlairString()+database.name+'" malformed template'); }
        if (!methods.isAuth()) { methods.err('Failed to create new database: user is not signed in.'); }
        
        // Clone database template object so we can modify it
        database = JSON.parse(JSON.stringify(database));
        database.name = getFlairString()+database.name;
        
        
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

    /// ***********
    /// * CLASSES *
    /// ***********
    
    /// CONSTRUCTABLE OBJECTS
    
    class DatabaseTemplate {
        constructor(name, tables){
            this.name = name.toString();
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
            this.name = name.toString();
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
            this.header = header.toString();
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
    
    /// REFERENCE OBJECTS
    
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
        
        // ASYNC RETURN!
        // Pushes rowdata in array to end of table
        // Works with single array or nested array for multiple rows
        push(arr){
            if (typeof(gapi) === 'undefined'){ methods.err('You must import https://apis.google.com/js/api.js before calling Table.push()'); }
            if (!methods.isAuth()) { methods.err('Failed to push row(s): user is not signed in.'); }
            if (!Array.isArray()) { methods.err('Input to push() must be in the format [row1col1,...] or [ [row1col1,...], [row2col1,...] ]'); }
            
            let rowdata = [];
            
            // Parses one row of data
            let parseRowdata = function(arr){
                if (arr.length !== this.columns.length) { methods.err('Row length does not match number of columns in table ('+arr.length+' != '+this.columns.length+')'); }
                
                let out = [];
                for (let i = 0; i < arr.length; i++){
                    let v = this.columns[i].validateValue(arr[i]);
                    if (v === undefined){
                        methods.err('Cell datatype does not match expected type for row ("'+arr[i]+'" is not a '+this.columns[i].datatype.type+')');
                    }
                    else {
                        out.push(v);
                    }
                }
                return out;
            }
            
            // Determine if format is single row or multi row
            // First count acceptable arrays in arr
            let arrayCount = 0;
            for (let i = 0; i < arr.length; i++){
                // item is an array
                if (Array.isArray(arr[i])){
                    // and has no sub arrays
                    if (arr[i].every(function(a){ return !Array.isArray(a); })){
                        arrayCount++;
                    }
                    else {
                        methods.err('Input to push() must be in the format [row1col1,...] or [ [row1col1,...], [row2col1,...] ]');
                    }
                }
            }
            
            if (arrayCount != arr.length && arrayCount != 0) { // some items are acceptable arrays, we want all or none
                methods.err('Input to push() must be in the format [row1col1,...] or [ [row1col1,...], [row2col1,...] ]');
            }
            let isNested = (arrayCount == arr.length);
            
            // Parse input into rowdata
            if (isNested){ // all items are acceptable arrays
                // Multi row format parsed into rowdata
                for (let i = 0; i < arr.length; i++){
                    rowdata.push(parseRowdata(arr[i]));
                }
            }
            else { // all items are not arrays
                // Single row format parsed into rowdata
                rowdata = parseRowdata(arr);
            }

            // Prepare any properties since this object becomes unaccessable in the promise
            let parentId = this.parentId;
            let name = this.name;
            let width = this.columns.length;
            
            methods.log('Pushing row(s)...');
            return new Promise(function(resolve,reject){
                gapi.client.sheets.spreadsheets.values.append({
                    'spreadsheetId': parentId,
                    'range': name+'!'+'A:'+indexToLetter(width),
                    'valueInputOption': 'USER_ENTERED',
                    'resource': {
                        'values': isNested ? rowdata : [rowdata]
                    }
                }).then(function(response){
                    if (response.status != 200){ reject(response); }
                    methods.log('Pushed row(s) '+rowdata);
                    resolve();
                });
            });
        }
        
        // ASYNC RETURN!
        // Selects data
        select(query){
            if (query === undefined || query === ''){ query = '*'; }
            let request = new google.visualization.Query('https://docs.google.com/spreadsheets/d/'+this.parentId+'/gviz/tq?headers=1&gid='+this.id+'&access_token='+encodeURIComponent(GoogleAuth.currentUser.get().getAuthResponse().access_token));
            request.setQuery('SELECT '+query+' OPTIONS no_format');
            return new Promise(function(resolve,reject){
                request.send(function(response){
                    // Process the response?
                    resolve(response.getDataTable());
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
            let validators = {
                'string': value.toString(),
                'number': value.toString().match(/^[0123456789]+(\.[0123456789]+)?$/) ? value : undefined,
                'unumber': value.toString().match(/^-?[0123456789]+(\.[0123456789]+)?$/) ? value : undefined,
                'date': value instanceof Date ? isoDate(value) : undefined,
                'time': value instanceof Date ? isoTime(value) : undefined,
                'datetime': value instanceof Date ? isoDateTime(value) : undefined,
                'duration': value instanceof Date ? isoDuration(value) : undefined,
                'boolean': typeof(value) == 'boolean' || value === 'true' || value === 'false' ? value.toString() : undefined
            }
            return validators[this.datatype.type];
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
    
    /// EXPOSING PROPERTIES AND METHODS
    
    // Include constructable versions in public stuff
    methods.Database = DatabaseTemplate;
    methods.Table = TableTemplate;
    methods.Column = ColumnTemplate;
    
    return methods;
    
})();

// YYYY-MM-DD HH:MM:SS.sss
function isoDateTime(dateObj){
    return isoDate(dateObj)+' '+isoTime(dateObj);
}

// YYY-MM-DD
function isoDate(dateObj){
    return dateObj.getFullYear()+'-'+padZeroes(2,dateObj.getMonth()+1)+'-'+padZeroes(2,dateObj.getDate())
}

// HH:MM:SS.sss
function isoTime(dateObj){
    return padZeroes(2,dateObj.getHours())+':'+padZeroes(2,dateObj.getMinutes())+':'+padZeroes(2,dateObj.getSeconds())+'.'+padZeroes(3,dateObj.getMilliseconds());
}
// HH+:MM:SS.sss
function isoDuration(dateObj){
    let ms = dateObj.valueOf();
    return padZeroes(2,Math.floor(ms/(1000*60*60)))+':'+padZeroes(2,Math.floor(ms/(1000*60)) % 60)+':'+padZeroes(2,Math.floor(ms/1000) % 60)+'.'+padZeroes(3,ms % 1000);
}

// Index to letter
function indexToLetter(num){
    /*
   Counts basically like this but with the 26 letters:
    0  1  2  3  4  5  6  7  8  9
   00 01 02 03 04 05 06 07 08 09
   10 11 12 13 14 15 16 17 18 19
   ...
    90  91  92  93  94  95  96  97  98  99
   000 001 002 003 004 005 006 007 008 009
   */
   
    let letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let out = letters[num % 26];
    for (let i = 0; num >= 26*(27**i); i++){
        out = letters[(Math.floor(num/(26*27**i))-1) % 26] + out;
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