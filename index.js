const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
const PORT = process.env.PORT || 3000

let lastQR = null

app.get('/', async (req, res) => {
    if(!lastQR){
        return res.send('<h1 style="text-align:center;margin-top:100px">Bot চালু হচ্ছে বস... 20 সেকেন্ড পর Refresh দাও! 🔄<br>Log এ QR READY লেখা আসলেই এখানে QR আসবে</h1>')
    }
    res.send(`<center style="margin-top:30px"><h1>🍫 SWEET Family Bot QR 🍫</h1><img src="${lastQR}" width="300" style="border:8px solid black;border-radius:20px"/><h3>WhatsApp > Linked Devices > Link a Device > Scan করো</h3></center>`)
})
app.listen(PORT, () => console.log('Server running'))

async function startBot() {
    const baileys = await import('@whiskeysockets/baileys')
    const makeWASocket = baileys.default
    const { useMultiFileAuthState, DisconnectReason } = baileys
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({ logger: P({ level: 'silent' }), auth: state, printQRInTerminal: false, browser: ["SWEET Family","Chrome","1.0"] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u
        if(qr){
            lastQR = await QRCode.toDataURL(qr)
            console.log('✅ QR READY! Link এ যাও: https://whatsapp-bot-r03g.onrender.com')
        }
        if(connection === 'open'){ lastQR = null; console.log('✅ CONNECTED! ✅') }
        if(connection === 'close' && lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot()
    })
    // তোমার সব ফিচার আগের মতোই থাকবে
    sock.ev.on('group-participants.update', async (anu) => {
        try{
            for(let p of anu.participants){
                if(anu.action === 'add'){
                    await sock.sendMessage(anu.id, { text: `*── SWEET Family তে স্বাগতম ──* 🍫\n\nআসসালামু আলাইকুম @${p.split('@')[0]} ভাই! 💖\nপরিচয়টা দিন প্লিজ?`, mentions:[p] })
                }
            }
        }catch{}
    })
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try{
            const m = messages[0]
            if(!m.message || m.key.fromMe) return
            const from = m.key.remoteJid
            if(!from.endsWith('@g.us')) return
            const sender = m.key.participant || from
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim().toLowerCase()
            const metadata = await sock.groupMetadata(from).catch(()=>null)
            if(!metadata) return
            const isBotAdmin =!!metadata.participants.find(p=>p.id===sock.user.id)?.admin
            const isSenderAdmin =!!metadata.participants.find(p=>p.id===sender)?.admin
            if(!isBotAdmin) return
            if(/(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me)/i.test(text) &&!isSenderAdmin){
                await sock.sendMessage(from, { delete: m.key }).catch(()=>{})
                await sock.groupParticipantsUpdate(from, [sender], "remove").catch(()=>{})
            }
            if(['hi','hello','hii'].includes(text)){
                await sock.sendMessage(from, { text: `হ্যালো @${sender.split('@')[0]}! 👋 Thanks! 💖`, mentions:[sender] })
            }
            if(text === '.ping') await sock.sendMessage(from, { text:'🏓 Pong! LIVE! ✅' })
        }catch(e){ console.log(e) }
    })
}
startBot()
