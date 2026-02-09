const express = require('express');
const path = require('path');
const login = require("fca-priyansh"); 
const { writeFileSync, unlinkSync, existsSync } = require("fs");
const logger = require("./utils/log");

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

let currentStatus = { percent: 0, message: "Waiting for cookies..." };

// ==========================================
// 🔥 CRASH GUARD (এটা এরর ধরবে কিন্তু সার্ভার বন্ধ হতে দিবে না)
// ==========================================
process.on('uncaughtException', (err) => {
    console.error("[ CRITICAL ERROR ] Server Crashed:", err);
    currentStatus = { percent: 0, message: "Server Error: " + err.message };
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("[ PROMISE ERROR ] Unhandled Rejection:", reason);
});
// ==========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '/index.html')));

app.get('/status', (req, res) => res.json(currentStatus));

app.post('/login', (req, res) => {
    const { appState } = req.body;
    if (!appState) return res.status(400).send("No AppState provided");

    try {
        console.log("[ DEBUG ] saving appstate.json...");
        writeFileSync("appstate.json", appState, 'utf8');
        
        console.log("[ DEBUG ] Parsing JSON...");
        const parsedState = JSON.parse(appState);
        
        console.log("[ DEBUG ] Starting Login Process...");
        startLoginProcess(parsedState);
        
        res.send("Login started...");
    } catch (e) {
        console.error("[ DEBUG ] Error in login route:", e);
        res.status(500).send("Error: " + e.message);
    }
});

app.post('/reset', (req, res) => {
    if (existsSync("appstate.json")) unlinkSync("appstate.json");
    process.exit(1); 
});

app.listen(port, () => {
    logger(`Server running on port ${port}`, "[ SERVER ]");
    if (existsSync("appstate.json")) unlinkSync("appstate.json");
});

// ==========================================
//          LOGIN FUNCTION
// ==========================================

function updateStatus(p, m) {
    currentStatus.percent = p;
    currentStatus.message = m;
    console.log(`[ STATUS ${p}% ] ${m}`);
}

async function startLoginProcess(appState) {
    updateStatus(10, "Cookies Received. Initializing FCA...");

    const loginData = { appState: appState };
    const options = { 
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        forceLogin: true,
        logLevel: "silent" 
    };

    try {
        console.log("[ DEBUG ] Calling fca-priyansh login()...");
        
        login(loginData, options, async (err, api) => {
            if (err) {
                console.error("[ FAILED ] Login Callback Error:", err);
                updateStatus(0, "Login Failed: " + JSON.stringify(err));
                return;
            }

            console.log("[ SUCCESS ] Logged in successfully!");
            updateStatus(50, "Login Success! Starting Engine...");

            try {
                const startPriyansh = require("./Priyansh");
                await startPriyansh(api, updateStatus); 
            } catch (error) {
                console.error("[ ENGINE FAIL ] Priyansh.js crashed:", error);
                updateStatus(0, "Engine Crash: " + error.message);
            }
        });
    } catch (e) {
        console.error("[ FATAL ] Unexpected Login Error:", e);
        updateStatus(0, "Fatal Error: " + e.message);
    }
}

try { require("./ping")(); } catch (e) {}
