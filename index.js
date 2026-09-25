const express = require('express');
const app = express();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

app.get('/', (req, res) => {
  res.send('<h1>Whatsapp Bot is Running!</h1><p>Check Render Logs for QR Code</p>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['Bot', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if(qr) {
      console.log('QR CODE:', qr);
      console.log('Go to https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + qr);
    }
    if(connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode!== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if(shouldReconnect) startBot();
    } else if(connection === 'open') {
      console.log('BOT CONNECTED!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if(!msg.message) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const from = msg.key.remoteJid;

    if(text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
      await sock.sendMessage(from, { text: 'Hello Boss! Bot is working 🤖' });
    }
    if(text.toLowerCase() === 'ping') {
      await sock.sendMessage(from, { text: 'Pong! 🏓' });
    }
  });
}

startBot();
