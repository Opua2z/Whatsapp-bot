const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = '';
let isConnected = false;
let sock;
let antilinkOn = true;

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
            console.log('CONNECTED!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;
            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
            const lower = body.toLowerCase();
            if (!body) return;

            if (lower === '.antilink on') {
                antilinkOn = true;
                await sock.sendMessage(from, { text: '✅ Anti-Link ON Strict! Admin er tao delete hobe!' });
                return;
            }
            if (lower === '.antilink off') {
                antilinkOn = false;
                await sock.sendMessage(from, { text: '❌ Anti-Link OFF!' });
                return;
            }
            if (lower === '.ping') {
                await sock.sendMessage(from, { text: '✅ Bot Active!' });
                return;
            }

            if (!isGroup ||!antilinkOn) return;
            const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|youtube\.com|youtu\.be)/i.test(body);
            if (!hasLink) return;

            const groupMeta = await sock.groupMetadata(from);
            const myId = sock.user.id.split(':')[0];
            const botIsAdmin = groupMeta.participants.find(p => p.id.includes(myId))?.admin;
            if (!botIsAdmin) return;

            await sock.sendMessage(from, { delete: msg.key });
            await new Promise(r => setTimeout(r, 700));
            await sock.sendMessage(from, { text: '⚠️ ANTI-LINK! @' + sender.split('@')[0] + ' Link Not Allowed! 🚫', mentions: [sender] });
        } catch (e) {
            console.log('Error: ' + e.message);
        }
    });
}

app.get('/', (req, res) => {
    let html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;width:90%;max-width:350px}img{width:260px;background:#fff;padding:8px;border-radius:10px}</style></head><body><div class="card"><h3 style="color:#25D366;">SWEET Family Bot</h3>';
    if (isConnected) {
        html += '<h2 style="color:#25D366;">CONNECTED!</h2>';
    } else if (qrImage && qrImage.startsWith('data:')) {
        html += '<img src="' + qrImage + '"><p>Scan QR Bos</p>';
    } else {
        html += '<p>Loading QR... Wait 30s & Refresh</p>';
    }
    html += '<br><button onclick="location.reload()" style="padding:8px 15px;background:#25D366;border:none;border-radius:6px;font-weight:bold">REFRESH</button></div><script>setTimeout(()=>location.reload(),30000)</script></body></html>';
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('Running on ' + PORT));
