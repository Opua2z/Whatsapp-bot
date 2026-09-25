const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 3000;
let sock;

const html = `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>BOS BOT</title>
<style>
body{background:#0a0a0a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#1e1e1e;padding:30px;border-radius:20px;width:340px;text-align:center;border:1px solid #25D366;box-shadow:0 0 30px #25D36633}
h2{color:#25D366} input{width:90%;padding:13px;border-radius:10px;border:none;margin:15px 0;font-size:16px;text-align:center;background:#2a2a2a;color:white}
button{width:95%;padding:13px;background:#25D366;border:none;border-radius:10px;font-size:17px;font-weight:bold;cursor:pointer}
#codeBox{margin-top:20px;font-size:36px;letter-spacing:6px;color:#25D366;font-weight:bold;display:none;background:#000;padding:15px;border-radius:10px}
#timer{color:#ff4444;margin-top:10px;display:none}
</style>
</head>
<body>
<div class="card">
<h2>🍫 BOS FULL BOT</h2>
<input id="phone" type="text" value="8801341476952">
<button onclick="getCode()">GET PAIR CODE</button>
<div id="codeBox"></div>
<div id="timer">20 সেকেন্ডের ভিতরে বসাও!</div>
<p id="status" style="font-size:12px;color:#888;margin-top:15px">Ready বস...</p>
<p style="font-size:11px;color:#666;margin-top:20px">✅ Link Delete | ✅ Welcome | ✅ Kick | ✅ Good Morning</p>
</div>
<script>
async function getCode(){
 let phone=document.getElementById('phone').value;
 document.getElementById('status').innerText="কোড বের হচ্ছে বস...";
 let res=await fetch('/code?number='+phone);
 let data=await res.json();
 if(data.code){
   document.getElementById('codeBox').style.display='block';
   document.getElementById('codeBox').innerText=data.code;
   document.getElementById('timer').style.display='block';
   document.getElementById('status').innerText="WhatsApp > Linked Devices > Link with phone number এ বসাও!";
 } else {
   document.getElementById('status').innerText="Error: "+data.error;
 }
}
</script>
</body>
</html>
`;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state, browser: ["BOS BOT", "Chrome", "1.0.0"] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('group-participants.update', async (u) => {
        try{ for(let p of u.participants){ if(u.action==='add') await sock.sendMessage(u.id,{text:`*স্বাগতম বস!* 🎉 @${p.split('@')[0]}`,mentions:[p]}); if(u.action==='remove') await sock.sendMessage(u.id,{text:`*আহারে!* 😢 @${p.split('@')[0]} বের হয়ে গেলো!`,mentions:[p]}); } }catch{}
    });
    sock.ev.on('messages.upsert', async ({messages}) => {
        try{
            const msg=messages[0]; if(!msg.message||msg.key.fromMe) return; const from=msg.key.remoteJid; if(!from.endsWith('@g.us')) return;
            const body=msg.message.conversation||msg.message.extendedTextMessage?.text||""; const mentions=msg.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
            if(body.includes('http')||body.includes('wa.me')||body.includes('chat.whatsapp.com')){ await sock.sendMessage(from,{delete:msg.key}); await sock.sendMessage(from,{text:`*লিংক ডিলিট!* 🚫 @${msg.key.participant.split('@')[0]}`,mentions:[msg.key.participant]}); }
            const botNum=sock.user.id.split(':')[0]+'@s.whatsapp.net'; const isMention=mentions.includes(botNum);
            if(isMention && body.toLowerCase().includes('kick')){ let target=mentions.find(j=>j!==botNum); if(target){ await sock.groupParticipantsUpdate(from,[target],"remove"); await sock.sendMessage(from,{text:`*কিক ডান বস!* 👢 @${target.split('@')[0]}`,mentions:[target]}); } }
        }catch{}
    });
    sock.ev.on('connection.update', ({connection,lastDisconnect}) => { if(connection==='close' && lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) startBot(); if(connection==='open') console.log('✅ CONNECTED'); });
}

app.get('/', (req,res) => res.send(html));
app.get('/code', async (req,res) => {
    let number=req.query.number?.replace(/[^0-9]/g,''); try{ let code=await sock.requestPairingCode(number); console.log(`🍫 CODE: ${code}`); res.json({code}); }catch(e){ res.json({error:e.message}); }
});

cron.schedule('0 7 * * *', async () => { if(!sock) return; try{ const groups=await sock.groupFetchAllParticipating(); for(let id of Object.keys(groups)){ await sock.sendMessage(id,{text:`*Good Morning বসরা!* ☀️🍫\nসকাল ৭টা! নতুন দিন শুরু বস!`}); await new Promise(r=>setTimeout(r,2000)); } }catch{} }, {timezone:"Asia/Dhaka"});

startBot();
app.listen(PORT, ()=>console.log(`Server on ${PORT}`));
