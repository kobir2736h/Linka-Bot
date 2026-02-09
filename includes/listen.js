module.exports = function ({ api }) {
  const fs = require("fs");
  const logger = require("../utils/log.js");
  const isBlocked = require("./wlt"); // ✅ whitelist checker

  
  // বটের নাম কনসোলে দেখাবে
  
  logger(`[ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "" : global.config.BOTNAME}`, "[ Priyansh Rajput ]");

  ///////////////////////////////////////////////
  //========= Require all handle need =========//
  ///////////////////////////////////////////////

  
  const handleCommand = require("./handle/handleCommand")({ api });
  const handleCommandEvent = require("./handle/handleCommandEvent")({ api });
  const handleReply = require("./handle/handleReply")({ api });
  const handleReaction = require("./handle/handleReaction")({ api });
  const handleEvent = require("./handle/handleEvent")({ api });
  
  

  //////////////////////////////////////////////////
  //========= Send event to handle need =========//
  /////////////////////////////////////////////////

  return (event) => {
    if (isBlocked(event)) return; // ✅ whitelist block check

    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        // [REMOVED] - handleCreateDatabase({ event 
