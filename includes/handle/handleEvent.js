const fs = require("fs");
const path = require("path");
const freezePath = path.join(__dirname, "..", "..", "freeze.lock");

// [MODIFIED] models, Users, Threads, Currencies বাদ
module.exports = function ({ api }) {
    const logger = require("../../utils/log.js");
    const moment = require("moment-timezone");

    return function ({ event }) {
        if (fs.existsSync(freezePath)) {
            // Freeze mode: কোনো ইভেন্ট হ্যান্ডল করা হবে না
            return;
        }

        const timeStart = Date.now();
        const time = moment.tz("Asia/Kolkata").format("HH:mm:ss L");
        const { events } = global.client;
        const { allowInbox, DeveloperMode } = global.config;
        var { senderID, threadID } = event;
        senderID = String(senderID);
        threadID = String(threadID);
        if ((allowInbox == false && senderID == threadID)) return;
        if (event.type == "change_thread_image") event.logMessageType = "change_thread_image";

        for (const [key, value] of events.entries()) {
            if (value.config.eventType.indexOf(event.logMessageType) !== -1) {
                const eventRun = events.get(key);
                try {
                    const Obj = {};
                    Obj.api = api;
                    Obj.event = event;
                    // [MODIFIED] models, Users, Threads, Currencies বাদ
                    eventRun.run(Obj);
                    if (DeveloperMode === true)
                        logger(global.getText('handleEvent', 'executeEvent', time, eventRun.config.name, threadID, Date.now() - timeStart), '[ Event ]');
                } catch (error) {
                    logger(global.getText('handleEvent', 'eventError', eventRun.config.name, JSON.stringify(error)), "error");
                }
            }
        }
        return;
    };
};
