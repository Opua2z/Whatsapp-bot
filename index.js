const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['Bot', 'Chrome', '1.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (up) => {
        const { connection, lastDisconnect, qr } = up;

        if(qr) {
            console.log('QR CODE:', qr);
            console.log('Go to https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + qr);
        }

        if(connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut;
            console.log('Connection closed, status:', statusCode, 'reconnect:', shouldReconnect);
            if(shouldReconnect) {
                startBot();
            }
        } else if(connection === 'open') {
            console.log('BOT CONNECTED!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if(!msg.message) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const from = msg.key.remoteJid;

        if(text.toLowerCase() === 'hi') {
            await sock.sendMessage(from, { text: 'Hello! Bot is working! 🤖' });
        }
        if(text.toLowerCase() === 'ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓' });
        }
    });
}

startBot();
