module.exports = function ({ api }) {
  const fs = require("fs");
  const logger = require("../utils/log.js");
  const isBlocked = require("./wlt"); // ✅ whitelist checker

  // [REMOVED] - Users, Threads, Currencies কন্ট্রোলার লোড বাদ দেওয়া হয়েছে
  // [REMOVED] - Environment Load (ডাটাবেস থেকে ডাটা লোড করার ফাংশন) বাদ দেওয়া হয়েছে

  // বটের নাম কনসোলে দেখাবে
  logger(`[ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "" : global.config.BOTNAME}`, "[ Priyansh Rajput ]");

  ///////////////////////////////////////////////
  //========= Require all handle need =========//
  ///////////////////////////////////////////////

  // [MODIFIED] - এখান থেকে models, Users, Threads, Currencies পাঠানো বাদ দেওয়া হয়েছে। শুধু api পাঠানো হচ্ছে।
  const handleCommand = require("./handle/handleCommand")({ api });
  const handleCommandEvent = require("./handle/handleCommandEvent")({ api });
  const handleReply = require("./handle/handleReply")({ api });
  const handleReaction = require("./handle/handleReaction")({ api });
  const handleEvent = require("./handle/handleEvent")({ api });
  
  // [REMOVED] - handleCreateDatabase বাদ দেওয়া হয়েছে

  //////////////////////////////////////////////////
  //========= Send event to handle need =========//
  /////////////////////////////////////////////////

  return (event) => {
    if (isBlocked(event)) return; // ✅ whitelist block check

    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        // [REMOVED] - handleCreateDatabase({ event });
        handleCommand({ event });
        handleReply({ event });
        handleCommandEvent({ event });
        break;
      case "event":
        handleEvent({ event });
        break;
      case "message_reaction":
        handleReaction({ event });
        break;
      default:
        break;
    }
  };
};
