//
// Node and/or Open Source
var util  = require('util');
var rest  = require('restler');
var fs    = require('fs');
var async = require('async');

// Local Project Files
var pets  = require('./wowpets.js'); 

// Files
var FN_jsonDir   = "json" ;
var FN_itemList  = FN_jsonDir + "/item-id-name-pairs.json";
var FN_petList   = FN_jsonDir + "/all-pets.json";
var FN_myPets    = FN_jsonDir + "/my-pets.json";
var FN_petTypes  = FN_jsonDir + "/pet-types.json";
var FN_petIndex  = FN_jsonDir + "/pet-index.json";
var FN_userData  = FN_jsonDir + "/user-data.json";
var FN_questList = FN_jsonDir + "/all-quests.json";

// API strings
var host    = "http://us.battle.net" ;
var apiHead = "api/wow" ;
var uriBase = host + "/" + apiHead ;

var API_idBPet = 82800;  // Item id for all battle pets in AH 

// Debug level
var DLVL = 1 // error:1, warn:2, debug:3, trace:4

// Init the user's config file.
// -- requried for -mypets and -ahpets
var USER = JSON.parse( fs.readFileSync( FN_userData, 'utf-8' ));

// Command line logging
var Argv = process.argv;
var Argc = Argv.length;
if (3 <= DLVL) {
    for (var i=0; i<Argc; i++) {
	util.puts( util.format( "argv[%d] = %s", i, Argv[i] ));
    }
}

// -----------------------------------------------------------------------------
// File name builders
function FN_MyQuest_builder( realm, who ) {
    return FN_jsonDir + "/myq-" + realm + "-" + who + ".json" ;
}

// -----------------------------------------------------------------------------
// Certain characters can be problematic in command lines.  This function
// removes them from a given string.
function ScrubStringCL( str ) {
    return str.split(" ").join("").split("'").join("");
}

// -----------------------------------------------------------------------------
// Constructs a single "/"-delimited string from command line arguments
// beginning with the firstArg arg and including all subsequent args
// -----------------------------------------------------------------------------
function UriTail( firstArg ) {
    var apiTail = "";
    if (firstArg < Argc) {
	for (var i=firstArg; i<Argc; i++) {
	    apiTail += Argv[i];
	}
    }
    return uriBase + "/" + apiTail ;
}

function UriCallToFile( filename, uri ) {
    if (3 <= DLVL) {
	util.puts( "UriCallToFile: filename: " + filename + ", uri: " + uri );
    } 
    UriCall( uri, function(result) {
	fs.writeFile( filename, JSON.stringify( result, null, 3 ), function(err) {
	    if(err) { console.log(err); } 
	    else    { console.log("Result save to: " + filename ); }
        });    
    });
}

function DotTrunc( str, len ) {
    var out = str.substring( 0, len-1) ;
    if (str.length > len) { out += " ..." ; }
    return out;
}

function DumpRawResult( result ) {
    util.puts( "Result: ", DotTrunc( JSON.stringify(result), 200 ));
}

// -----------------------------------------------------------------------------
// Issues the URI request via restler, passes result to given handler function.
// -----------------------------------------------------------------------------
//var UriCall = function( uri, handler ) {
function UriCall( uri, handler ) {

    if (3 <= DLVL) { util.puts("URI: " + uri ); }

    var options = ""; // { parsers: parsers.json }" ;
    var emitter = rest.get( uri, options );
 
    var _cb = function _uriCall(result,response) {
	if (result instanceof Error) {
	    util.puts('Error: ' + result.message);
	} 
	else if (handler) { 
	    handler( result ); 
	} 
	else { 
	    DumpRawResult( result ); 
        }
        emitter.removeListener('complete', _cb );
    }
    emitter.addListener('complete', _cb );
}

