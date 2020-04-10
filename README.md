# gvz-database
A more friendly interface for using Google Sheets as a database.
It essentially extends the functionality of the google.visualizations.Query() API call into a better query language.

## Documentation

### Google Developer Console Config
Before you can use this library, you should make a [Google API Project](https://console.developers.google.com/).
Make sure you have enabled the [Google Drive API](https://console.developers.google.com/apis/library/drive.googleapis.com?id=e44a1596-da14-427c-9b36-5eb6acce3775)
and the [Google Sheets API](https://console.developers.google.com/apis/library/sheets.googleapis.com?id=739c20c5-5641-41e8-a938-e55ddc082ad1) for your project.
You will also need the `/auth/drive.metadata.readonly`, `/auth/spreadsheets`, and `/auth/drive.file` scopes to be enabled for your project.

You should also have:
* A Client ID with it's JavaScript Origin URI set to whatever website will be hosting your app. (Mine is `https://gmferise.github.io`)
* An API Key that is (preferrably) restricted to the Sheets and Drive APIs and with a website restriction set. (Mine is `https://gmferise.github.io/*` for this one)


### GVZ Console Logging
The GVZ library comes with it's own logging feature.
Any printouts from the library into the console will utilize the function `GVZ.log()` instead of `console.log()`, which only prints to the console when `GVZ.logging` is true.
You can use `GVZ.log()` within your code to take advantage of the same functionality, and easily disable your own log statements related to the library.
Logging can be enabled or disabled by changing the boolean value directly of `GVZ.logging`, and the default value is true.

**Example:**
```javascript
GVZ.log("This will print to the console.");
GVZ.logging = false;
GVZ.log("This will not print to the console.");
```

### Initializing the Library
The GVZ library relies on multiple libraries and APIs.
This is the recommended way of loading them, although other configurations may work as well.
You must load all the libraries and call `GVZ.initialize()` for every html page in your app.

`GVZ.initialize()` takes three parameters: your API key, your Client ID, and a boolean.
The boolean determines whether the library will attempt to automatically reauthenticate the user.
Setting it to true is useful if you have a user sign in on one html page then redirect them to another.
The default value is false.

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

`GVZ.clearAuthLisener()` will clear whatever listener function the library is currently sending events to.

Your listener function should take one boolean parameter which will be the user's new auth status.

**Example:**
```javascript
function authChanged(newStatus){
    console.log("The user's auth status is now "+newStatus);
    // TODO: Update some UI stuff
}
GVZ.setAuthListener(authChanged);
```
