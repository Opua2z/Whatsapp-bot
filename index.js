import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'

const app = express()
app.get('/', (req,res) => res.send('Bot Live!'))
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
        console.log("Waiting for pairing...")
        setInterval(async () => {
            if (!sock.authState.creds.registered) {
                try {
                    let code = await sock.requestPairingCode("8801341476952")
                    console.log("==============================")
                    console.log("NEW PAIRING CODE:", code)
                    console.log("==============================")
                } catch(e) {}
            }
        }, 30000)

        setTimeout(async () => {
            let code = await sock.requestPairingCode("8801341476952")
            console.log("==============================")
            console.log("NEW PAIRING CODE:", code)
            console.log("==============================")
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection } = update
        if (connection === 'open') console.log('✅ Bot Connected!')
        if (connection === 'close') startBot()
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const from = msg.key.remoteJid
        if (text.toLowerCase() === 'hi') {
            await sock.sendMessage(from, { text: 'Hello Boss! Bot Working! ✅🔥' })
        }
    })
}
startBot()
