import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';

const app = express();
const PORT = process.env.PORT || 10000;
let qrCodeData = '';
let sock;

async function startBot() {
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
        if(qr){
            qrCodeData = await qrcode.toDataURL(qr);
            console.log('QR Generated');
        }
        if(connection==='close'){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut;
            if(shouldReconnect){ startBot(); } else { qrCodeData=''; }
        }
        if(connection==='open'){ console.log('✅ CONNECTED BOS!'); qrCodeData='CONNECTED'; }
    });

    // BOS FEATURES
    sock.ev.on('group-participants.update', async (u) => {
        try{ for(let p of u.participants){ if(u.action==='add') await sock.sendMessage(u.id,{text:`*স্বাগতম বস!* 🎉 @${p.split('@')[0]}`,mentions:[p]}); } }catch{}
    });
    sock.ev.on('messages.upsert', async ({messages}) => {
        const msg=messages[0]; if(!msg.message||msg.key.fromMe) return; const from=msg.key.remoteJid; if(!from.endsWith('@g.us')) return;
        const body=msg.message.conversation||msg.message.extendedTextMessage?.text||"";
        if(body.includes('http')){ await sock.sendMessage(from,{delete:msg.key}); }
    });
}

app.get('/', async (req,res) => {
    res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>
    body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif}
    .card{background:#111;padding:30px;border-radius:20px;text-align:center;border:1px solid #25D366}
    img{width:300px;height:300px;background:#fff;padding:10px;border-radius:15px}
    </style></head><body>
    <div class="card">
    <h2 style="color:#25D366">🍫 BOS BOT - QR SCAN</h2>
    ${qrCodeData==='' ? '<p>QR লোড হচ্ছে বস... 10 সেকেন্ড অপেক্ষা করো আর রিফ্রেশ দাও</p>' : ''}
    ${qrCodeData==='CONNECTED' ? '<h
