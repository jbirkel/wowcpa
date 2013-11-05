
var fs   = require('fs');
var util = require('util');

var petTypes = [];
var petList  = [];


var FN_petSrch = 'pet-search.json';

exports.test = function() { util.puts( 'wowpets.js:test() called' ); }


function loadJson( filename ) {
    var file = fs.readFileSync( filename, 'utf-8' );
    if (typeof file == 'undefined') {
        util.puts("Unable to load file: " + filename );
    } else {
	return JSON.parse( file );
    } 
}

var   weakAgainst = [];
var strongAgainst = [];
function makeAgainstIndexes() {
    for (var i=0; i<petTypes.length; i++) {
	var ii = petTypes[i];
  	  weakAgainst[ii.weakAgainstId] = i;
	strongAgainst[ii.strongAgainstId] = i;
    }
}

exports.LoadPetTypes = function( filename ) {
   petTypes = loadJson( filename )['petTypes'];
   //util.puts( util.inspect( petTypes ));
}

exports.LoadPetList = function( filename ) {
   petList  = loadJson( filename );
}

exports.LoadPetIndex = function( filename ) {
   petIndex = loadJson( filename );
}

exports.DumpPetTypes = function() {
    if (0 === petTypes.length) {
        util.puts('Pet types not loaded.');
	return;
    }

    for (var i=0; i < petTypes.length; i++) {
	var ii = petTypes[i];
	util.puts( util.format( '%d %s >%s <%s', i, ii.name, 
				petTypes[ii.strongAgainstId].name,
			        petTypes[ii.weakAgainstId].name     ));
    }
} 

exports.FindDblTypes = function(ownedOnly) {
    makeAgainstIndexes();
    //util.puts( util.inspect( weakAgainst ));
    //util.puts( util.inspect( strongAgainst ));
    //return;

    var results = [];
    var iRes = 0;

    for (var i=0; i<petList.length; i++) {
	var ii            = petList[i];
        //util.puts( util.inspect( ii ));

        var tID = ii.petTypeId;
        var sID = ii.speciesId;
//        if (6 == tID || (ownedOnly && (null == petIndex[ii.speciesId]))) {
	// Skip Elementals because they are natural dbl-type advantaged
	if (6 == tID) {
	    continue;
	}

	var weakEnemyType =   weakAgainst[tID]; 
        var strongAtkType = strongAgainst[weakEnemyType];
	var attacks       = ii.abilities;
	count = 0;
        //util.print( ii.petTypeId, weakEnemyType, strongAtkType );
	for (var a=0; a<attacks.length; a++) {
            var aa = attacks[a];
	    if (aa.petTypeId == strongAtkType) { count++; }
	    //util.print( aa.petTypeId );
	}
        //util.puts("");
	if (0 < count) {
	    var rr = {};
	    rr.name      = ii.name;
	    rr.speciesId = ii.speciesId;
	    rr.petType   = petTypes[tID].name, 
	    rr.atkType   = petTypes[strongAtkType].name;
	    rr.oppType   = petTypes[weakEnemyType].name;
	    rr.oppTypeId = weakEnemyType;
	    rr.atkCount  = count;
	    rr.owned     = !(null == petIndex[ii.speciesId]);
	    results[iRes++] = rr;
	}
    } 

    //util.puts( "Results length = " + results.length );
    //util.puts( util.inspect( results ));
    results.sort( function(a,b) { 
	return (a.atkCount - b.atkCount) || (a.oppTypeId - b.oppTypeId); 
    });

    // Write results to JSON file
    var filename = FN_petSrch;
    fs.writeFile( filename, JSON.stringify( results, null, 3 ), function(err) {
	if(err) { console.log(err); } 
	else    { console.log("Results save to: " + filename ); }
    });    

    // Dump results to console
    for (var r=0; r<results.length; r++) {
	var rr = results[r];
	if (rr.owned || !ownedOnly) {
	    util.puts( util.format(
		"%s(%d): %s,%s x%d vs %s %s",
		rr.name, rr.speciesId, rr.petType, rr.atkType, rr.atkCount, rr.oppType,
		(rr.owned && "(Owned)") || ""
	    ));
	}
    }
}
