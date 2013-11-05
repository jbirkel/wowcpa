wowcpa
======

Javascript (Node) console program that provides command-line access to the World of Warcraft Community Public API.  
Documentation for the WoW CPA is here: http://blizzard.github.io/api-wow-docs/

Basic Usage
-----------
The most basic use of the program is to perform a general query and print the results to the console.
When used this way the URL and common prefix of the api may be omitted.  For example, to query info about
recipe #33994 via a brower you would need the full URL: http://us.battle.net/api/wow/recipe/33994 

Using wowcpa you would only include 'recipe/33994' as shown in the following example.  
<samp>node wowcpa.js recipe/33994  
Result:  
{"id":33994,"name":"Enchant Gloves - Precise Strikes","profession":"Enchanting","icon":"spell_holy
_greaterheal"}</samp>  

The result of the query is printed to the console.  Sometimes query results can be very long.  Wowcpa
truncates long output to the first 200 characters as shown below.

<samp>node wowcpa.js realm/status
Result:  
{"realms":[{"type":"pvp","population":"medium","queue":false,"wintergrasp":{"area":1,"controlling-
faction":0,"status":0,"next":1383676922726},"tol-barad":{"area":21,"controlling-faction":0,"status
":0 ...</samp>  

To save the full results of long queries, use the "-fo" command line switch to direct the results into a file.

<samp>node wowcpa.js -fo results.json realm/status  
Result save to: results.json</samp>  

In this case the file 'results.json' written to the current working directory would contain the full JSON text showing
the status of all realms.  (WOW CPA queries return JSON strings, so json is a good file extension to use, but you 
can supply any file name.) 

Results sent to a file are formatted to be more readable.  Returning to the recipe example again, here's 
what the results of that query look like when written to a file:

<samp> node wowcpa.js -fo recipe33994.json recipe/33994  
Result save to: recipe33994.json  
cat recipe33994.json  
{  
&nbsp;&nbsp;&nbsp;"id": 33994,  
&nbsp;&nbsp;&nbsp;"name": "Enchant Gloves - Precise Strikes",  
&nbsp;&nbsp;&nbsp;"profession": "Enchanting",  
&nbsp;&nbsp;&nbsp;"icon": "spell_holy_greaterheal"  
}</samp>  

Built-In Commands
-----------------
Wowcpa recognizes a number of other commands as well:
- <b>-itemlist</b>: creates a list of all item name/id pairs

- <b>-petlist</b>: creates a list of all pet name/id pairs.

- <b>-questList</b>: creates a list of all quest name/id pairs.

- <b>-mypets</b>: creates of all pets owned by your account.  
<i>requires:</i> json/user-data.json  

- <b>-petindex</b>: creates an index used in determing what pets have been collected.  
<i>requires:</i> -mypets to have been run previously.

- <b>-myquests</b>: creates a list of all quests completed for a given player and realm.  
<i>format:</i> <samp>-myquests [&lt;player&gt;] [&lt;realm&gt;]</samp>  
<i>requires:</i> json/user-data.json  if player or realm are omitted from the command line.

- <b>-queststodo</b>: creates a list of all quests completed in a given region, for a given player and realm.  
<i>format:</i> <samp>-queststodo &lt;map&gt; [&lt;player&gt;] [&lt;realm&gt;]</samp>  
<i>requires:</i>-questlist, and -myquests (for the same player and realm) having been run previously

- <b>-petname</b>: returns the battle name for the given battle pet id number
<i>format:</i> <samp>-petname &lt;pet id&gt;</samp>  

- <b>-itemid</b>: returns the item id number for a given item name  
<i>format:</i> <samp>-itemid &lt;item name&gt;</samp>  
<i>requires:</i> -itemlist to have been run previously.

- <b>-ah</b>: queries all the items currently on the Auction House for the given realm  
<i>format:</i> <samp>-ah &lt;realm&gt;</samp>  

- <b>-petSrch</b>: searches for all pets with a double type advantage against some type of pet  
<i>requires:</i> -petList and -petIndex to have been run previously.

- <b>-petSrchOwn</b>: same as petSrch but limits search to pets owned by the main character.

- <b>-ahpets</b>: searches for pets not owned on a list of auction houses.  
<i>requires:</i> json/user-data.json and other JSON fils created by other commands.  See ahpets.sh for details.


<b>Examples</b>:  
- <samp>
node wowcpa.js -myquests Skinn Smolderthorn  
Result save to: json/myq-Smolderthorn-Skinn.json
</samp>  

- <samp>
node wowcpa.js -queststodo Nagrand Skinn Smolderthorn  
Skinn on Smolderthorn has completed 101 of 135 quests in Nagrand.  34 remain.  
Wrote output to: json/questsToDo-Smolderthorn-Skinn-Nagrand.json
</samp>  

- <samp>
node wowcpa.js -petname 195  
White Tickbird Hatchling
</samp>  

- <samp>
node wowcpa.js -itemid "Light Leather"  
2318
</samp>  

- <samp>
node wowcpa.js -ah Smolderthorn  
AH snapshot for Smolderthorn saved to: json/ah-Smolderthorn.json
</samp>  


user-data.json
--------------
Some commands either require or can make use of a file containing static data about the user.  See the provided
sample, user-data.json, and customize it to suit your main character.  


Notes:
------
- Only one command may be used at a time.
- There is no error checking at the moment.  I've noticed that some queries, like -ah, seem to fail often.  Just
retry a few times and it will eventually work.
- The -petlist and particularly the -itemlist commands can take a while to complete.  On the bright side the returned 
information should not change very often, so once you've run them once to create the output files you shouldn't have 
to run them again except as new patches and/or releases of WoW occur.
- This is my first javascript program.  As such it is rather thrown together and disorganized, and no doubt
the coding practice is somewhat unusual, if not downright scandalous.  (Forewarned is forearmed.)
