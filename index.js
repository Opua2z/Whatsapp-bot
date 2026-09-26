const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
const PORT = process.env.PORT || 3000
let lastQR = null
app.get('/', (req,res)=>{
 if(!lastQR) return res.send('<h1>Bot Starting... 20s por Refresh dao bos!</h1>')
 res.send(`<center><h1>🍫 SWEET FAMILY BOT LIVE 🍫</h1><img src="${lastQR}" width="300"/></center>`)
})
app.listen(PORT,()=>console.log('Server running'))

const badWords = ['boka','mc','bc','madarchod','kutta','fuck','bitch','magi','randi','harami','chud']
const nsfwWords = ['porn','xxx','sex','18+','nudes','onlyfans','xvideo','xnxx']

async function startBot(){
 const baileys = await import('@whiskeysockets/baileys')
 const makeWASocket = baileys.default
 const {useMultiFileAuthState,DisconnectReason}=baileys
 const {state,saveCreds}=await useMultiFileAuthState('auth_info_baileys')
 const sock=makeWASocket({logger:P({level:'silent'}),auth:state,browser:["SWEET","Chrome","1.0"]})
 sock.ev.on('creds.update',saveCreds)
 sock.ev.on('connection.update',async(u)=>{
  const {connection,lastDisconnect,qr}=u
  if(qr) lastQR=await QRCode.toDataURL(qr)
  if(connection==='open'){lastQR=null;console.log('✅ CONNECTED BOS!')}
  if(connection==='close'&&lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) startBot()
 })

 // --- WELCOME / LEAVE - NO ADMIN CHECK - 100% WORKING ---
 sock.ev.on('group-participants.update',async(an)=>{
  try{
   const {id, participants, action} = an
   console.log('EVENT:',action,participants)
   for(let user of participants){
     if(action==='add'){
       await new Promise(r=>setTimeout(r,1200))
       await sock.sendMessage(id,{text:`🌸 আসসালামু আলাইকুম @${user.split('@')[0]} ভাই! SWEET Family তে স্বাগতম! 💖`,mentions:[user]})
     }
     if(action==='remove'){
       await sock.sendMessage(id,{text:`😔 @${user.split('@')[0]} ভাই চলে গেলো!`,mentions:[user]})
     }
   }
  }catch(e){console.log(e)}
 })

 sock.ev.on('messages.upsert',async({messages})=>{
  try{
   const m=messages[0]
   if(!m.message||m.key.fromMe) return
   const from=m.key.remoteJid
   const sender=m.key.participant||from
   const text=(m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||"").trim()
   const lower=text.toLowerCase()
   const isGroup=from.endsWith('@g.us')

   // Hi Reply
   if(['hi','hii','hlw','hello','hey','yo'].includes(lower)){
     await sock.sendMessage(from,{text:`হ্যালো @${sender.split('@')[0]}! 👋 Thanks Hi! Bot LIVE! ✅`,mentions:[sender]})
     return
   }
   if(lower==='.ping'){await sock.sendMessage(from,{text:'🏓 Pong! Bot LIVE! ✅'});return}
   if(lower==='.live'){await sock.sendMessage(from,{text:'✅ Bot LIVE আছে বস!'});return}
   if(lower==='.menu'){await sock.sendMessage(from,{text:`*🔥 MENU 🔥*\n👋 Hi Reply\n🌸 Welcome/Leave\n🚫 Link Kick\n🤬 Gali Kick\n🔞 18+ Kick\n.kick @tag`});return}

   //.kick Command - LID FIXED
   if(lower.startsWith('.kick')){
     const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
     if(mentioned.length===0){await sock.sendMessage(from,{text:'❌ @Tag করো বস!'});return}
     for(let user of mentioned){
       await sock.groupParticipantsUpdate(from,[user],"remove").catch(e=>console.log(e))
       await sock.sendMessage(from,{text:`🚫 @${user.split('@')[0]} Kick Done!`,mentions:[user]})
     }
     return
   }

   if(!isGroup) return
   const metadata=await sock.groupMetadata(from).catch(()=>null)
   if(!metadata) return
   const senderPart = metadata.participants.find(p=>p.id===sender)
   const isSenderAdmin =!!senderPart?.admin
   if(isSenderAdmin) return // Admin ke kick na

   // LINK KICK - FORCE
   if(/(https?:\/\/|www\.|t\.me|telegram|\.com|\.net)/i.test(lower)){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await new Promise(r=>setTimeout(r,800))
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🚫💥 LINK KICK! @${sender.split('@')[0]}`,mentions:[sender]})
     return
   }
   if(badWords.some(w=>lower.includes(w)) || nsfwWords.some(w=>lower.includes(w))){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🚫 KICK! @${sender.split('@')[0]}`,mentions:[sender]})
   }
  }catch(e){console.log(e)}
 })
}
startBot()
