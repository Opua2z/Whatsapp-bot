import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';

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
        printQRInTerminal: false
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
            } else {
                isConnected = false;
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

            console.log(`MSG: ${body} | Group: ${isGroup}`);

            // ==== COMMANDS ====
            if (['hi','hii','hello','হাই'].includes(lower)) {
                await sock.sendMessage(from, { text: '🍫 হ্যালো বস! 👋\nআমি SWEET Family Bot Active ✅\n\n.menu লিখো মেনু দেখতে' });
            }

            if (lower === '.menu' || lower === 'menu') {
                await sock.sendMessage(from, { text: `🍰 *SWEET Family BOT* 🍫\n\n*hi* - হ্যালো\n*.menu* - মেনু\n*.ping* - চেক\n*.antilink on/off* - AntiLink\n\n🔗 Anti-Link: ${antilinkOn? 'ON ✅ (Strict)' : 'OFF ❌'}\nগ্রুপে যে লিংক দিবে তারটাই ডিলিট হবে!` });
            }

            if (lower === '.ping' || lower === 'ping') {
                await sock.sendMessage(from, { text: '✅ PONG! Bot Active বস! 🍫' });
            }

            if (lower === '.antilink on' || lower === '. antilink on') {
                antilinkOn = true;
                await sock.sendMessage(from, { text: '✅ *Anti-Link ON করলাম বস! (Strict Mode)*\nএখন Admin এর লিংকও ডিলিট হবে!' });
                return;
            }

            if (lower === '.antilink off' || lower === '. antilink off') {
                antilinkOn = false;
                await sock.sendMessage(from, { text: '❌ Anti-Link OFF করলাম বস!' });
                return;
            }

            // ==== ANTI-LINK STRICT MODE - ADMIN ER TAO DELETE HOBE ====
            if (!isGroup ||!antilinkOn) return;

            const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com)/i.test(body);
            if (!hasLink) return;

            console.log('LINK FOUND! DELETING...');

            const groupMeta = await sock.groupMetadata(from);
            const myNumber = sock.user.id.split(':')[0].split('@')[0];
            const botIsAdmin = groupMeta.participants.find(p => p.id.includes(myNumber))?.admin;

            console.log(`Bot Number: ${myNumber} | Bot Admin: ${botIsAdmin}`);

            if (!botIsAdmin) {
                await sock.sendMessage(from, { text: '❌ বস আমাকে Admin বানাও! Admin না হলে লিংক ডিলিট করতে পারবো না!' });
                return;
            }

            // DELETE - STRICT (Admin hoileo delete)
            await sock.sendMessage(from, { delete: msg.key });
            await new Promise(r => setTimeout(r, 700));
            await sock.sendMessage(from, {
                text: `⚠️ *ANTI-LINK DETECTED!* ⚠️\n\n@${sender.split('@')[0]} বস লিংক নিষিদ্ধ! 🚫\n\n*Link:* ${body.slice(0, 30)}\nআবার দিও না!`,
                mentions: [sender]
            });
            console.log('DELETED SUCCESS!');

        } catch (e) {
            console.log('Error: ' + e.message);
        }
    });
}

app.get('/', (req, res) => {
    let html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%}img{width:280px;height:280px;background:#
