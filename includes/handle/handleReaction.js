// [MODIFIED] models, Users, Threads, Currencies বাদ
module.exports = function ({ api }) {
    return function ({ event }) {
        const { handleReaction, commands } = global.client;
        const { messageID, threadID, reaction } = event;

        // অটো আনসেন্ড ফিচার (😡 রিয়েকশন দিলে)
        if (reaction === '😡') {
            return api.unsendMessage(messageID);
        }

        if (handleReaction.length !== 0) {
            const indexOfHandle = handleReaction.findIndex(e => e.messageID == messageID);
            if (indexOfHandle < 0) return;
            const indexOfMessage = handleReaction[indexOfHandle];
            const handleNeedExec = commands.get(indexOfMessage.name);

            if (!handleNeedExec) return api.sendMessage(global.getText('handleReaction', 'missingValue'), threadID, messageID);
            try {
                var getText2;
                if (handleNeedExec.languages && typeof handleNeedExec.languages == 'object')
                	getText2 = (...value) => {
                    const react = handleNeedExec.languages || {};
                    if (!react.hasOwnProperty(global.config.language))
                    	return api.sendMessage(global.getText('handleCommand', 'notFoundLanguage', handleNeedExec.config.name), threadID, messageID);
                    var lang = handleNeedExec.languages[global.config.language][value[0]] || '';
                    for (var i = value.length; i > 0; i--) {
                        const expReg = RegExp('%' + i, 'g');
                        lang = lang.replace(expReg, value[i]);
                    }
                    return lang;
                };
                else getText2 = () => {};
                const Obj = {};
                Obj.api = api;
                Obj.event = event;
                // [MODIFIED] models, Users, Threads, Currencies বাদ
                Obj.handleReaction = indexOfMessage;
                Obj.getText = getText2;
                handleNeedExec.handleReaction(Obj);
                return;
            } catch (error) {
                return api.sendMessage(global.getText('handleReaction', 'executeError', error), threadID, messageID);
            }
        }
    };
};
