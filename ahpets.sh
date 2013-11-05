# !/bin/sh
############################################################
#
# Searches select WoW auction houses for battle pets I don't
# have at reasonable prices. (Refreshes the AH and battle pet
# files first.)
#
############################################################

node wowcpa.js -ah Smolderthorn
node wowcpa.js -ah Nesingwary
node wowcpa.js -mypets
node wowcpa.js -petindex
node wowcpa.js -ahpets
