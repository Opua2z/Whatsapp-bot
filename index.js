const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const app = express();

app.get('/', (req,res)=>res.send('Sweet Family Bot Running ❤️'));
app.listen(process.env.PORT||3000, ()=>console.log('Server Started'));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u)=>{
    const { connection, qr } = u;
    if(qr) console.log(`QR_LINK: https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qr)}`);
    if(connection==='open') console.log('Sweet Family Connected ❤️');
    if(connection==='close') startBot();
  });

  sock.ev.on('messages.upsert', async (m)=>{
    const msg=m.messages[0];
    if(!msg.message) return;
    const text=msg.message.conversation||msg.message.extendedTextMessage?.text||"";
    if(text.toLowerCase()=='bot') await sock.sendMessage(msg.key.remoteJid,{text:'Ji Boss, Ami achi! Sweet Family er jonno ready ❤️'},{quoted:msg});
  });
}
startBot();
