 const express = require('express');
const app = express();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)? lastDisconnect.error.output.statusCode!== 401 : true;
            if(shouldReconnect) startBot();
        } else if(connection === 'open') {
            console.log('Bot Connected Boss!');
        }
    });
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if(!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if(text.toLowerCase() == "hi"){
            await sock.sendMessage(from, { text: "Hello Boss! Bot is Working!" });
        }
    });
}
app.get('/', (req, res) => res.send('Bot is Running Boss!'));
app.listen(process.env.PORT || 3000, () => console.log('Port Open'));
startBot();
