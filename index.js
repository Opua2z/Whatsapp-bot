import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
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
        browser: ["BOS BOT", "Chrome", "1.0.0"],
        printQRInTerminal: false
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect } = update;
        if (qr) {
            qrImage = await qrcode.toDataURL(qr);
            console.log('QR Ready');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                qrImage = '';
                startBos();
            } else {
                isConnected = false;
                qrImage = '';
            }
        }
        if (connection === 'open') {
            console.log('BOS CONNECTED');
            isConnected = true;
            qrImage = 'CONNECTED';
        }
    });

    // Features
    sock.ev.on('group-participants.update', async (u) => {
        try {
            for (let p of u.participants) {
                if (u.action === 'add') {
                    await sock.sendMessage(u.id, { text: '*Welcome Bos!* @' + p.split('@')[0], mentions: [p] });
                }
            }
        } catch {}
    });
}

app.get('/', (req, res) => {
    let html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;padding:25px;border-radius:20px;text-align:center;border:2px solid #25D366;max-width:380px;width:90%}img{width:280px;height:280px;background:#fff;padding:10px;border-radius:12px;margin:15px 0}button{padding:10px 20px;background:#25D366;border:none;border-radius:8px;font-weight:bold;cursor:pointer}</style></head><body><div class="card"><h2 style="color:#25D366;">BOS BOT - QR</h2>';

    if (isConnected || qrImage === 'CONNECTED') {
        html += '<h1 style="color:#25D366;">CONNECTED BOS!</h1><p>Bot Active in WhatsApp!</p>';
    } else {
        if (qrImage && qrImage.startsWith('data:')) {
            html += '<img src="' + qrImage + '"><p>WhatsApp > Linked Devices > Link a device > Scan QR</p><p style="font-size:12px;color:#888;">QR 30 sec por expire hobe, refresh dao</p><button onclick="location.reload()">REFRESH QR</button>';
        } else {
            html += '<p>QR Loading Bos... 10 sec por refresh dao</p><button onclick="location.reload()">REFRESH</button>';
        }
    }
    html += '</div><script>setTimeout(()=>location.reload(),25000)</script></body></html>';
    res.send(html);
});

startBos();
app.listen(PORT, () => console.log('Running on ' + PORT));
