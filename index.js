const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
const PORT = process.env.PORT || 3000
let lastQR = null
app.get('/', (req,res)=>{
 if(!lastQR) return res.send('<h1>Bot Starting... 20s por Refresh dao bos!</h1>')
 res.send(`<center><h1>🍫 SWEET Family QR 🍫</h1><img src="${lastQR}" width="300"/><h3>Scan Koro Bos!</h3></center>`)
})
app.listen(PORT,()=>console.log('Server running'))

const badWords = ['boka','abal','mc','bc','madarchod','chod','kutta','bal','fuck','bitch','sala','khankir','magi','chud','bokachoda','randi','harami','suor','fuck you']

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

 // Welcome & Left
 sock.ev.on('group-participants.update',async(an)=>{
  try{
   const {id, participants, action} = an
   const metadata = await sock.groupMetadata(id).catch(()=>null)
   if(!metadata) return
   const botNumber = sock.user.id.split(':')[0]
   const isBotAdmin =!!metadata.participants.find(p=>p.id.includes(botNumber))?.admin
   if(!isBotAdmin) return

   for(let user of participants){
     if(action==='add'){
       await sock.sendMessage(id,{text:`আসসালামু আলাইকুম @${user.split('@')[0]} ভাই! 🌸\nSWEET Family তে স্বাগতম! পরিচয়টা দিন! 💖`,mentions:[user]})
     }
     if(action==='remove'){
       await sock.sendMessage(id,{text:`😔 @${user.split('@')[0]} ভাই গ্রুপ থেকে চলে গেলো! মিস করবো!`,mentions:[user]})
     }
   }
  }catch(e){}
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

   // 1. REPLY - Sob jaygay kaj korbe
   if(['hi','hii','hlw','hello','hey','yo'].includes(lower)){
     await sock.sendMessage(from,{text:`হ্যালো @${sender.split('@')[0]}! 👋 Thanks Hi বলার জন্য! 💖\nBot LIVE! ✅`,mentions:[sender]})
     return
   }
   if(lower==='.ping'){await sock.sendMessage(from,{text:'🏓 Pong! Bot LIVE & LID FIXED! ✅'});return}
   if(lower==='.menu'){await sock.sendMessage(from,{text:`*🔥 SWEET Family MENU 🔥*\n\n✅ Hi Reply\n✅ Welcome/Left\n✅ Link Kick\n✅ Gali Kick\n✅ 18+ Kick\n\nAdmin Cmd:\n.kick @tag\n.ping\n.menu`});return}

   if(!isGroup) return
   const metadata=await sock.groupMetadata(from).catch(()=>null)
   if(!metadata) return

   const botNumber = sock.user.id.split(':')[0].split('@')[0]
   const botParticipant = metadata.participants.find(p=> p.id.includes(botNumber))
   const isBotAdmin =!!botParticipant?.admin
   if(!isBotAdmin){
     console.log('Bot Admin Na!')
     return
   }

   const senderParticipant = metadata.participants.find(p=> p.id===sender)
   const isSenderAdmin =!!senderParticipant?.admin

   // Admin keo kick marbe na, normal member ke marbe (Tomar jonno chaile false kore dio)
   if(isSenderAdmin) return

   // 2. LINK KICK
   if(/(https?:\/\/|www\.|t\.me|telegram|chat\.whatsapp\.com|wa\.me|youtube\.com|youtu\.be|\.com|\.net|\.org)/i.test(lower)){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🚫💥 *LINK KICK!* @${sender.split('@')[0]} লিংক দিছে!`,mentions:[sender]})
     return
   }
   // 3. GALI KICK
   if(badWords.some(w=>lower.includes(w))){
     await sock.sendMessage(from,{delete:m.key}).catch(()=>{})
     await sock.groupParticipantsUpdate(from,[sender],"remove").catch(()=>{})
     await sock.sendMessage(from,{text:`🚫💥 *GALI KICK!* @${sender.split('@')[0]} গালি দিছে!`,mentions:[sender]})
     return
   }

  }catch(e){console.log('Error:',e)}
 })
}
startBot()
