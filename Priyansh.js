const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const axios = require("axios"); // login require বাদ দেয়া হয়েছে
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;
const { Sequelize, sequelize } = require("./includes/database");

// =========================================================
// এই ফাইল এখন একটি ফাংশন এক্সপোর্ট করবে
// api: যেটা index.js থেকে আসবে (লগইন করা অবস্থায়)
// updateStatus: স্ট্যাটাস আপডেট করার ফাংশন
// =========================================================

module.exports = async function startPriyansh(api, updateStatus) {

    // ১. গ্লোবাল ভেরিয়েবল সেটআপ
    global.whitelistUser = new Set();
    global.whitelistThread = new Set();
    global.whitelistUserToggle = false;
    global.whitelistThreadToggle = false;

    global.client = new Object({
        commands: new Map(),
        events: new Map(),
        cooldowns: new Map(),
        eventRegistered: new Array(),
        handleSchedule: new Array(),
        handleReaction: new Array(),
        handleReply: new Array(),
        mainPath: process.cwd(),
        configPath: new String(),
        getTime: function (option) {
            switch (option) {
                case "seconds": return `${moment.tz("Asia/Kolkata").format("ss")}`;
                case "minutes": return `${moment.tz("Asia/Kolkata").format("mm")}`;
                case "hours": return `${moment.tz("Asia/Kolkata").format("HH")}`;
                case "date": return `${moment.tz("Asia/Kolkata").format("DD")}`;
                case "month": return `${moment.tz("Asia/Kolkata").format("MM")}`;
                case "year": return `${moment.tz("Asia/Kolkata").format("YYYY")}`;
                case "fullHour": return `${moment.tz("Asia/Kolkata").format("HH:mm:ss")}`;
                case "fullYear": return `${moment.tz("Asia/Kolkata").format("DD/MM/YYYY")}`;
                case "fullTime": return `${moment.tz("Asia/Kolkata").format("HH:mm:ss DD/MM/YYYY")}`;
            }
        }
    });

    global.data = new Object({
        threadInfo: new Map(),
        threadData: new Map(),
        userName: new Map(),
        commandBanned: new Map(),
        threadAllowNSFW: new Array(),
        allUserID: new Array(),
        allCurrenciesID: new Array(),
        allThreadID: new Array()
    });

    global.utils = require("./utils");
    global.nodemodule = new Object();
    global.config = new Object();
    global.configModule = new Object();
    global.moduleData = new Array();
    global.language = new Object();

    // ২. কনফিগ লোড
    updateStatus(50, "Loading Configurations...");
    
    var configValue;
    try {
        global.client.configPath = join(global.client.mainPath, "config.json");
        configValue = require(global.client.configPath);
    } catch {
        if (existsSync(global.client.configPath.replace(/\.json/g,"") + ".temp")) {
            configValue = readFileSync(global.client.configPath.replace(/\.json/g,"") + ".temp");
            configValue = JSON.parse(configValue);
        } else return logger.loader("config.json not found!", "error");
    }

    try {
        for (const key in configValue) global.config[key] = configValue[key];
    } catch { return logger.loader("Can't load file config!", "error") }
    
    writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

    // ৩. ভাষা (Language) লোড
    const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
    const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
    for (const item of langData) {
        const getSeparator = item.indexOf('=');
        const itemKey = item.slice(0, getSeparator);
        const itemValue = item.slice(getSeparator + 1, item.length);
        const head = itemKey.slice(0, itemKey.indexOf('.'));
        const key = itemKey.replace(head + '.', '');
        const value = itemValue.replace(/\\n/gi, '\n');
        if (typeof global.language[head] == "undefined") global.language[head] = new Object();
        global.language[head][key] = value;
    }

    global.getText = function (...args) {
        const langText = global.language;
        if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
        var text = langText[args[0]][args[1]];
        for (var i = args.length - 1; i > 0; i--) {
            const regEx = RegExp(`%${i}`, 'g');
            text = text.replace(regEx, args[i + 1]);
        }
        return text;
    }

    // ৪. ডেটাবেস কানেকশন
    updateStatus(60, "Connecting to Database...");
    try {
        await sequelize.authenticate();
        const authentication = {};
        authentication.Sequelize = Sequelize;
        authentication.sequelize = sequelize;
        const models = require('./includes/database/model')(authentication);
        
        // ৫. API সেট করা (যেটা index.js থেকে এসেছে)
        global.client.api = api;
        api.setOptions(global.config.FCAOption);

        updateStatus(70, "Loading Commands & Events...");

        // ৬. কমান্ড লোড করা
        const listCommand = readdirSync(global.client.mainPath + '/Priyansh/commands').filter(command => command.endsWith('.js') && !command.includes('example') && !global.config.commandDisabled.includes(command));
        for (const command of listCommand) {
            try {
                var module = require(global.client.mainPath + '/Priyansh/commands/' + command);
                if (!module.config || !module.run || !module.config.commandCategory) throw new Error(global.getText('priyansh', 'errorFormat'));
                if (global.client.commands.has(module.config.name || '')) throw new Error(global.getText('priyansh', 'nameExist'));
                
                // Dependency Install Logic
                if (module.config.dependencies && typeof module.config.dependencies == 'object') {
                    for (const reqDependencies in module.config.dependencies) {
                        const reqDependenciesPath = join(__dirname, 'nodemodules', 'node_modules', reqDependencies);
                        try {
                            if (!global.nodemodule.hasOwnProperty(reqDependencies)) {
                                if (listPackage.hasOwnProperty(reqDependencies) || listbuiltinModules.includes(reqDependencies)) global.nodemodule[reqDependencies] = require(reqDependencies);
                                else global.nodemodule[reqDependencies] = require(reqDependenciesPath);
                            }
                        } catch {
                            // Install package logic (Simplifed for brevity)
                            execSync('npm --package-lock false --save install ' + reqDependencies, { 'stdio': 'inherit', 'shell': true, 'cwd': join(__dirname, 'nodemodules') });
                            require['cache'] = {};
                            global['nodemodule'][reqDependencies] = require(reqDependencies);
                        }
                    }
                }

                if (module.onLoad) {
                    const moduleData = { api: api, models: models };
                    module.onLoad(moduleData);
                }
                if (module.handleEvent) global.client.eventRegistered.push(module.config.name);
                global.client.commands.set(module.config.name, module);
            } catch (error) {
                logger.loader(`Failed to load command: ${command} ` + error, 'error');
            }
        }

        // ৭. ইভেন্ট লোড করা
        const events = readdirSync(global.client.mainPath + '/Priyansh/events').filter(event => event.endsWith('.js') && !global.config.eventDisabled.includes(event));
        for (const ev of events) {
            try {
                var event = require(global.client.mainPath + '/Priyansh/events/' + ev);
                global.client.events.set(event.config.name, event);
            } catch (error) {
                logger.loader(`Failed to load event: ${ev}`, 'error');
            }
        }

        updateStatus(90, "Starting Listener...");

        // ৮. লিসেনার চালু করা
        const listenerData = { api: api, models: models };
        const listener = require('./includes/listen')(listenerData);

        function listenerCallback(error, message) {
            if (error) return logger.loader("Listen Error: " + JSON.stringify(error), 'error');
            if (['presence', 'typ', 'read_receipt'].some(data => data == message.type)) return;
            if (global.config.DeveloperMode) console.log(message);
            return listener(message);
        };

        global.handleListen = api.listenMqtt(listenerCallback);
        
        updateStatus(100, "Bot is Running Successfully!");
        logger.loader("Bot Started Successfully!");

    } catch (error) {
        updateStatus(0, "Database/System Error: " + error.message);
        logger.loader("Critical Error: " + error, 'error');
    }
};
