import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'

const app = express()
app.get('/', (req,res) => res.send('🍫 Sweet Family Bot is Live! 🍰'))
app.listen(process.env.PORT || 10000)

const PHONE = "8801341476952"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        browser: ["Ubuntu", "Chrome", "110.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    if (!state.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(PHONE)
                console.log(`\n🍫 CODE: ${code} 🍰\n`)
            } catch (e) { console.log(e.message) }
        }, 5000)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) qrcode.generate(qr, { small: true })
        if (connection === 'open') console.log('✅ SWEET FAMILY CONNECTED!')
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
        try {
            const msg = m.messages[0]
            if (!msg.message || msg.key.fromMe) return

            const from = msg.key.remoteJid
            const isGroup = from.endsWith('@g.us')
            const sender = isGroup? msg.key.participant : from
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.groupInviteMessage?.inviteCode || ""

            // ===== 🍰 ANTI-LINK SYSTEM =====
            if (isGroup) {
                const isLink = text.includes('https://') || text.includes('http://') || text.includes('www.') || text.includes('chat.whatsapp.com') || msg.message.groupInviteMessage
                if (isLink) {
                    try {
                        const groupMetadata = await sock.groupMetadata(from)
                        const isSenderAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin
                        const botIsAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin

                        // Admin লিংক দিলে Delete হবে না, Member দিলে হবে
                        if (botIsAdmin &&!isSenderAdmin) {
                            await sock.sendMessage(from, { delete: msg.key })
                            await sock.sendMessage(from, {
                                text: `⚠️ *Anti-Link!* 🍫\n\n@${sender.split('@')[0]} লিংক দেওয়া নিষেধ! 🚫\n\n🇸‌🇼‌🇪‌🇪‌🇹‌ Family Rules মানো! 🍰`,
                                mentions: [sender]
                            })
                            return
                        }
                    } catch(e) { console.log("Anti-link error", e.message) }
                }
            }

            // ===== 🍫 NORMAL COMMANDS =====
            if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
                await sock.sendMessage(from, { text: 'Hello! 🍫 Welcome to 🇸‌🇼‌🇪‌🇪‌🇹‌ Family 🍰\n\nBot is Active! ✅🔥' })
            }

        } catch(e) {}
    })
}
startBot()
