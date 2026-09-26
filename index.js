import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 10000;

let pairCode = '';
let isConnected = false;
let sock;

async function startBos() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["BOS BOT", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBos();
            } else {
                console.log('Logged out, delete auth folder');
                isConnected = false;
                pairCode = '';
            }
        } else if (connection === 'open') {
            console.log('BOS CONNECTED!');
            isConnected = true;
            pairCode = 'CONNECTED';
        }
    });

    // Auto Welcome + Anti Link
    sock.ev.on('group-participants.update', async (u) => {
        try {
            for (let p of u.participants) {
                if (u.action === 'add') {
                    await sock.sendMessage(u.id, { text: `*স্বাগতম বস!* 🎉 @${p.split('@')[0]}`, mentions: [p] });
                }
            }
        } catch {}
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        if (!from.endsWith('@g.us')) return;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (body.includes('http://') || body.includes('https://')) {
            try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
        }
    });
}

app.get('/', async (req, res) => {
    const number = req.query.number;
    
    if (number && sock && !isConnected) {
        try {
            let cleanNum = number.replace(/[^0-9]/g, '');
            if (!cleanNum.startsWith('880')) {
                cleanNum = '880' + cleanNum.replace(/^0/, '');
            }
            pairCode = await sock.requestPairingCode(cleanNum);
            console.log('Pair code for ' + cleanNum + ': ' + pairCode);
        } catch (e) {
            console.log('Pair error: ' + e.message);
            pairCode = 'ERROR: Try after 2 min';
        }
    }

    let html = `
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
    <div style="background:#111;padding:30px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%;">
    <h2 style="color:#25D366;">🍫 BOS BOT</h2>
    `;

    if (isConnected || pairCode === 'CONNECTED') {
        html += `<h1 style="color:#25D366;">✅ CONNECTED BOS!</h1><p>Bot active in WhatsApp!</p>`;
    } else {
        if (pairCode) {
            html += `<div style="font-size:32px;letter-spacing:8px;background:#222;padding:15px;border-radius:10px;color:#25D366;font-weight:bold;margin:20px 0;">${pairCode}</div>`;
            html += `<p style="font-size:14px;">WhatsApp > Linked Devices > Link with phone number এ বসাও বস</p><p style="color:#888;font-size:12px;">Code 60 sec পর expire হবে</p><hr style="border-color:#333;margin:20px 0;">`;
        } else {
            html += `<p>নাম্বার দাও বস, কোড বের করে দিচ্ছি...</p>`;
        }
        html += `
        <form method="GET">
        <input name="number" placeholder="8801341476952" value="${number || ''}" required style="padding:12px;width:80%;border-radius:10px;border:none;text-align:center;font-size:16px;">
        <br><br>
        <button type="submit" style="padding:12px 30px;background:#25D366;color:#000;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:16px;">GET PAIR CODE</button>
        </form>
        `;
    }
    html += `</div></body></html>`;
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('BOS Running on ' + PORT));
