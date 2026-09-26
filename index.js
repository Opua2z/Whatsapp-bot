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
            console.log('CONNECTED BOS!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;
            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
            const lower = body.toLowerCase
