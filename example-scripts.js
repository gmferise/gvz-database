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

var popups = {};

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

// Changes visibility on create database popup
popups.createNewDatabase = function(setAsVisible){
	if (setAsVisible){ // show the popup
		document.getElementById('popup-newdb').classList.remove('hidden');
		let flair = GVZ.getFlair();
		if (flair !== ""){
			document.getElementById('status-flair').value = '['+flair+'] ';
		}
		document.getElementById('input-newdb').focus();
	}
	else { // close the popup
		document.getElementById('popup-newdb').classList.add('hidden');
		document.getElementById('input-newdb').value = '';
		document.getElementById('status-flair').value = '';
		document.getElementById('submit-newdb').disabled = false;
	}
};

// Reloads database dropdown from GVZ databases
function refreshDatabaseDropdown(){
	let dblist = document.getElementById('db-list');
	let master = GVZ.getDatabases();
	dblist.innerHTML = '';
	
	for (let i = 0; i < master.length; i++){
		let el = document.createElement('p');
		el.innerText = master[i].name
		el.setAttribute('onclick','selectDatabase("'+master[i].id+'");');
		dblist.appendChild(el);
	}
	if (master.length < 1){
		let el = document.createElement('p');
		el.innerText = 'No databases found';
		el.setAttribute('onclick','popups.createNewDatabase(true);');
		dblist.appendChild(el);
	}
}

// Selects a database or resets the selection
function selectDatabase(id){
	if (id === undefined){
		document.getElementById('db-selection').innerText = 'Select a database:';
		document.getElementById('div-interact').classList.add('hidden');
	}
	else {
		document.getElementById('db-selection').innerText = GVZ.getDatabase(id).name;
		document.getElementById('div-interact').classList.remove('hidden');
	}
}

/// *********************
/// * Backend Functions *
/// *********************

// Creates database using input from 'input-newdb'
function createDatabase(){
	let name = document.getElementById('input-newdb').value;
	if (name !== '') {
		document.getElementById('submit-newdb').disabled = true;
		
		// Write your database structure here
		let db = new GVZ.Database(name);
		let tbl = new GVZ.Table('Attendance');
		tbl.pushColumn(new GVZ.Column('id','unumber',0));
		tbl.pushColumn(new GVZ.Column('timestamp','datetime'));
		tbl.pushColumn(new GVZ.Column('tardy','boolean'));
		db.pushTable(tbl);
		
		GVZ.createDatabase(db).then(function(newDatabase){
			refreshDatabaseDropdown();
			selectDatabase(newDatabase.id);
		});;
	}
}
