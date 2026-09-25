import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'

const app = express()
app.get('/', (req,res) => res.send('🍫 Sweet Family Bot is Live! 🍰'))
app.listen(process.env.PORT || 10000, () => console.log("Sweet Family Server Started"))

const PHONE = "8801341476952"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "110.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    if (!state.creds.registered) {
        console.log("Generating Sweet Family Pairing Code...")
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(PHONE)
                console.log("\n==============================")
                console.log(`🍫 SWEET FAMILY CODE: ${code} 🍰`)
                console.log("==============================\n")
            } catch (e) {
                console.log("Pair Error:", e.message)
            }
        }, 5000)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            console.log("QR FOR SWEET FAMILY - SCAN NOW:")
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'open') {
            console.log('✅ SWEET FAMILY BOT CONNECTED! 🍫🍰')
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) setTimeout(startBot, 3000)
            else {
                fs.rmSync('./auth_info', { recursive: true, force: true })
                startBot()
            }
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
            await sock.sendMessage(from, { text: 'Hello! 🍫 Welcome to 🇸‌🇼‌🇪‌🇪‌🇹‌ Family 🍰\n\nBot is Active! ✅🔥' })
        }
    })
}

startBot()
