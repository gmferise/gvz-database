# About
This is a JavaScript library that makes using Google's Sheets and Drive JavaScript APIs
easier to use for managing a spreadsheet like a database. The APIs rely on making JSON
requests which is flexible but messy for such a purpose. This library compresses down
features of the API allowing a cleaner application to be built using them.

# Documentation Contents

* [Getting Started](#getting-started)
    * [Installation](#installation)
    * [Google Developer Console Config](#google-developer-console-config) 
    * [Initializing the Library](#initializing-the-library)
    * [Promises](#promises)

* [Basic Methods](#basic-methods)
    * [GVZ.log](#gvzlog)
    * [GVZ.setLogging](#gvzsetlogging)
    * [GVZ.toggleLogging](#gvztogglelogging)
    * [GVZ.err](#gvzerr)
    * [GVZ.initialize](#gvzinitialize)
    
* [Handling Authentication](#handling-authentication)
    * [GVZ.setAuthListener](#gvzsetauthlistener)
    * [GVZ.clearAuthListener](#gvzclearauthlistener)
    * [GVZ.isAuth](#gvzisauth)
    * [GVZ.signIn](#gvzsignin)
    * [GVZ.signOut](#gvzsignout)
    * [GVZ.toggleAuth](#gvztoggleauth)
    * [GVZ.getUserInfo](#gvzgetuserinfo)
    
* [Managing Databases](#managing-databases)
    * [GVZ.setFlair](#gvzsetflair)
    * [GVZ.getFlair](#gvzgetflair)
    * [GVZ.clearFlar](#gvzclearflair)
    * [GVZ.reloadDatabases](#gvzreloaddatabases)
    * [GVZ.reloadDatabase](#gvzreloaddatabase)
    * [GVZ.getDatabases](#gvzgetdatabases)
    * [GVZ.getDatabase](#gvzgetdatabase)
    * [GVZ.isDatabase](#gvzisdatabase)
    * [GVZ.createDatabase](#gvzcreatedatabase)
	
* [Constructable Objects](#constructable-objects)
    * [GVZ.Database](#gvzdatabase)
    * [GVZ.Table](#gvztable)
    * [GVZ.Column](#gvzcolumn)
    
* [Reading and Writing Data](#reading-and-writing-data)
    * [Table.push](#tablepush)
    * [Table.select](#tableselect)
    * [Table.update](#tableupdate)

* [Reference Objects](#reference-objects)
    * [Database](#database-reference)
    * [Table](#table-reference)
    * [Column](#column-reference)
    * [Datatype](#datatype-reference)
    * [Selection](#selection-reference)
    
* [Utility Functions](#utility-functions)
    * [isoDateTime](#isodatetime)
    * [isoDate](#isodate)
    * [isoTime](#isotime)
    * [isoDuration](#isoduration)
    * [indexToLetter](#indextoletter)
    * [padZeroes](#padzeroes)
    * [findDuplicates](#findduplicates)

# Getting Started

## Installation
[Download the latest version](https://github.com/gmferise/gvz-database/releases) of `gvz-database.js` and put it in your project folder.

## Google Developer Console Config
Before you can use this library, you should make a [Google API Project](https://console.developers.google.com/).
You will also need to:
* Enable the [Google Drive API](https://console.developers.google.com/apis/library/drive.googleapis.com?id=e44a1596-da14-427c-9b36-5eb6acce3775) and [Google Sheets API](https://console.developers.google.com/apis/library/sheets.googleapis.com?id=739c20c5-5641-41e8-a938-e55ddc082ad1) for your project in the API Library.
* Enable the `/auth/drive.metadata.readonly`, `/auth/spreadsheets`, and `/auth/drive.file` scopes in your OAuth Consent Screen.
* Make a Client ID with its JavaScript Origin URI set to whatever website will be hosting your app. (Mine is `https://gmferise.github.io`)
* Make an API Key that is (preferrably) restricted to the Sheets and Drive APIs and with a website restriction set. (Mine is `https://gmferise.github.io/*` for this one)

## Initializing the Library
The following is the most basic way to initialize the library, although other configurations may also work.

**Related Methods:**
* [GVZ.initialize](#gvzinitialize)

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

## The Promise Object
Many of the methods in this library will return a JavaScript Promise object.

These articles on 
[using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
and
[promise functionality](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
do a great job of explaining how they work.

# Basic Methods

<!--
Description

**Inputs:**
Nothing
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| string    | string  | No       | The message to log to the console |

**Outputs:**
Nothing
A Value
| Type     | Description |
| :------- | :---------- |
| boolean  | The current authentication state |
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | Nothing       | 
| Rejected | Error message |
An Object
| Property  | Type   | Description |
| :-------- | :----- | :---------- |
| firstName | string | The user's first (given) name |
| lastName  | string | The user's last (family) name |
| email     | string | The user's email address |
| picture   | string | The URL for the user's profile picture |
-->
    
## GVZ.log
Sends a message to the console if logging is enabled

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| string    | string  | No       | The message to log to the console |

**Outputs:**
Nothing

## GVZ.setlogging
Enables or disables logging

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| bool      | boolean | No       | New state of logging switch |

**Outputs:**
Nothing

## GVZ.togglelogging
Toggles logging on or off

**Inputs:**
Nothing

**Outputs:**
A Value
| Type     | Description |
| :------- | :---------- |
| boolean  | The new state of logging switch |

## GVZ.err
Meant for internal use, but can be used externally. Throws an error headed by "GVZ Error:"

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| string    | string  | No       | The error message to throw |

**Outputs:**
Nothing

## GVZ.initialize
Initializes the library and a Google Auth instance using your API key and client ID.

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| apiKey    | string  | No       | Your API key from the Google Developer Console |
| clientId  | string  | No       | Your client ID from the Google Developer Console |
| keepAuth  | boolean | Yes      | Whether the library should attempt to automatically authenticate the user. Useful to keep user signed in when visiting a different HTML page on your site |

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | Nothing       | 
| Rejected | Error message |

# Handling Authentication

## GVZ.setAuthListener
Assigns a function to become the callback for a change in auth status.
Upon changes in auth status, the callback will recieve the new auth status as input.

**Inputs:**
| Parameter | Type      | Optional | Description |
| :-------- | :-------- | :------- | :---------- |
| callback  | function  | No       | The function to execute upon change in auth status |

The input signature of the callback function should be as follows:
| Parameter | Type     | Optional | Description |
| :-------- | :------- | :------- | :---------- |
| newStatus | boolean  | No       | Recieves the new state of the auth status |

**Outputs:**
Nothing

## GVZ.clearAuthListener
Disconnects your callback function

**Inputs:**
Nothing

**Outputs:**
Nothing

## GVZ.isAuth
Returns the current auth status

**Inputs:**
Nothing

**Outputs:**
A Value
| Type     | Description |
| :------- | :---------- |
| boolean  | The current authentication state |

## GVZ.signIn
Attempts to sign in the user using the Google Sign-In popup

**Inputs:**
Nothing

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | Nothing       | 
| Rejected | Object containing error message |

See the [Google Documentation](https://developers.google.com/identity/sign-in/web/reference#googleauthsignin)
for more detail.

## GVZ.signOut
Signs the user out

**Inputs:**
Nothing

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | Nothing       | 
| Rejected | Object containing error message |

See the [Google Documentation](https://developers.google.com/identity/sign-in/web/reference#googleauthsignout)
for more detail.

## GVZ.toggleAuth
Changes the authentication status by calling either [GVZ.signOut](#gvzsignout) or [GVZ.signIn](#gvzsignin) accordingly

**Inputs:**
Nothing

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | Nothing       | 
| Rejected | Object containing error message |

## GVZ.getUserInfo
Returns info about the authenticated user, or undefined

**Inputs:**
Nothing

**Outputs:**
An Object
| Property  | Type   | Description |
| :-------- | :----- | :---------- |
| firstName | string | The user's first (given) name |
| lastName  | string | The user's last (family) name |
| email     | string | The user's email address |
| picture   | string | The URL for the user's profile picture |

# Managing Databases

## GVZ.setFlair
Sets the flair used to make new spreadsheets and filter through existing ones.
Flairs appear visually as `[YourFlair] DatabaseName` where the actual flair set is `YourFlair`.

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| string    | string  | No       | The flair to set |

**Outputs:**
Nothing

## GVZ.getFlair
Returns the current flair

**Inputs:**
Nothing

**Outputs:**
A Value
| Type     | Description |
| :------- | :---------- |
| string   | The current flair |

## GVZ.clearFlair
Resets the current flair

**Inputs:**
Nothing

**Outputs:**
Nothing

## GVZ.reloadDatabases
Asynchronously reloads all the spreadsheets from the user's Google Drive that have the current flair

**Inputs:**
Nothing

**Indirect Inputs:**
| Parameter | Getter | Setter |
| :-------- | :----- | :----- |
| flair     | [GVZ.getFlair](#gvz-getflair) | [GVZ.setFlair](#gvz-setflair) |

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | The newly loaded databases | 
| Rejected | Error message |

## GVZ.reloadDatabase
Asynchronously reloads a single spreadsheet from its spreadsheet ID regardless of flair

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| id        | string  | No       | The ID of the target spreadsheet |

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | The new [Database Reference Object](#database-reference)| 
| Rejected | Error message |

## GVZ.getDatabases
Returns an array of all loaded [Database Reference Objects](#database-reference)

**Inputs:**
Nothing

**Outputs:**
A Value
| Type     | Description |
| :------- | :---------- |
| array    | All loaded [Database Reference Objects](#database-reference) |

## GVZ.getDatabase
Returns a single [Database Reference Object](#database-reference) that matches the given spreadsheet ID

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| id        | string  | No       | The ID of the target spreadsheet |

**Outputs:**
A [Database Reference Object](#database-reference)

## GVZ.isDatabase
Returns whether a given spreadsheet ID is in the loaded databases

**Inputs:**
| Parameter | Type    | Optional | Description |
| :-------- | :------ | :------- | :---------- |
| id        | string  | No       | The target spreadsheet ID |

**Outputs:**
A Value
| Type     | Description |
| :------- | :---------- |
| boolean  | Whether the parameter is a loaded database |

## GVZ.createDatabase
Creates a spreadsheet with the current flair and loads it as a database given a [Database Template Object](#database-template)

**Inputs:**
| Parameter   | Type    | Optional | Description |
| :---------- | :------ | :------- | :---------- |
| database    | object  | No       | The structure of the database to create |

**Indirect Inputs:**
| Parameter | Getter | Setter |
| :-------- | :----- | :----- |
| flair     | [GVZ.getFlair](#gvz-getflair) | [GVZ.setFlair](#gvz-setflair) |

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | New [Database Reference Object](#database-reference) | 
| Rejected | Error message |

# Reading and Writing Data

## Table.push
Pushes rows of data to the end of the table

**Inputs:**
| Parameter | Type               | Optional | Description |
| :-------- | :----------------- | :------- | :---------- |
| arr       | array/nested array | No       | The data to push |

*Format details:*

Your data should be input into the function in one of the following ways.
The code snippets also show potential ways to input your data for each datatype.

A single array represents a single row of data in which each array item is a column of data

```javascript
// example datatypes: string, number, unumber, boolean, date, time, datetime, duration
myTable.push(['data', -123.4, 123.4, false, new Date('7/4/2020'), new Date(0,0,0,23,59,59,999), new Date(), new Date(1234)]);
```

Multiple arrays representing multiple rows can be pushed simultaneously by putting them in a single array

```javascript
// example datatypes: string, number, unumber, boolean, date, time, datetime, duration
myTable.push([
    ['data1', 567.8, 567, 'false', new Date('12/25/2020'), new Date(104399999), new Date(), new Date(23*60*60*1000+59*60*1000+59*1000+999)],
    ['data2', -567, 567.8, true, new Date(18000000), new Date(0,0,0,23,59,59,999), new Date(1593877221569), new Date(1970,0,0,19+23,59,59,999)]
);
```

**Outputs:**
A Promise
| Result   | Returns       |
| :------- | :------------ |
| Resolved | Nothing       | 
| Rejected | Error message |

## Table.select
Selects rows of data based on the string query

**Inputs:**
| Parameter | Type   | Optional | Description |
| :-------- | :----- | :------- | :---------- |
| query     | string | Yes      | A query that describes what data to select |

If the paremeter is left blank, it will be treated as the same as a `SELECT *` query.

See the [Google Documentation] for using the query language.
You do not have to type `SELECT ` before your query as it's added for you.
The option `no_format` is also applied to the query.

**Outputs:**
A Promise
| Result   | Returns |
| :------- | :------ |
| Resolved | A [Google DataTable Object](https://developers.google.com/chart/interactive/docs/reference#DataTable) |
| Rejected | Error message |

## Table.update
<!--
# Examples

### Logging and Errors
The library comes with its own logging features.
It will throw errors and make debug statements (if enabled) during async actions

**Related Methods:**
* [GVZ.log](#gvzlog)
* [GVZ.setLogging](#gvzsetlogging)
* [GVZ.toggleLogging](#gvztogglelogging)
* [GVZ.err](#gvzerr)

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
* [GVZ.signIn](#gvzsignin)
* [GVZ.signOut](#gvzsignout)
* [GVZ.toggleAuth](#gvztoggleauth)
* [GVZ.isAuth](#gvzisauth)

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
-->