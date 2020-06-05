/// *************
/// * Variables *
/// *************
var currentDatabase = undefined;

// Sets everything up
function onDocumentReady(){
	// Initialize the GVZ library with our key and client id, keep the user signed in if they have previously
	GVZ.initialize('AIzaSyCEyNTPq0R6ALudyMMsICNEQLGfD0BnE1M',
				   '227233657145-chcnqd16a57odfb1e2hqrecnj4ns95g4.apps.googleusercontent.com',
				    true
	);
	GVZ.setLogging(true); // off by default, useful for debugging	
	GVZ.setFlair('GVZ'); // you should probably use a flair to limit search
	GVZ.setAuthListener(authChanged); // set up the listener
}

/// **********************
/// * Frontend Functions *
/// **********************

// Modifies UI whenever the auth status changes
function authChanged(newStatus){
	if (newStatus){ // now signed in
		document.getElementById('status-auth').innerHTML = 'Welcome, '+GVZ.getUserInfo().firstName+'! You are currently signed in.';
		document.getElementById('toggle-auth').innerHTML = 'Sign Out';
		document.getElementById('div-choose').classList.remove('hidden');
	}
	else { // now signed out
		document.getElementById('status-auth').innerHTML = 'You are currently signed out. Please sign in!';
		document.getElementById('toggle-auth').innerHTML = 'Sign In';
		document.getElementById('div-choose').classList.add('hidden');
	}
}

// Reloads database dropdown from GVZ databases
function refreshDatabaseDropdown(){
	let dropdown = document.getElementById('db-selection');
	let master = GVZ.getDatabases();
	
	if (master.length > 0){
		dblist.innerHTML = ''; // remove all children
		
		for (let i = 0; i < master.length; i++){
			let el = document.createElement('option');
			el.innerText = master[i].name;
			el.setAttribute('value',master[i].id);
			dblist.appendChild(el);
		}
	}
	else {
		dblist.innerHTML = '';
		let el = document.createElement('option');
		el.innerText = 'No databases found';
		el.setAttribute('value','undefined');
		dblist.appendChild(el);
	}
}

// Selects a database if possible else makes a new one
function selectDatabase(){
	let id = document.getElementById.value;
	if (id == 'undefined'){
		createDatabase();
	}
	else {
		currentDatabase = id;
		document.getElementById('div-interact').classList.remove('hidden');
	}
}

/// *********************
/// * Backend Functions *
/// *********************

// Creates database using user input
function createDatabase(){
	let name = window.prompt("Type a name for the new database","My Database");
	if (name !== '' && name !== null) {
		// Write your database structure here
		let db = new GVZ.Database(name);
		let tbl = new GVZ.Table('Attendance');
		tbl.pushColumn(new GVZ.Column('id','unumber',0));
		tbl.pushColumn(new GVZ.Column('timestamp','datetime'));
		tbl.pushColumn(new GVZ.Column('tardy','boolean'));
		db.pushTable(tbl);
		
		GVZ.createDatabase(db).then(function(newDatabase){
			refreshDatabaseDropdown();
		});;
	}
}
