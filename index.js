import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "22.04.4"]
    })

    if (!sock.authState.creds.registered) {
        const phoneNumber = "8801341476952"
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber)
                console.log(`\n===========================\n Pairing Code: ${code}\n===========================\n`)
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
}
startBot()
