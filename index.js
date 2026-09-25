import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'

const app = express()
app.get('/', (req,res) => res.send('Bot Live'))
app.listen(process.env.PORT || 10000)

const PHONE_NUMBER = "8801341476952" // তোমার নাম্বার

async function startBot() {
    // পুরানো জ্যাম ফাইল ডিলিট
    if (fs.existsSync('./auth_info/creds.json')) {
        if (!fs.readFileSync('./auth_info/creds.json','utf8').includes('registered')) {
             fs.rmSync('./auth_info', { recursive: true, force: true })
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Chrome", "Ubuntu", "22.04"]
    })

    if (!sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 4000))
        try {
            let code = await sock.requestPairingCode(PHONE_NUMBER)
            console.log(`\n\n================================\nYOUR PAIRING CODE: ${code}\n================================\n\n`)
        } catch(e) { console.log("Pair Error:", e) }
    }

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', ({connection}) => {
        if (connection === 'open') console.log('✅ CONNECTED!')
        if (connection === 'close') setTimeout(startBot, 3000)
    })
}
startBot()
