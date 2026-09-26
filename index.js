const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
const PORT = process.env.PORT || 3000
let lastQR = null

app.get('/', (req,res)=>{
 if(!lastQR) return res.send('<h1>Bot Starting... 20s por Refresh dao bos!</h1>')
 res.send(`<center><h1>🍫 SWEET FAMILY BOT LIVE 🍫</h1><img src="${lastQR}" width="300"/><h3>QR Scan Koro Bos!</h3></center>`)
})
app.listen(PORT,()=>console.log('Server running on',PORT))

// --- WORD LIST ---
const badWords = ['boka','abal','mc','bc','madarchod','chod','kutta','bal','fuck','bitch','sala','khankir','magi','chud','bokachoda','randi','harami']
const nsfwWords = ['porn','xxx','sex video','18+','nudes','onlyfans','xvideo','xnxx','sex.com']

async function startBot(){
 const baileys = await import('@whiskeysockets/baileys')
 const makeWASocket = baileys.default
 const {useMultiFileAuthState,DisconnectReason}=baileys
 const {state,saveCreds}=await useMultiFileAuthState('auth_info_baileys')
 const sock=makeWASocket({logger:P({level:'silent'}),auth:state,printQRInTerminal:false,browser:["SWEET Family","Chrome","1.0"]})

 sock.ev.on('creds.update',saveCreds)
 sock.ev.on('connection.update',async(u)=>{
  const {connection,lastDisconnect,qr}=u
  if(qr) lastQR=await QRCode.toDataURL(qr)
  if(connection==='open'){lastQR=null;console.log('✅ CONNECTED BOS!')}
  if(connection==='close'&&lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) startBot()
 })

 // --- 1. WELCOME & LEAVE ---
 sock.ev.on('group-participants.update',async(an)=>{
  try{
   const {id, participants, action} = an
   const metadata = await sock.groupMetadata(id).catch(()=>null)
   if(!metadata) return
   const botId = sock.user.id.split(':')[0]
   const isBotAdmin =!!metadata.participants.find(p=>p.id.includes(botId))?.admin
   if(!isBotAdmin) return

   for(let user of participants){
     if(action==='add'){
       await sock.sendMessage(id,{text:`🌸 আসসালামু আলাইকুম @${user.split('@')[0]} ভাই! SWEET Family তে স্বাগতম! 💖`,mentions:[user]})
     }
     if(action==='remove'){
       await sock.sendMessage(id,{text:`😔 @${user.split('@')[0]} ভাই চলে গেলো! মিস করবো! 💔`,mentions:[user]})
     }
   }
  }catch(e){}
 })

 // --- 2. ALL MESSAGE FEATURE ---
 sock.ev.on('messages.upsert',async({messages})=>{
  try{
   const m=messages[0]
   if(!m.message||m.key.fromMe) return
   const from=m.key.remoteJid
   const sender=m.key.participant||from
   const text=(m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||"").trim()
   const lower=text.toLowerCase()
   const isGroup=from.endsWith('@g.us')

   // Hi, Hello Reply
   if(['hi','hii','hlw','hello','hey','yo','hola'].includes(lower)){
     await sock.sendMessage(from,{text:`হ্যালো @${sender.split('@')[0]}! 👋 Thanks Hi বলার জন্য! Bot LIVE! ✅💖`,mentions:[sender]})
     return
   }
   if(lower==='.ping'){await sock.sendMessage(from,{text:'🏓 Pong! Bot LIVE & LID FIXED! ✅'});return}
   if(lower==='.live'){await sock.sendMessage(from,{text:'✅ Bot LIVE আছে বস! সব Feature Active! 🔥'});return}
   if(lower==='.menu'){await sock.sendMessage(from,{text:`*🔥 SWEET Family MENU 🔥*\n\n👋 Hi Reply\n🌸 Welcome/Leave\n🚫 Link Kick\n🤬 Gali Kick\n🔞 18+ Kick\n\nAdmin Cmd:\n.kick @tag\n.ping\n.live`});return}

   //.kick Command
   if(lower.startsWith('.kick')){
     const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
     if(mentioned.length===0){await sock.sendMessage(from,{text:'❌ কাকে Kick মারবো? @Tag করো বস!\nEx:.kick @Ammu'});return}
     const metadata=await sock.groupMetadata(from)
     const botId = sock.user.id.split(':')[0]
     const isBotAdmin =!!metadata.participants.find(p=>p.id.includes(botId))?.admin
     if(!isBotAdmin){await sock.sendMessage(from,{text:'❌ আমি Admin না!'});return}
     for(let user of mentioned){
       if(user.includes(botId)) continue
       await sock.groupParticipantsUpdate(from,[user],"remove").catch(()=>{})
       await sock.sendMessage(from,{text:`🚫💥 @${user.split('@')[0]} কে Kick মারা হলো!`,mentions:[user]})
     }
     return
   }

   if(!isGroup) return
   const metadata=await sock.groupMetadata(from).catch(()=>null)
   if(!metadata) return

   // LID BUG 100% FIXED
   const botId = sock.user.id.split(':')[0]
   const botPart = metadata.participants.find(p=> p.id.includes(botId) || (p.phoneNumber && p.phoneNumber.includes(botId)))
   const isBotAdmin =!!botPart?.admin
   if(!isBotAdmin) return

   const senderPart = metadata.participants.find(p=>p.id===sender)
   const isSenderAdmin =!!senderPart?.admin
   if(isSenderAdmin) return

   // Link Kick
   if(/(https?:\/\/|www\.|t\.me|telegram|chat\.whatsapp\.com|wa\.me|\.com|\.net|\.org)/i.test(lower)){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await new Promise(r=>setTimeout(r,800))
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🚫💥 *LINK KICK!* @${sender.split('@')[0]} লিংক দিছে!`,mentions:[sender]})
     return
   }
   // Gali Kick
   if(badWords.some(w=>lower.includes(w))){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🤬💥 *GALI KICK!* @${sender.split('@')[0]}`,mentions:[sender]})
     return
   }
   // 18+ Kick
   if(nsfwWords.some(w=>lower.includes(w))){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🔞💥 *18+ KICK!* @${sender.split('@')[0]}`,mentions:[sender]})
     return
   }

  }catch(e){console.log('Error:',e)}
 })
}
startBot()
