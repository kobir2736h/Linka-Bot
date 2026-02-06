const express = require('express');
const path = require('path');
const login = require("fca-priyansh"); // লগইন এখন এখানে হবে
const { writeFileSync } = require("fs");
const logger = require("./utils/log");

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

let currentStatus = { percent: 0, message: "Waiting for cookies..." };
let botInstance = null; // মেমোরিতে বট রাখার জন্য

// ওয়েবসাইট সার্ভ করা
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '/index.html')));

// স্ট্যাটাস চেক API
app.get('/status', (req, res) => res.json(currentStatus));

// লগইন API
app.post('/login', (req, res) => {
    const { appState } = req.body;
    if (!appState) return res.status(400).send("No AppState");

    try {
        // ১. কুকিজ ফাইলে সেভ করা (ভবিষ্যতের জন্য)
        writeFileSync("appstate.json", appState, 'utf8');
        
        // ২. লগইন প্রসেস শুরু
        startLoginProcess(JSON.parse(appState));
        
        res.send("Login process started...");
    } catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});

// রিস্টার্ট API
app.post('/reset', (req, res) => {
    process.exit(1); // পুরো সার্ভার রিস্টার্ট নেবে (Hosting এ অটো অন হবে)
});

app.listen(port, () => {
    logger(`Server running on port ${port}`, "[ SERVER ]");
});

// ============ আসল কাজ এখানে ============

async function startLoginProcess(appState) {
    updateStatus(10, "Verifying Cookies...");

    const loginData = { appState: appState };
    const options = { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36" };

    // ১. index.js নিজেই লগইন করছে
    login(loginData, options, async (err, api) => {
        if (err) {
            updateStatus(0, "Login Failed! Invalid Cookies.");
            return logger("Login Failed: " + JSON.stringify(err), "[ ERROR ]");
        }

        updateStatus(40, "Login Success! Starting Priyansh System...");

        try {
            // ২. লগইন সফল হলে Priyansh.js কে কল করা হচ্ছে
            // আমরা api অবজেক্ট এবং আমাদের স্ট্যাটাস ফাংশনটা পাঠিয়ে দিচ্ছি
            const startPriyansh = require("./Priyansh");
            await startPriyansh(api, updateStatus); 
        } catch (error) {
            updateStatus(0, "System Error: " + error.message);
        }
    });
}

// স্ট্যাটাস আপডেট করার ফাংশন
function updateStatus(p, m) {
    currentStatus.percent = p;
    currentStatus.message = m;
    console.log(`[ STATUS ${p}% ] ${m}`);
    }

//////////////////////////////////////
//========= start the bot =========//
////////////////////////////////////

startBot();



// ⬇️ শেষেই এই লাইনটা add করবি
require("./ping")();
