import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = '';
let isConnected = false;
let sock;

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
            if (shouldReconnect) { qrImage = ''; startBos(); } else { isConnected = false; qrImage = ''; }
        }
        if (connection === 'open') { isConnected = true; qrImage = 'CONNECTED'; console.log('BOS CONNECTED'); }
    });

    sock.ev.on('group-participants.update', async (u) => {
        try {
            for (let p of u.participants) {
                if (u.action === 'add') {
                    await sock.sendMessage(u.id, { text: '🍫 *Welcome to SWEET Family!* 🎉\n\nHi @' + p.split('@')[0], mentions: [p] });
                }
            }
        } catch {}
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;
            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();
            const lowerBody = body.toLowerCase();

            if (!body) return;

            // ===== 1. ANTI-LINK SYSTEM BOS =====
            if (isGroup) {
                const linkRegex = /(https?:\/\/|www\.|wa\.me|t\.me|telegram|youtube\.com|youtu\.be|facebook\.com|fb\.com|instagram\.com|chat\.whatsapp\.com)/i;
                if (linkRegex.test(body)) {
                    try {
                        // Check if sender is admin
                        const groupMeta = await sock.groupMetadata(from);
                        const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
                        const botIsAdmin = groupMeta.participants.find(p => p.id === sock.user.id)?.admin;

                        if (!isAdmin && botIsAdmin) {
                            // Delete link message
                            await sock.sendMessage(from, { delete: msg.key });
                            // Warning
                            await sock.sendMessage(from, {
                                text: `⚠️ *LINK DETECTED BOS!* ⚠️\n\n@${sender.split('@')[0]} লিংক পাঠাইছো!\n\n🚫 *SWEET Family তে লিংক নিষিদ্ধ!*\nআবার দিলে কিক খাবা!`,
                                mentions: [sender]
                            });
                            return;
                        }
                    } catch (e) { console.log('AntiLink Error: ' + e.message); }
                }
            }

            // ===== 2. HI / MENU SYSTEM =====
            if (lowerBody === 'hi' || lowerBody === 'hii' || lowerBody === 'hello' || lowerBody === 'হাই') {
                await sock.sendMessage(from, { text: '🍫 *হ্যালো বস!* 👋\nআমি SWEET Family Bot Active! \n\nলিখো *.menu*' });
            }
            if (lowerBody === '.menu' || lowerBody === 'menu') {
                await sock.sendMessage(from, { text: `🍰 *SWEET Family BOT MENU* 🍫\n\n*hi* - Hello\n*.menu* - Menu\n*.ping* - Active Check\n\n*🔗 ANTI-LINK:* ON ✅\nগ্রুপে লিংক দিলে অটো ডিলিট + ওয়ার্নিং দিবে!` });
            }
            if (lowerBody === '.ping') {
                await sock.sendMessage(from, { text: '✅ *PONG!* Bot Active বস! 🍫' });
            }

        } catch (e) { console.log(e); }
    });
}

app.get('/', (req, res) => {
    let html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%}img{width:280px;height:280px;background:#fff;padding:10px;border-radius:12px;margin:15px 0}button{padding:10px 20px;background:#25D366;border:none;border-radius:8px;font-weight:bold;cursor:pointer}</style></head><body><div class="card"><h2 style="color:#25D366;">SWEET Family Bot</h2>';
    if (isConnected || qrImage === 'CONNECTED') {
        html += '<h1 style="color:#25D366;">CONNECTED BOS!</h1><p>Anti-Link ON ✅</p><p>Hi /.menu লিখে টেস্ট করো!</p>';
    } else {
        if (qrImage && qrImage.startsWith('data:')) {
            html += '<img src="' + qrImage + '"><p>Scan QR</p><button onclick="location.reload()">REFRESH</button>';
        } else {
            html += '<p>Loading Bos...</p><button onclick="location.reload()">REFRESH</button>';
        }
    }
    html += '</div><script>setTimeout(()=>location.reload(),25000)</script></body></html>';
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('Running ' + PORT));
