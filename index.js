const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = '';
let isConnected = false;
let sock;
let antilinkOn = true;

// auth folder না থাকলে বানাবে
if (!fs.existsSync('auth_info_baileys')) {
    fs.mkdirSync('auth_info_baileys');
}

async function startBos() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["SWEET Family Bot", "Chrome", "1.0.0"],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect } = update;
        if (qr) {
            qrImage = await qrcode.toDataURL(qr);
            console.log('QR Ready Bos');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                qrImage = '';
                startBos();
            }
        }
        if (connection === 'open') {
            isConnected = true;
            qrImage = 'CONNECTED';
            console.log('BOS CONNECTED!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;
            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();
            const lower = body.toLowerCase();
            if (!body) return;

            if (['hi','hii','hello'].includes(lower)) {
                await sock.sendMessage(from, { text: '🍫 হ্যালো বস! 👋 Bot Active!' });
            }
            if (lower === '.menu') {
                await sock.sendMessage(from, { text: '🍰 SWEET BOT\n\n.hi - Hello\n.menu - Menu\n.ping - Check\n.antilink on/off\n\nAnti-Link: ' + (antilinkOn? 'ON ✅ Strict' : 'OFF') });
            }
            if (lower === '.ping') {
                await sock.sendMessage(from, { text: '✅ PONG! Active!' });
            }
            if (lower === '.antilink on') {
                antilinkOn = true;
                await sock.sendMessage(from, { text: '✅ Anti-Link ON (Strict)! Admin er tao delete hobe!' });
                return;
            }
            if (lower === '.antilink off') {
                antilinkOn = false;
                await sock.sendMessage(from, { text: '❌ Anti-Link OFF!' });
                return;
            }

            // STRICT ANTI-LINK
            if (!isGroup ||!antilinkOn) return;
            const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|youtube\.com|youtu\.be)/i.test(body);
            if (!hasLink) return;

            const groupMeta = await sock.groupMetadata(from);
            const myNumber = sock.user.id.split(':')[0];
            const botIsAdmin = groupMeta.participants.find(p => p.id.includes(myNumber))?.admin;

            if (!botIsAdmin) {
                await sock.sendMessage(from, { text: '❌ আমাকে Admin দাও বস!' });
                return;
            }

            await sock.sendMessage(from, { delete: msg.key });
            await new Promise(r => setTimeout(r, 600));
            await sock.sendMessage(from, {
                text: '⚠️ ANTI-LINK! @' + sender.split('@')[0] + ' লিংক নিষিদ্ধ! 🚫',
                mentions: [sender]
            });

        } catch (e) {
            console.log('Error: ' + e.message);
        }
    });
}

app.get('/', (req, res) => {
    let html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%}img{width:280px;height:280px;background:#fff;padding:10px;border-radius:12px;margin:15px 0}button{padding:10px 20px;background:#25D366;border:none;border-radius:8px;font-weight:bold}</style></head><body><div class="card"><h2 style="color:#25D366;">SWEET Family Bot</h2>';
    if (isConnected || qrImage === 'CONNECTED') {
        html += '<h1 style="color:#25D366;">CONNECTED!</h1><p>Anti-Link Strict ON ✅</p>';
    } else {
        if (qrImage && qrImage.startsWith('data:')) {
            html += '<img src="' + qrImage + '"><p>Scan QR Bos</p><button onclick="location.reload()">REFRESH</button>';
        } else {
            html += '<p>Loading QR...</p><button onclick="location.reload()">REFRESH</button>';
        }
    }
    html += '</div><script>setTimeout(()=>location.reload(),20000)</script></body></html>';
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('Running ' + PORT));
}
