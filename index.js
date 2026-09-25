import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'

const app = express()
app.get('/', (req,res) => res.send('Bot is Live!'))
app.listen(process.env.PORT || 10000)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "22.04.4"]
    })

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode("8801341476952")
            console.log("PAIRING CODE:", code)
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ Bot Connected!')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0]
            if (!msg.message || msg.key.fromMe) return
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
            const from = msg.key.remoteJid
            console.log("New Message:", text)
            if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
                await sock.sendMessage(from, { text: 'Hello Boss! 👋 Bot is Working! ✅' })
            }
            else if (text.toLowerCase() === 'ping') {
                await sock.sendMessage(from, { text: 'Pong! 🏓 Bot Active!' })
            }
        } catch (e) { console.log(e) }
    })
}
startBot()