// -----------------------------------------------------------------------------
// For items queried by number, this function builds a JSON file containing all 
// of them.
//
//   FileName: the name of the file to output
//   QryTail: the API fragment that precedes the ID value in a query.  For example:
//            use "battlePet/Species" for queries like "/api/wow/petBattle/species/125" 
//   IdPropName: the name of the property in the json item structure that holds the id.
//   LastId: function will iterate from FirstId to this value
//   FirstId: function will iterate from this value to LastId (Default = 1)
//
// -----------------------------------------------------------------------------

function MakeIdItemFile( FileName, QryTail, IdPropName, LastId, FirstId ) {  

    // Param defaults
    var firstId = FirstId || 1;

    // Loop control
    var req  = 0;
    var rsp  = 0; 
    var curr = firstId;
    var stop = LastId;

    // List control and stats
    var list = new Array();
    var copy = 0;
    var skip = 0;
    var last = 0;
    var first = -1;

    // GET response handler (callback)
    var cbRest = function (result) {
	rsp++;
        //util.puts(util.inspect(result));

	var idVal = result[IdPropName];
	if (null == idVal) {
	    skip++;
        } else {
	    var item = result;
 	    list[copy++] = item; 
	    last = idVal; // result.speciesId;
	    if (first<0) { first = last; }
	    util.puts( "Added ID #" + last + ", count = " + copy );
        }

	if (rsp >= req) {
	    var json = JSON.stringify(list);

	    util.puts("List length = " + list.length );

	    fs.writeFile( FileName, json, function(err) {
		if(err) { console.log(err); } 
		else    { console.log("The file was saved."); }
	    });
	    util.print( util.format( "Skipped/Created/First/Last: %d, %d, %d, %d\n", 
                                     skip, copy, first, last ));
	}
    } 

    // Throwaway GET, to init the global listener list.
    rest.get( "" ).on("complete",cbRest);
    rsp--;
    skip--;

    // GET loop
    // -- uses curr/last for loop control
    // -- uses req/rsp for throttling
    async.whilst 
    (	function () { return curr <= stop; },
	function (cb) {
	    req++;
           
    	    util.puts(util.format("%d (%d): %d", curr, req-rsp, copy ));
	    rest.get( uriBase + "/" + QryTail + "/" + curr  );
	    curr++;

            // Throttle
	    setTimeout( cb, (req-rsp) * 1 );
	},
	function () { util.puts( "whilst done." ); }
    );
}

// === Start of the command handler list ===

// -----------------------------------------------------------------------------
// Creates a list of all item id/name pairs and stores it in a JSON file.
// -----------------------------------------------------------------------------
if (Argv[2] == "-petlist"  ) { 
    MakeIdItemFile( FN_petList, "battlePet/species", "speciesId", 1400 ); 
}
else
if (Argv[2] == "-questlist") { 
    MakeIdItemFile( FN_questList, "quest", "id", 34000, 1 ); 
}
else

