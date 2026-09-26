// plugins/allFeatures.js - FINAL ALL IN ONE

module.exports = {
  name: "allFeatures",
  async execute(sock, m, args, { isBotAdmin, isSenderAdmin, groupMetadata }) {
    const chatId = m.chat;
    if (!global.db.groups[chatId]) global.db.groups[chatId] = {};
    const cmd = (args[0]||"").toLowerCase();
    const sub = (args[1]||"").toLowerCase();

    if (sub === 'on' || sub === 'off') {
      let on = sub === 'on';
      if (['antilink'].includes(cmd)) global.db.groups[chatId].antilink = on;
      if (['anti18plus','nude'].includes(cmd)) global.db.groups[chatId].anti18 = on;
      if (['antigali'].includes(cmd)) global.db.groups[chatId].antigali = on;
      if (cmd === 'welcome') global.db.groups[chatId].welcome = on;
      if (['goodbye','leave'].includes(cmd)) global.db.groups[chatId].goodbye = on;
      if (cmd === 'autoreact') global.db.groups[chatId].autoreact = on;
      return sock.sendMessage(chatId, { text: `${on?'✅':'❌'} ${cmd} ${sub}!` });
    }

    if (cmd === 'kick') {
      if (!isSenderAdmin) return sock.sendMessage(chatId, { text: "❌ শুধু Admin রা কিক করতে পারবে!" });
      if (!isBotAdmin) return sock.sendMessage(chatId, { text: "❌ বটকে Admin দাও!" });
      let target = m.mentionedJid?.[0];
      if (!target) return sock.sendMessage(chatId, { text: "❌ Ex:.kick @user" });
      await sock.groupParticipantsUpdate(chatId, [target], "remove");
      return sock.sendMessage(chatId, { text: `✅ @${target.split('@')[0]} কে কিক করা হলো`, mentions:[target] });
    }
  },

  async onGroupParticipantsUpdate(sock, update) {
    const { id, participants, action } = update;
    if (!global.db.groups[id]) global.db.groups[id] = {};
    if (action === 'add' && global.db.groups[id].welcome) {
      for (let u of participants) {
        await sock.sendMessage(id, { text: `🌸 Welcome @${u.split('@')[0]} আমাদের গ্রুপে! 🥰\nIntro দেন:\n▫️ নাম:\n▫️ লোকেশন:`, mentions:[u] });
      }
    }
    if (action === 'remove' && global.db.groups[id].goodbye) {
      for (let u of participants) {
        await sock.sendMessage(id, { text: `😔 @${u.split('@')[0]} leave নিলো! 👋`, mentions:[u] });
      }
    }
  },

  async onMessage(sock, m) {
    if (!m.isGroup) return;
    const chatId = m.chat;
    const body = (m.body||"").toLowerCase().trim();
    const meta = await sock.groupMetadata(chatId).catch(()=>null);
    const isSenderAdmin = meta?.participants.find(p=>p.id===m.sender)?.admin;
    const isBotAdmin = meta?.participants.find(p=>p.id===sock.user.id)?.admin;
    if (!global.db.groups[chatId]) return;

    // AUTO REACT ✅
    if (global.db.groups[chatId].autoreact) {
      const emojis = ["❤️","🔥","😂","🥰","✨"];
      await sock.sendMessage(chatId, { react: { text: emojis[Math.floor(Math.random()*emojis.length)], key: m.key } }).catch(()=>{});
    }

    // HI / HELLO REPLY ✅
    if (["hi","hello","hlw","hii","hey","salam","assalamu alaikum","oii"].includes(body)) {
      return sock.sendMessage(chatId, { text: `Hi @${m.sender.split('@')[0]}! কেমন আছো ভাই/আপু? 🥰`, mentions:[m.sender] });
    }

    if (isSenderAdmin) return;

    // ANTI-LINK + KICK ✅
    if (global.db.groups[chatId].antilink && /https?:\/\/|www\.|wa\.me|chat\.whatsapp\.com|t\.me/.test(body)) {
      if(isBotAdmin) {
        await sock.sendMessage(chatId, { delete: m.key }).catch(()=>{});
        await sock.sendMessage(chatId, { text: `❌ @${m.sender.split('@')[0]} লিংক দেওয়ার জন্য কিক!`, mentions:[m.sender] });
        await sock.groupParticipantsUpdate(chatId, [m.sender], "remove").catch(()=>{});
      }
      return;
    }
    // ANTI 18+ ✅
    if (global.db.groups[chatId].anti18 && ["xxx","porn","nude","sex","onlyfans","18+"].some(w=>body.includes(w))) {
      if(isBotAdmin) await sock.sendMessage(chatId, { delete: m.key }).catch(()=>{});
      return;
    }
    // ANTI GALI ✅
    if (global.db.groups[chatId].antigali && ["mc","bc","chud","khanki","magi"].some(w=>body.includes(w))) {
      if(isBotAdmin) await sock.sendMessage(chatId, { delete: m.key }).catch(()=>{});
      return;
    }
  }
}
