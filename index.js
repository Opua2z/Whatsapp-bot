import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = '';
let isConnected = false;
let sock;
let antilinkOn = true; // ON by default

async function startBos() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["SWEET Family Bot", "Chrome", "1.0.0"],
        printQRInTerminal: false
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect } = update;
        if (qr) { qrImage = await qrcode.toDataURL(qr); }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) { qrImage = ''; startBos(); } else { isConnected = false; }
        }
        if (connection === 'open') { isConnected = true; qrImage = 'CONNECTED'; console.log('BOS CONNECTED'); }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || msg.key.remoteJid;
            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();
            const lower = body.toLowerCase();
            if (!body) return;

            console.log(`MSG from ${sender} in ${from}: ${body}`);

            // --- COMMANDS (Inbox + Group both work) ---
            if (lower === 'hi' || lower === 'hii' || lower === 'hello' || lower === 'হাই') {
                await sock.sendMessage(from, { text: '🍫 হ্যালো বস! 👋\nআমি SWEET Family Bot Active!\n\nলিখো *.menu*' });
            }
            if (lower === '.menu' || lower === 'menu') {
                await sock.sendMessage(from, { text: `🍰 *SWEET Family BOT MENU* 🍫\n\nhi - Hello\n.menu - Menu\n.ping - Active Check\n\n🔗 *ANTI-LINK:* ${antilinkOn? 'ON ✅' : 'OFF ❌'}\nগ্রুপে লিংক দিলে অটো ডিলিট + ওয়ার্নিং!\n\n*.antilink on/off* - AntiLink চালু/বন্ধ` });
            }
            if (lower === '.ping' || lower === 'ping') {
                await sock.sendMessage(from, { text: '✅ PONG! Bot Active বস! 🍫' });
            }
            if (lower === '.antilink on') {
                antilinkOn = true;
                await sock.sendMessage(from, { text: '✅ Anti-Link ON করলাম বস!' });
                return;
            }
            if (lower === '.antilink off') {
                antilinkOn = false;
                await sock.sendMessage(from, { text: '❌ Anti-Link OFF করলাম বস!' });
                return;
            }

            // --- ANTI-LINK ONLY FOR GROUP ---
            if (!isGroup ||!antilinkOn) return;

            const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|youtube\.com|youtu\.be|facebook\.com|instagram\.com)/i.test(body);
            if (!hasLink) return;

            console.log('LINK FOUND IN GROUP!');

            // Group info
            const groupMeta = await sock.groupMetadata(from);
            const myId = sock.user.id; // e.g 8801341476952:13@s.whatsapp.net
            const myNumber = myId.split(':')[0].split('@')[0]; // 8801341476952

            const senderIsAdmin = groupMeta.participants.find(p => p.id === sender)?.admin!== undefined;
            const botParticipant = groupMeta.participants.find(p => p.id.includes(myNumber));
            const botIsAdmin = botParticipant?.admin!== undefined;

            console.log(`Sender: ${sender} Admin: ${senderIsAdmin} | BotNum: ${myNumber} BotAdmin: ${botIsAdmin}`);

            if (senderIsAdmin) {
                console.log('Admin sent link, skip');
                return;
            }

            if (!botIsAdmin) {
                console.log('Bot not admin');
                await sock.sendMessage(from, { text: '❌ বস আমাকে Admin বানাও নাই! তাই লিংক ডিলিট করতে পারছি না!\n\nগ্রুপ Info > Add Admin > আমাকে Admin দাও!' });
                return;
            }

            // DELETE + WARN
            try {
                await sock.sendMessage(from, { delete: msg.key });
                await new Promise(r => setTimeout(r, 800));
                await sock.sendMessage(from, {
                    text: `⚠️ *ANTI-LINK DETECTED!* ⚠️\n\n@${sender.split('@')[0]} লিংক পাঠাইছো বস!\n\n🚫 SWEET Family তে লিংক নিষিদ্ধ!\nআবার দিলে কিক খাবা!`,
                    mentions: [sender]
                });
                console.log('LINK DELETED SUCCESS');
            } catch (e) {
                console.log('Delete Failed: ' + e.message);
                await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]} লিংক দিছে! ডিলিট করতে পারি নাই, Admin দাও!`, mentions: [sender] });
            }

        } catch (e) {
            console.log('Main Error: ' + e.message);
        }
    });
}

app.get('/', (req, res) => {
    let html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%}img{width:280px;height:280px;background:#fff;padding:10px;border-radius:12px;margin:15px 0}button{padding:10px 20px;background:#25D366;border:none;border-radius:8px;font-weight:bold}</style></head><body><div class="card"><h2 style="color:#25D366;">SWEET Family Bot</h2>`;
    if (isConnected || qrImage === 'CONNECTED') {
        html += `<h1 style="color:#25D366;">CONNECTED!</h1><p>Anti-Link: ${antilinkOn? 'ON ✅' : 'OFF'}</p>`;
    } else {
        if (qrImage && qrImage.startsWith('data:')) {
            html += `<img src="${qrImage}"><p>Scan QR</p><button onclick="location.reload()">REFRESH</button>`;
        } else {
            html += `<p>Loading...</p><button onclick="location.reload()">REFRESH</button>`;
        }
    }
    html += `</div><script>setTimeout(()=>location.reload(),25000)</script></body></html>`;
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('Running ' + PORT));
