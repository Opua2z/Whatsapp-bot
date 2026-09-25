const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "22.04.4"]
    })

    if (!sock.authState.creds.registered) {
        const phoneNumber = "8801341476952" // তোমার নাম্বার বসানো আছে
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber)
                console.log(`

  Pairing Code: ${code}

WhatsApp > Linked devices > Link with phone number এ এই কোড বসাও
                `)
            } catch (e) {
                console.log("Pairing Code Error:", e)
            }
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ Bot Connected! Paired: true')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        console.log("New message received")
        // তোমার বাকি কমান্ড এখানে
    })
}

startBot()
