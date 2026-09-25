import express from 'express';
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Sweet Family Bot Running ❤️ - Opua2z');
});

app.listen(PORT, () => {
  console.log(`Port Open ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', (update) => {
    const { qr } = update;
    if (qr) {
      console.log(`QR_LINK: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
    }
  });
}

startBot();
