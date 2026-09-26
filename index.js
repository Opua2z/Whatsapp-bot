import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = '';
let isConnected = false;
let sock;
let antilinkOn = true;

if (!fs.existsSync('auth_info_baileys')) fs.mkdirSync('auth_info_baileys');

async function startBos() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["SWEET Family Bot", "Chrome", "1.0.0"]
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect } = update;
        if (qr) qrImage = await qrcode.toDataURL(qr);
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) { qrImage = ''; startBos(); }
        }
        if (connection === 'open') {
            isConnected = true;
            qrImage = 'CONNECTED';
            console.log('BOS CONNECTED!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;
            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();
            const lower = body.toLowerCase();
            if (!body) return;

            if (['hi','hii','hello','hlw','hey','হাই','হ্যালো'].includes(lower)) {
                await sock.sendMessage(from, { text: `🍫 *হ্যালো বস! 👋*\n\nআমি *SWEET Family Bot* Active আছি ✅\n\n👉 *.menu* লিখো মেনু দেখতে\n👉 *.ping* লিখে চেক করো\n\nWelcome to SWEET Family! 🍰` });
                return;
            }
            if (lower === '.menu' || lower === 'menu') {
                await sock.sendMessage(from, { text: `🍰 *SWEET Family BOT* 🍫\n\n*hi / hello* - ওয়েলকাম\n*.menu* - এই মেনু\n*.ping* - Active চেক\n*.antilink on* - Anti-Link ON\n*.antilink off* - Anti-Link OFF\n\nAnti-Link: ${antilinkOn? 'ON ✅' : 'OFF ❌'}` });
                return;
            }
            if (lower === '.ping' || lower === 'ping') {
                await sock.sendMessage(from, { text: `✅ *PONG!* Bot Active বস! 🍫` });
                return;
            }
            if (lower === '.antilink on') {
                antilinkOn = true;
                await sock.sendMessage(from, { text: '✅ *Anti-Link ON! Strict Mode!* Admin er tao delete hobe!' });
                return;
            }
            if (lower === '.antilink off') {
                antilinkOn = false;
                await sock.sendMessage(from, { text: '❌ Anti-Link OFF!' });
                return;
            }

            // ==== FINAL ANTI-LINK - NO ADMIN CHECK, DIRECT DELETE ====
            if (!isGroup ||!antilinkOn) return;
            const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|t\.me|youtube\.com|youtu\.be|facebook\.com|instagram\.com)/i.test(body);
            if (!hasLink) return;

            console.log('LINK FOUND! DIRECT DELETE!');
            try {
                await sock.sendMessage(from, { delete: msg.key });
                await new Promise(r => setTimeout(r, 700));
                await sock.sendMessage(from, {
                    text: `⚠️ *ANTI-LINK DETECTED!* ⚠️\n\n@${sender.split('@')[0]} লিং