// -----------------------------------------------------------------------------
// For a given character, realm and region, list all uncompleted quests.
// -----------------------------------------------------------------------------
if (Argv[2] == "-queststodo") {
    var cfg   = USER.pets;

    var map   = Argv[3] || "Nagrand" ;
    var who   = Argv[4] || cfg.main ;
    var realm = Argv[5] || cfg.home ;

    // Open the -myquests file for the given char and realm
    var myQFile = FN_MyQuest_builder( realm, who );
    var QDone  = JSON.parse( fs.readFileSync( myQFile, 'utf-8' ));

    // Create an is-done array of the finished quest ids
    var isDone = new Array();
    for (var i=0; i<QDone.quests.length; i++) {
	isDone[QDone.quests[i]] = 1;
    }

    // Open the all-quests josn file
    var QData  = JSON.parse( fs.readFileSync( FN_questList, 'utf-8' ));
    var output = new Array();
    var nDone = 0; 
    // Iterate through all quests.
    for (var q=0; q<QData.length; q++) {
	var QD = QData[q];
	// If the quest is in the target region and not completed then add it to the output.
//        if ((QD.category == map) && (1 != isDone[QD.id])) {
        if (QD.category == map) { 
	    var item = {}; item.id = QD.id; item.name = QD.title;
            if (1 == isDone[QD.id]) {item.isDone = "yes"; nDone++; } else {item.isDone = "no"; }
            output[output.length] = item;
        }
    } 

    // At end of loop, output the number and names of all the not-completed quests.
    var jsonOut = JSON.stringify( output, null, 3 );
    util.puts( jsonOut );
    util.puts( util.format("%s on %s has completed %d of %d quests in %s.  %d remain.",
			   who, realm, nDone, output.length, map, output.length-nDone ));

    var outFN = util.format( "%s/questsToDo-%s-%s-%s.json", FN_jsonDir, realm, who, map  );
        outFN = ScrubStringCL( outFN );

    fs.writeFileSync( outFN, jsonOut, 'utf-8' );
    util.puts( "Wrote output to: " + outFN ); 
}
else
// -----------------------------------------------------------------------------
// Searches for a specific list of items on the provided list of auction houses.
// -----------------------------------------------------------------------------
if (Argv[2] == "-ahitems") {

    var ary = USER.items;

    // Loop over all configured auction house search lists
    for (var a=0; a<ary.length; a++) {
	
	var ahlist = ary[a].ahlist;
        var items  = ary[a].items;

	// Convert list of item names into a sorted list of item ids
	// -- we use a local file so this should be reasonably quick
        var itemIds = [];
	
        // Loop over all configured auction houses
	for (var ah=0; ah<ahlist.length; ah++) {
	    var aHouse = ahlist[ah];
	    var ahFile  = FN_jsonDir + "/ah-" + aHouse.realm +".json";
	    var ahData  = JSON.parse( fs.readFileSync( ahFile, 'utf-8' ));
	    util.puts( util.format( "%s Auction House (%s):", aHouse.realm, aHouse.faction ));

            var list = ahData[ aHouse.faction ].auctions;
	    var len = list.length;

	    var result = [];
	    var nRes = 0;

	    // Loop over all items in the auction house
	    for (var i=0; i<len; i++) {
		var item = list[i];
		var id = item.item;

/*
		// if id is in the itemIds list ...

		//if (typeof id != 'undefined') {
		//    var own = petIndex[id] || 0;
		//    if ((0 === own) && (item.buyout <= maxBuy) && (item.bid <= maxBuy)) {

			// Construct a "found" auction item.  Add it to result list.
			var temp   = {};
			temp.id    = id;
			temp.count = item.quantity;
			temp.bid   = item.bid;
			temp.buy   = item.buyout;
			result[nRes++] = temp;
		    }
		}
*/
	    }
	    result.sort(function(a,b) { return a.buy - b.buy; });
	    for (var i=0; i<result.length; i++) {
		var res = result[i];
		util.puts( util.format( "id:%d, qual:%d, bid:%d, buy:%d", 
    					res.id, res.qual, res.bid/10000, res.buy/10000 ));
	    }
	}
    }
}
else
// -----------------------------------------------------------------------------
// Searches for battle pets not owned on the provided list of auction houses.
// -----------------------------------------------------------------------------
if (Argv[2] == "-ahpets") {

    var petIndex = JSON.parse( fs.readFileSync( FN_petIndex, 'utf-8' ));

//    util.puts( util.inspect( USER ));

    var cfg    = USER.pets
    var maxBuy = cfg.maxbuy;
    var ahlist = cfg.ahlist;
    
    for (var ah=0; ah<ahlist.length; ah++) {
	var aHouse = ahlist[ah];
	var ahFile = FN_jsonDir + "/ah-" + aHouse.realm +".json";
	var ahData = JSON.parse( fs.readFileSync( ahFile, 'utf-8' ));
	util.puts( util.format( "%s Auction House (%s):", aHouse.realm, aHouse.faction ));

        var list = ahData[ aHouse.faction ].auctions;
	var len = list.length;

	var result = [];
	var nRes = 0;

	for (var i=0; i<len; i++) {
	    var item = list[i];
	    var id = item.petSpeciesId;
	    if (typeof id != 'undefined') {
		var own = petIndex[id] || 0;
		if ((0 === own) && (item.buyout <= maxBuy) && (item.bid <= maxBuy)) {
		    var temp  = {};
                    temp.id   = id;
		    temp.qual = item.petQualityId;
		    temp.bid  = item.bid;
		    temp.buy  = item.buyout;
		    result[nRes++] = temp;
		}
	    }
	}
	result.sort(function(a,b) { return a.buy - b.buy; });
	for (var i=0; i<result.length; i++) {
	    var res = result[i];
	    util.puts( util.format( "id:%d, qual:%d, bid:%d, buy:%d", 
    	    res.id, res.qual, res.bid/10000, res.buy/10000 ));
	}
    }
}
else
// -----------------------------------------------------------------------------
// Creates an index for determining what pets are collected.  The output is a
// JSON array where array[creatureId] returns the number of such pets in my
// collection.  Requires FN_myPets to be present.
// -----------------------------------------------------------------------------
if (Argv[2] == "-petindex") {

    fs.readFile( FN_myPets, 'utf-8', function(err,data) {
	if(err) { console.log(err); } 
	else    { 
	    var pets = JSON.parse(data).pets;
	    util.puts( "Pets collected: " + pets.numCollected );

	    var arr = pets.collected;
	    var len = arr.length;

	    var nUniq = 0;
	    var idx = new Array();

	    for (var i=0; i<len; i++) {
		var id = arr[i].stats.speciesId;
		idx[id] = (idx[id]+1) || 1;
		if (1 === idx[id]) { nUniq++; }
	    }
	    util.puts( "Unique pets collected: " + nUniq );

   	    fs.writeFile( FN_petIndex, JSON.stringify( idx ), function(err) {
	        if(err) { console.log(err); } 
	        else    { console.log("The pet index was saved to: " + FN_petIndex ); }
	    });
	}
    });
}
else
// -----------------------------------------------------------------------------
// Search for pets with specific types and attack types
// -----------------------------------------------------------------------------
if (Argv[2] == "-petSrch") {
    pets.LoadPetTypes( FN_petTypes );
    pets.LoadPetList ( FN_petList  );
    pets.LoadPetIndex( FN_petIndex );
    pets.FindDblTypes(false);
}
else
if (Argv[2] == "-petSrchOwn") {
    pets.LoadPetTypes( FN_petTypes );
    pets.LoadPetList ( FN_petList  );
    pets.LoadPetIndex( FN_petIndex );
    pets.FindDblTypes(true);
}
else
// -----------------------------------------------------------------------------
// Creates a list of all item id/name pairs and stores it in a JSON file.
// -----------------------------------------------------------------------------
if (Argv[2] == "-itemlist") {

    // Loop control
    var req  =  0;
    var rsp  =  0; 
    var curr =  1;
    var last = 100000;  // is this enough?

    // List control and stats
    var list = new Array();
    var copy =  0;
    var skip =  0;

    // GET response handler (callback)
    var cbRest = function (result) {
	rsp++;

	if (null == result.id) {
	    skip++;
        } else {
	    var item = {}; item.id = result.id; item.name = result.name;
	    list[copy] = item; 
	    util.puts( "Added item #" + copy );
	    copy++;
        }

	if (rsp >= req) {
	   var json = JSON.stringify(list);

	   util.puts("List length = " + list.length );
	   //util.puts("Inspected: " + util.inspect(list));
           //util.puts("List: " + json);

	   fs.writeFile( FN_itemList, json, function(err) {
	       if(err) { console.log(err); } 
	       else    { console.log("The file was saved."); }
	   });
	   util.print( util.format( "Skipped/Created: %d, %d\n", skip, copy ));
	}
    } 

    // Throwaway GET, to init the global listener list.
    rest.get( "" ).on("complete",cbRest);

    // GET loop
    // -- uses curr/last for loop control
    // -- uses req/rsp for throttling
    async.whilst 
    (	function () { return curr <= last; },
	function (cb) {
	    req++;
    	    util.puts(util.format("%d (%d)", curr, req-rsp ));
	    rest.get( uriBase + "/item/" + curr );
	    curr++;
            setTimeout( cb, (req-rsp) * 1 );
	},
	function () { util.puts( "whilst done." ); }
    );
}
else
// -----------------------------------------------------------------------------
// Looks up the item id from a given item name.  (Requires item id/pair json
// file to be present -- run -itemlist first if need be.
// -----------------------------------------------------------------------------
if (Argv[2] == "-itemid") {

    var itemName = Argv[3];  // util.puts( "Item name: " + itemName );

    fs.readFile( FN_itemList, 'utf-8', function(err,data) {
	if(err) { console.log(err); } 
	else    { 
	    var list = JSON.parse(data);
	    var len = list.length;
	    for (var i=0; i<len; i++) {
		if (list[i].name == itemName) {
		    util.puts(item.id);
		    break;
		}
	    }
	}
    });
}
else
// -----------------------------------------------------------------------------
// Gets latest AH data for a realm: (Horde,Allies,Neutral)
// > node wowcpa.js -ah Smolderthorn
// -----------------------------------------------------------------------------
if (Argv[2] == "-ah") {
   
   var realm = Argv[3];
   var uri = uriBase + "/auction/data/" + realm;
  
   UriCall(uri, function(result){
       var url = result.files[0].url; 

       if (3 <= DLVL) { util.puts("Snapshot url: " + url); }

       UriCall(url, function(result){
	   var fout = FN_jsonDir + "/ah-" + realm + ".json";
	   fs.writeFile( fout, JSON.stringify( result,null,3 ), function(err) {
 	       if(err) { console.log(err); } 
	       else    { console.log("AH snapshot for " + realm + " saved to: " + fout); }
           });    
       });
   });
}
else 
// -----------------------------------------------------------------------------
// Issues CPA query and writes results to disk
// > node wowcpa.js -fo <filename> <cpa-query>
//------------------------------------------------------------------------------
if (Argv[2] == "-fo") {
    UriCallToFile( Argv[3], UriTail(4) );
}
else
// -----------------------------------------------------------------------------
// Pet name from species ID
// -----------------------------------------------------------------------------
if (Argv[2] == "-petname") {
    var petId = Argv[3];
    var uri = uriBase + "/battlePet/species/" + petId; 
    UriCall( uri, function( result ) {
	util.puts( result.name );
    });
}
else
// -----------------------------------------------------------------------------
// Help on queries
// -----------------------------------------------------------------------------
if (Argv[2] == "-mypets") {
    var cfg = USER.pets; 
    var uri = uriBase + "/character/" + cfg.home + "/" + cfg.main + "?fields=pets" ;
    UriCallToFile( FN_myPets, uri );
}
else
if (Argv[2] == "-myquests") {
    var cfg = USER.pets;
    var who   = Argv[3] || cfg.main ;
    var realm = Argv[4] || cfg.home ;
    var fn    = FN_MyQuest_builder( realm, who ); 
    var uri = uriBase + "/character/" + realm + "/" + who + "?fields=quests" ;
    UriCallToFile( fn, uri ); 
}
else
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
if (Argv[2] == "-test") {
    var uri = "http://us.battle.net/api/wow/item/" ;
    var cb = function( result ) {
	util.puts( "result: " + JSON.stringify(result).substring(0,20) + " ..." );
    }
    rest.on("complete", cb );
    rest.get( uri + 35).on("complete", cb ); 
    rest.get( uri + 36);
    rest.get( uri + 37);
}
else {
// ------------------------------------------------------------------------------
// Issues CPA query and writes result to screen.
// -- "http://us.battle.net/api/wow/" is implied and does not need to be entered.
// ------------------------------------------------------------------------------
    var uri = UriTail(2);
    UriCall( uri );   
}




