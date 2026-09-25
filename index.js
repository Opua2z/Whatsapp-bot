const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
app.get('/', (req, res) => {
    res.send('Bot Running Boss!');
});
app.listen(process.env.PORT || 3000, () => {
    console.log('Server Started');
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        const { connection, qr } = u;
        if (qr) {
            console.log('QR:', qr);
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qr)}`);
        }
        if (connection === 'close') {
            startBot();
        }
        if (connection === 'open') {
            console.log('Connected Boss!');
        }
    });
}

startBot();
