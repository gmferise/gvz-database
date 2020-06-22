# About
This is a JavaScript library that makes using Google's Sheets and Drive JavaScript APIs
easier to use for managing a spreadsheet like a database. The APIs rely on making JSON
requests which is flexible but messy for such a purpose. This library compresses down
features of the API allowing a cleaner application to be built using them.

# Documentation Contents

* [Setup](#setup)
    * [Installation](#installation)
    * [Google Developer Console Config](#google-developer-console-config) 
    * [Initializing the Library](#initializing-the-library)
	
* [Library Methods](#library-methods) TODO!
    * [GVZ.initialize](#gvz-initialize) TODO!
    * [GVZ.log](#gvz-log) TODO!
    * [GVZ.setLogging](#gvz-setlogging) TODO!
    * [GVZ.toggleLogging](#gvz-togglelogging) TODO!
    * [GVZ.err](#gvz-err) TODO!
	
* [Constructable Objects](#constructable-objects) TODO!
    * [GVZ.Database](#gvz-database) TODO!
    * [GVZ.Table](#gvz-table) TODO!
    * [GVZ.Column](#gvz-column) TODO!

* [Reference Objects](#reference-objects) TODO!
    * [Database](#database-reference) TODO!
    * [Table](#table-reference) TODO!
    * [Column](#column-reference) TODO!
    * [Datatype](#datatype-reference) TODO!
    * [Selection](#selection-reference) TODO!
    


## Setup

### Installation
[Download the latest version](https://github.com/gmferise/gvz-database/releases) of `gvz-database.js` and put it in your project folder.

### Google Developer Console Config
Before you can use this library, you should make a [Google API Project](https://console.developers.google.com/).
You will also need to:
* Enable the [Google Drive API](https://console.developers.google.com/apis/library/drive.googleapis.com?id=e44a1596-da14-427c-9b36-5eb6acce3775) and [Google Sheets API](https://console.developers.google.com/apis/library/sheets.googleapis.com?id=739c20c5-5641-41e8-a938-e55ddc082ad1) for your project in the API Library.
* Enable the `/auth/drive.metadata.readonly`, `/auth/spreadsheets`, and `/auth/drive.file` scopes in your OAuth Consent Screen.
* Make a Client ID with its JavaScript Origin URI set to whatever website will be hosting your app. (Mine is `https://gmferise.github.io`)
* Make an API Key that is (preferrably) restricted to the Sheets and Drive APIs and with a website restriction set. (Mine is `https://gmferise.github.io/*` for this one)

### Initializing the Library
The following is the recommended way to initialize the library, although other configurations may also work.

**Related Methods:**
* [GVZ.initialize](#gvz-initialize)

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
    let clientId = "19047580253-tHISiSyoURCLIEntIdfromthesAmEplaCE.apps.googleusercontent.com";
    GVZ.initialize(apiKey,clientId,true).then(function(){
      // do other stuff
    });
}
```

### Logging and Errors
The library comes with its own logging features.
It will throw errors and make debug statements (if enabled) for you, and can also be called manually.

**Related Methods:**
* [GVZ.log](#gvz-log)
* [GVZ.setLogging](#gvz-setlogging)
* [GVZ.toggleLogging](#gvz-togglelogging)
* [GVZ.err](#gvz-err)

**Example:**
```javascript
GVZ.log("Logging is off by default, this will not print");

GVZ.setLogging(true);
GVZ.log("You can enable it though, now this prints!");

GVZ.setLogging(false);
GVZ.log("Of course, you can turn it off too. This doesn't print.");

GVZ.toggleLogging();
GVZ.log("There's also a toggle function if you need it. Printing again!");

GVZ.err("Huston, we have a problem");

GVZ.log("This will not print, the program halts first.");
```

### Authenticating
The library requires very little of you to allow the user to authenticate with their Google account.

**Related Methods:**
* [GVZ.signIn](#gvz-signin)
* [GVZ.signOut](#gvz-signout)
* [GVZ.toggleAuth](#gvz-toggleauth)
* [GVZ.isAuth](#gvz-isauth)

`GVZ.toggleAuth()` is most useful as a button function and will sign in or sign out the user appropriately.

`GVZ.signIn()` and `GVZ.signOut()` can be used to do this process manually if a toggle does not suit your needs.

`GVZ.isAuth()` returns a boolean representing whether the user is signed in or not.

These methods are primarily useful for asking the user to sign in, or forcing them to sign out.
When updating the interface based on the user's auth status, it is recommended you use the auth status listener feature.

### Listening for Auth Changes
It is recommended you make a listener function that will update your interface whenever the user's auth status changes.
The library makes this easy with two functions.

`GVZ.setAuthListener(yourFunction)` will tell the library to call yourFunction every time the user's auth status changes. Your listener function should have one boolean parameter to receive the user's new auth status.

`GVZ.clearAuthListener()` will clear whatever listener function the library is currently sending events to.


**Example:**
```javascript
// Update UI when user's auth changes
function authChanged(newStatus){
    GVZ.log("The user's auth status is now "+newStatus);
    // TODO: Update some UI stuff
}
GVZ.setAuthListener(authChanged);
```

### Loading Databases
Once the user has signed in you can search their Google Drive for databases to choose from using `GVZ.reloadDatabases()`.
At any point you can get the last updated copy of this array using `GVZ.getDatabases()` or just call `GVZ.reloadDatabases()` again if you want to ensure the array returned is up-to-date.
You can also get the information of a singular database using `getDatabase(id)` and you can call `GVZ.reloadDatabase(id)` to ensure the info of a singlular database is up-to-date.

To limit the databases the library attempts to load, you can set a database flair using `GVZ.setFlair(string)` or clear the flair using `GVZ.clearFlair()` or `GVZ.setFlair("")`. Of course, there is also a `GVZ.getFlair()` if you need it.
When a flair is set, any databases created with the library will be given the name `[Flair] My Database` and `GVZ.reloadDatabases()` will only load databases with `[Flair]` at the start of their name (case sensitive, strict match).
It should be noted that the brackets *are* written in the name, and you do not need to include them when setting the flair.

**Example:**
```javascript
// Both pairs of functions will print the same thing.
// The reload functions are asynchronous and return the up-to-date versions in a promise
// The get functions are instant and return the last known values

GVZ.reloadDatabases().then(function(databases){ console.log(databases); });
console.log(GVZ.getDatabases());

GVZ.reloadDatabase(id).then(function(database){ console.log(database); });
console.log(GVZ.getDatabase(id));
```

### Creating Databases
The classes `GVZ.Database`, `GVZ.Table`, and `GVZ.Column` make building databases structures easy.

Passing in a database object into `GVZ.createDatabase(obj)` returns a promise with the resulting database object.

If a flair is set, it will automatically be added into the name of the database, *do not* add it yourself.

Your database *must*:
* Have a name property defined that is not an empty string
* Have at least one table in the tables property
* Have tables with unique name properties (required by Sheets)
* Have tables that:
    * Have a name property defined that is not an empty string
    * Have at least one column in the columns property
    * Have columns that:
        * Have a header property defined that is not an empty string
        * Have a datatype defined

**Examples:**
```javascript
// standard verbose way
let per3 = new GVZ.Database('Period 3');
let tbl = new GVZ.Table('Attendance');
tbl.columns.push(new GVZ.Column('student id','unumber',0));
tbl.columns.push(new GVZ.Column('timestamp','datetime'));
tbl.columns.push(new GVZ.Column('tardy','boolean'));
db.tables.push(tbl);

// shorter way
let per4 = new GVZ.Database('Period 4',[
    new GVZ.Table('Attendance',[
        new GVZ.Column('student id','unumber',0)),
        new GVZ.Column('timestamp','datetime')),
        new GVZ.Column('tardy','boolean'))
    ])//,
    // could add more tables here
]);

// create database call is async
GVZ.createDatabase(per3).then(function(newDatabase){
    GVZ.createDatabase(per4).then(function(newDatabase){
        // refresh UI here
    });
});
```
