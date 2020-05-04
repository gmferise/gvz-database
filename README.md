# gvz-database
A more friendly interface for using Google Sheets as a database.
It essentially extends the functionality of the google.visualizations.Query() API call into a better query language.

# Documentation Contents

* [Setup](#setup)
    * [Google Developer Console Config](#google-developer-console-config) 
    * [Initializing the Library](#initializing-the-library)
* [Library Objects](#library-objects)
    * [Databases](#databases)
    * [Tables](#tables)
    * [Columns](#columns)
    * [Datatypes](#datatypes)
* [Library Methods](#library-methods)
    * [Logging and Errors](#logging-and-errors)
	* [Handling Auth Status](#handling-auth-status)
	* [Auth Status Listener](#auth-status-listener)
	* [Creating Databases](#creating-databases)
	* [Loading Databases](#loading-databases)
	* [Querying Databases](#querying-databases)

## Setup

### Google Developer Console Config
Before you can use this library, you should make a [Google API Project](https://console.developers.google.com/).
You will also need to:
* Enable the [Google Drive API](https://console.developers.google.com/apis/library/drive.googleapis.com?id=e44a1596-da14-427c-9b36-5eb6acce3775) and [Google Sheets API](https://console.developers.google.com/apis/library/sheets.googleapis.com?id=739c20c5-5641-41e8-a938-e55ddc082ad1) for your project in the API Library.
* Enable the `/auth/drive.metadata.readonly`, `/auth/spreadsheets`, and `/auth/drive.file` scopes in your OAuth Consent Screen.
* Make a Client ID with its JavaScript Origin URI set to whatever website will be hosting your app. (Mine is `https://gmferise.github.io`)
* Make an API Key that is (preferrably) restricted to the Sheets and Drive APIs and with a website restriction set. (Mine is `https://gmferise.github.io/*` for this one)

### Initializing the Library
The GVZ library relies on multiple libraries and APIs.
This is the recommended way of loading them, although other configurations may work as well.
You must load all the libraries and call `GVZ.initialize()` for every html page in your app.

The function call should take the form of `GVZ.initialize(apiKey,clientId,boolean)`.
The API Key and Client ID should come from the Google Developer Console.
The boolean determines whether the library will attempt to automatically reauthenticate the user.
The intended use is to make it false for a page dedicated to signing in so the user can choose which account to use,
then when you redirect them to the main page you can re-initialize the GVZ library and sign them back in.
The default value is true.

**Example:** 
```html
<!-- FRONTEND -->
<head>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
<script src="https://www.gstatic.com/charts/loader.js"></script>
<script> google.charts.load('current'); </script>
<script src="gvz-database.js"></script>
<script async defer src="https://apis.google.com/js/api.js" 
    onload="this.onload=loadGVZ();"
    onreadystatechange="if (this.readyState === 'complete') this.onload()">
</script>
</head>
```
```javascript
/// BACKEND
function loadGVZ(){
    let apiKey = "THisIsyourAPIKEYFrOmTheGooGleDEvElOpERCoNSoLE";
    let clientId = "00000000000-tHISiSyoURCLIEntIdfromthesAmEplaCE.apps.googleusercontent.com";
    GVZ.initialize(apiKey,clientId,true);
}
```

## Library Objects


### Databases
The GVZ library turns spreadsheets into a cleaner database object to be used in queries.
The recommended way to access a database object is by its id using `GVZ.getDatabase(id)`, although you can also index the array returned by `GVZ.getDatabases()`.
The id of a database is the same as the spreadsheet id found in the URL of a spreadsheet.
This represents the structure of the database object.
```yaml
database = {
    name: ""
    id: ""
    tables: []
}
```

### Tables
The GVZ library turns pages of a spreadsheet into a cleaner table object to be used in queries.
This represents the structure of the table object, usually found in an array assigned to a database object's `tables` property.
```yaml
table = {
    name: ""
    id: ""
    columns: []
}
```

### Columns
The GVZ library turns each column of a spreadsheet into datatyped and headed columns for data storage.
This represents the structure of the column object, usually found in an array assigned to a table object's `columns` property.
```yaml
column = {
    header: ""
    datatype: {}
}
```

### Datatypes
The GVZ library allows for a simpler use of datatypes.
This represents the structure of the datatype object, usually found in the `datatype` property of a column object.
```yaml
datatype = {
    type: ""
    decimals: 0
}
```
The available datatypes are `string`, `number`, `unumber`, `duration`, `time`, `date`, `datetime`, and `boolean`.
The decimals parameter is only used for `number` and `unumber` to define the number of decimal places to show

## Library Methods

### Logging and Errors
The GVZ library comes with it's own logging feature.
Any printouts from the library into the console will utilize the function `GVZ.log()` instead of `console.log()`, which only prints to the console when logging is enabled.
Logging is disabled by default since it's intended for debugging. You can enable it using either `GVZ.setLogging(boolean)` or `GVZ.toggleLogging()`.

You can use `GVZ.log(string)` within your code to take advantage of the same debugging functionality.

You can also use `GVZ.err(string)` within your own code to throw a GVZ Error if you'd like, although they cannot be disabled.


**Example:**
```javascript
GVZ.log("This will not print to the console.");
GVZ.setLogging(true);
GVZ.log("This will print to the console.");
GVZ.toggleLogging();
GVZ.log("This will not print to the console.");
GVZ.toggleLogging();
GVZ.log("This will print to the console.");
GVZ.setLogging(false);
GVZ.log("This will not print to the console.");
```


### Handling Auth Status
There are multiple functions that deal with the authentication status.

`GVZ.toggleAuth()` is most useful as a button function and will sign in or sign out the user appropriately.

`GVZ.signIn()` and `GVZ.signOut()` can be used to do this process manually if a toggle does not suit your needs.

`GVZ.getAuthStatus()` returns a boolean representing whether the user is signed in or not.

These methods are primarily useful for asking the user to sign in, or forcing them to sign out.
When updating the interface based on the user's auth status, it is recommended you use the auth status listener feature.

### Auth Status Listener
It is recommended you make a listener function that will update your interface whenever the user's auth status changes.
The library makes this easy with two functions.

`GVZ.setAuthListener(yourFunction)` will tell the library to call yourFunction every time the user's auth status changes.

`GVZ.clearAuthListener()` will clear whatever listener function the library is currently sending events to.

Your listener function should take one boolean parameter which will be the user's new auth status.

**Example:**
```javascript
// Update UI when user's auth changes
function authChanged(newStatus){
    console.log("The user's auth status is now "+newStatus);
    // TODO: Update some UI stuff
}
GVZ.setAuthListener(authChanged);
```

### Creating Databases
Nothing yet...

### Loading Databases
Once the user has signed in you can search their Google Drive for databases to choose from using `GVZ.reloadDatabases()`.
At any point you can get the last updated copy of this array using `GVZ.getDatabases()` or just call `GVZ.reloadDatabases()` again if you want to ensure the array returned is up-to-date.
You can also get the information of a singular database using `getDatabase(id)` and you can call `GVZ.reloadDatabase(id)` to ensure the info of a singlular database is up-to-date.

To limit the databases the library attempts to load, you can set a database flair using `GVZ.setFlair(string)` or clear the flair using `GVZ.clearFlair()` or `GVZ.setFlair("")`. Of course, there is also a `GVZ.getFlair()` if you need it.
When a flair is set, any databases created with the library will be given the name `[Flair] My Database` and `GVZ.reloadDatabases()` will only load databases with `[Flair]` at the start of their name (case sensitive, strict match).
It should be noted that the brackets *are* written in the name, and you do not need to include them when setting the flair.

**Function Usage**
```javascript
// Both pairs of functions will print the same thing.
// The reload functions are asynchronous and return the up-to-date versions in a promise
// The get functions are instant and return the last known values

GVZ.reloadDatabases().then(function(databases){ console.log(databases); });
console.log(GVZ.getDatabases());

GVZ.reloadDatabase(id).then(function(database){ console.log(database); });
console.log(GVZ.getDatabase(id));
```

**Example:**
```javascript
// Populate a dropdown to let user pick a database
GVZ.setFlair("gvzDB");
GVZ.reloadDatabases().then(function(databases){
    let database = databases[0];
    let dropdown = document.getElementById('db-list');
    for (let i = 0; i < databases.length; i++){
        let item = document.createElement('p');
        item.innerText = databases[i].name;
        item.setAttribute('onclick','selectDatabase("'+databases[i].id+'")');
        dropdown.appendChild(item);
    }
});
```

### Querying Databases
