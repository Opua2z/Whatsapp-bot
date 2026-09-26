const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
app.get('/', (req, res) => res.send('<h1>SWEET Family Bot CONNECTED! ✅</h1>'))
app.listen(PORT, () => console.log('Server running'))

const badWords = ['boka','abal','mc','bc','madarchod','chod','kutta','bal','fuck','bitch','sala','khankir','magi','chud','bokachoda','randi','harami','suor','mcd','bcd','chuda','khanki']
const adultWords = ['xxx','porn','nude','sex','18+','onlyfans','xvideo','xnxx']

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({ logger: P({ level: 'silent' }), auth: state, browser: ["SWEET Family","Chrome","1.0"], printQRInTerminal: true })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u
        if(connection === 'open') console.log('✅ CONNECTED!')
        if(connection === 'close' && lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot()
    })

    // WELCOME + LEFT + INTRO
    sock.ev.on('group-participants.update', async (anu) => {
        try{
            for(let p of anu.participants){
                if(anu.action === 'add'){
                    await sock.sendMessage(anu.id, {
                        text: `*── SWEET Family তে স্বাগতম ──* 🍫\n\nআসসালামু আলাইকুম @${p.split('@')[0]} ভাই! 💖\n\nআমাদের *SWEET Family* পরিবারে আপনাকে স্বাগতম!\n\n👋 আপনার *পরিচয়টা* দিন প্লিজ?\n📍 নাম? কোথা থেকে? কি করেন?\n\n📌 *নিয়ম:*\n1. লিংক ❌ = Kick\n2. গালি ❌ = Kick\n3. 18+ ❌ = Kick\n4. ভদ্রতা ✅`,
                        mentions:[p]
                    })
                }
                if(anu.action === 'remove'){
                    await sock.sendMessage(anu.id, { text: `😔 @${p.split('@')[0]} ভাই SWEET Family থেকে চলে গেলো! আমরা তাকে খুব মিস করবো! 💔 তাকে ছাড়া গ্রুপটা ফাঁকা লাগছে!`, mentions:[p] })
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
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "").trim()
            const lowerText = text.toLowerCase()
            const type = Object.keys(m.message)[0]

            const metadata = await sock.groupMetadata(from).catch(()=>null)
            if(!metadata) return
            const isBotAdmin =!!metadata.participants.find(p=>p.id===sock.user.id)?.admin
            const isSenderAdmin =!!metadata.participants.find(p=>p.id===sender)?.admin
            const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
            if(!isBotAdmin) return

            // 1. ANTI-LINK = DIRECT KICK
            if(/(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|\.com|\.xyz|\.net|\.org|bit\.ly)/i.test(lowerText) &&!isSenderAdmin){
                await sock.sendMessage(from, { delete: m.key }).catch(()=>{})
                await sock.groupParticipantsUpdate(from, [sender], "remove").catch(()=>{})
                await sock.sendMessage(from, { text: `🚫💥 *LINK KICK!* @${sender.split('@')[0]} লিংক দেওয়ার জন্য Direct KICK! 👢`, mentions:[sender] })
                return
            }
            // 2. ANTI-GALI = DIRECT KICK
            if(badWords.some(w=>lowerText.includes(w)) &&!isSenderAdmin){
                await sock.sendMessage(from, { delete: m.key }).catch(()=>{})
                await sock.groupParticipantsUpdate(from, [sender], "remove").catch(()=>{})
                await sock.sendMessage(from, { text: `🚫💥 *GALI KICK!* @${sender.split('@')[0]} গালি দেওয়ার জন্য Direct KICK! 👢`, mentions:[sender] })
                return
            }
            // 3. ANTI-18+ = DIRECT KICK
            if(adultWords.some(w=>lowerText.includes(w)) &&!isSenderAdmin && ['imageMessage','videoMessage'].includes(type)){
                await sock.sendMessage(from, { delete: m.key }).catch(()=>{})
                await sock.groupParticipantsUpdate(from, [sender], "remove").catch(()=>{})
                await sock.sendMessage(from, { text: `🔞💥 *18+ KICK!* @${sender.split('@')[0]} 18+ দেওয়ার জন্য Direct KICK! 👢`, mentions:[sender] })
                return
            }

            // 4. HI / HELLO = EVERYONE THANKS WITH MENTION
            if(['hi','hii','hlw','hlo','hello','hey'].includes(lowerText)){
                await sock.sendMessage(from, { text: `হ্যালো @${sender.split('@')[0]}! 👋\n\n💖 *Thanks আমাকে Hi/Hello বলার জন্য!* 🍫\nSWEET Family এর পক্ষ থেকে অনেক অনেক Thanks! 🙏`, mentions:[sender] })
                return
            }

            // 5. ONLY ADMIN CAN CONTROL
            if(!isSenderAdmin) return

            if(lowerText.startsWith('.kick')){
                if(!mentioned[0]) return sock.sendMessage(from, { text:'❌.kick @নাম এভাবে লিখো বস!' })
                await sock.groupParticipantsUpdate(from, mentioned, "remove").catch(()=>{})
                await sock.sendMessage(from, { text:`✅ @${mentioned[0].split('@')[0]} কে KICK মারা হয়েছে! 👢`, mentions:mentioned })
            }
            if(lowerText === '.menu'){
                await sock.sendMessage(from, { text:`*🔥 SWEET Family - FINAL 🔥*\n\n*সবার জন্য:*\nhi/hello -> Thanks + Mention ✅\nJoin -> Welcome + Mention + পরিচয় ✅\nLeft -> দুঃখ প্রকাশ ✅\n\n*Auto Kick (Admin বাদে):*\nLink -> Direct Kick ✅\nGali -> Direct Kick ✅\n18+ -> Direct Kick ✅\n\n*🔐 শুধু Admin:*\n.kick @user\n.menu\n.ping\n\n*SWEET Family 🍫*` })
            }
            if(lowerText === '.ping') await sock.sendMessage(from, { text:'🏓 Pong! Bot LIVE! Admin Control ON! 🔐' })

        }catch(e){ console.log(e) }
    })
}
startBot()
