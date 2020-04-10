# gvz-database
A more friendly interface for using Google Sheets as a database.
It essentially extends the functionality of the google.visualizations.Query() API call into a better query language.

## Documentation

### GVZ Console Logging
The GVZ library comes with it's own logging feature.
Any printouts from the library into the console will utilize the function `GVZ.log()` instead of `console.log()`, which only prints to the console when `GVZ.logging` is true.
You can use `GVZ.log()` within your code to take advantage of the same function, and easily disable your own log statements related to the library.
It can be enabled or disabled by changing the boolean value directly of `GVZ.logging`, and the default value is true.
**Example:**
```javascript
GVZ.log("This will print to the console.");
GVZ.logging = false;
GVZ.log("This will not print to the console.");
```

### Initializing the Library
The GVZ library relies on multiple libraries and APIs.
This is the recommended way of loading them, although other configurations may work as well.
You must load all the libraries and call GVZ.initialize() for every html page in your app.
```html
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
<script src="https://www.gstatic.com/charts/loader.js"></script>
<script> google.charts.load('current'); </script>
<script src="gvz-database.js"></script>
<script async defer src="https://apis.google.com/js/api.js" 
	onload="this.onload=GVZ.initialize(true);"
	onreadystatechange="if (this.readyState === 'complete') this.onload()">
</script>
```

### Handling Authentication Status
WIP