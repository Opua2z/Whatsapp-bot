import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = '';
let isConnected = false;
let sock;
let antilinkOn = true;

if (!fs.existsSync('auth_info_baileys')) fs.mkdirSync('auth_info_baileys');

async function startBos() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["SWEET Family Bot", "Chrome", "1.0.0"]
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect } = update;
        if (qr) qrImage = await qrcode.toDataURL(qr);
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) { qrImage = ''; startBos(); }
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

            console.log(`MSG: ${body} | Group: ${isGroup}`);

            // ==== WELCOME / HI HELLO - EITA TUMI CHAISILA BOS ====
            if (['hi','hii','hello','hlw','hey','হাই','হ্যালো'].includes(lower)) {
                await sock.sendMessage(from, {
                    text: `🍫 *হ্যালো বস! 👋*\n\nআমি *SWEET Family Bot* Active আছি ✅\n\n👉 *.menu* লিখো মেনু দেখতে\n👉 *.ping* লিখে চেক করো\n\nWelcome to SWEET Family! 🍰`
                });
                return;
            }

            if (lower === '.menu' || lower === 'menu') {
                await sock.sendMessage(from, {
                    text: `🍰 *SWEET Family BOT* 🍫\n\n*hi / hello* - ওয়েলকাম মেসেজ\n*.menu* - এই মেনু\n*.ping* - বট Active কিনা চেক\n*.antilink on* - Anti-Link চালু (Strict)\n*.antilink off* - Anti-Link বন্ধ\n\n🔗 Anti-Link: ${antilinkOn? 'ON ✅ (Admin er tao delete hobe)' : 'OFF ❌'}\n\nBot by SWEET Family ❤️`
                });
                return;
            }

            if (lower === '.ping' || lower === 'ping') {
                await sock.sendMessage(from, { text: `✅ *PONG!* Bot Active বস! 🍫\nAnti-Link: ${antilinkOn? 'ON' : 'OFF'}` });
                return;
            }

            if (lower === '.antilink on') {
                antilinkOn = true;
                await sock.sendMessage(from, { text: '✅ *Anti-Link ON করলাম বস! (Strict Mode)*\nএখন Admin এর লিংকও ডিলিট হবে! 🚫' });
                return;
            }

            if (lower === '.antilink off') {
                antilinkOn = false;
                await sock.sendMessage(from, { text: '❌ Anti-Link OFF করলাম বস!' });
                return;
            }

            // ==== STRICT ANTI-LINK - ADMIN ER TAO DELETE ====
            if (!isGroup ||!antilinkOn) return;
            const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|youtube\.com|youtu\.be|facebook\.com|instagram\.com)/i.test(body);
            if (!hasLink) return;

            console.log('LINK FOUND! CHECKING ADMIN...');
            const groupMeta = await sock.groupMetadata(from);
            const myNumber = sock.user.id.split(':')[0].split('@')[0];

            let botIsAdmin = false;
            for (const p of groupMeta.participants) {
                if (p.id.includes(myNumber)) {
                    if (p.admin === 'admin' || p.admin === 'superadmin') botIsAdmin = true;
                    break;
                }
            }

            console.log(`Bot: ${myNumber} | IsAdmin: ${botIsAdmin}`);

            if (!botIsAdmin) {
                await sock.sendMessage(from, { text: '❌ বস আমাকে Admin বানাও! Admin না হলে লিংক ডিলিট করতে পারবো না! 🙏' });
                return;
            }

            await sock.sendMessage(from, { delete: msg.key });
            await new Promise(r => setTimeout(r, 800));
            await sock.sendMessage(from, {
                text: `⚠️ *ANTI-LINK DETECTED!* ⚠️\n\n@${sender.split('@')[0]} বস লিংক নিষিদ্ধ! 🚫\n\nএই গ্রুপে লিংক দেওয়া যাবে না!\nআবার দিও না!`,
                mentions: [sender]
            });
            console.log('DELETED SUCCESS!');

        } catch (e) {
            console.log('Error: ' + e.message);
        }
    });
}

app.get('/', (req, res) => {
    let html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%}img{width:280px;height:280px;background:#fff;padding:10px;border-radius:12px;margin:15px 0}button{padding:10px 20px;background:#25D366;border:none;border-radius:8px;font-weight:bold;cursor:pointer}</style></head><body><div class="card"><h2 style="color:#25D366;">SWEET Family Bot</h2>`;
    if (isConnected) {
        html += `<h1 style="color:#25D366;">CONNECTED! ✅</h1><p>Anti-Link: ${antilinkOn? 'ON Strict' : 'OFF'}<br>hi/hello kaj korbe!</p>`;
    } else {
        if (qrImage && qrImage.startsWith('data:')) {
            html += `<img src="${qrImage}"><p>Scan QR Bos</p><button onclick="location.reload()">REFRESH</button>`;
        } else {
            html += `<p>Loading QR... 30s wait</p><button onclick="location.reload()">REFRESH</button>`;
        }
    }
    html += `</div><script>setTimeout(()=>location.reload(),25000)</script></body></html>`;
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('Running on ' + PORT));
