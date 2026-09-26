import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';

const app = express();
const PORT = process.env.PORT || 10000;
let qrCodeData = '';
let sock;
let pairCode = '';

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
            if(shouldReconnect){ 
                qrCodeData = '';
                startBot(); 
            } else { 
                qrCodeData=''; 
                console.log('Logged out');
            }
        }
        if(connection==='open'){ 
            console.log('✅ CONNECTED BOS!'); 
            qrCodeData='CONNECTED';
            pairCode='CONNECTED';
        }
    });

    // BOS AUTO FEATURES
    sock.ev.on('group-participants.update', async (u) => {
        try{ 
            for(let p of u.participants){ 
                if(u.action==='add') await sock.sendMessage(u.id,{text:`*স্বাগতম বস!* 🎉 @${p.split('@')[0]}`,mentions:[p]}); 
            } 
        }catch{}
    });
    
    sock.ev.on('messages.upsert', async ({messages}) => {
        const msg=messages[0]; 
        if(!msg.message||msg.key.fromMe) return; 
        const from=msg.key.remoteJid; 
        if(!from.endsWith('@g.us')) return;
        const body=msg.message.conversation||msg.message.extendedTextMessage?.text||"";
        if(body.includes('http')){ 
            await sock.sendMessage(from,{delete:msg.key}); 
        }
    });
}

app.get('/', async (req,res) => {
    const number = req.query.number;
    
    // Pair code generate
    if(number && sock && qrCodeData !== 'CONNECTED'){
        try{
            let cleanNumber = number.replace(/[^0-9]/g, '');
            if(!cleanNumber.startsWith('880')) cleanNumber = '880' + cleanNumber.replace(/^0/, '');
            pairCode = await sock.requestPairingCode(cleanNumber);
        }catch(e){
            console.log('Pair error', e);
        }
    }

    res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>
    body{background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}
    .card{background:#111;padding:25px;border-radius:20px;text-align:center;border:1px solid #25D366;max-width:350px;width:90%}
    img{width:280px;height:280px;background:#fff;padding:10px;border-radius:15px;margin:15px 0}
    input{padding:12px;width:80%;border-radius:10px;border:none;margin:10px 0;text-align:center;font-size:16px}
    button{padding:12px 25px;background:#25D366;color:#000;border:none;border-radius:10px;font-weight:bold;cursor:pointer}
    .code{font-size:32px;letter-spacing:8px;background:#222;padding:15px;border-radius:10px;color:#25D366;font-weight:bold;margin:15px 0}
    </style></head><body>
    <div class="card">
    <h2 style="color:#25D366">🍫 BOS BOT</h2>
    ${qrCodeData==='' && !pairCode ? '<p>লোড হচ্ছে বস... 10
