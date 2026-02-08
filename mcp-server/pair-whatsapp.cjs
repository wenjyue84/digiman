/**
 * WhatsApp QR Code Pairing Script - saves QR as PNG to Desktop
 * Usage: node pair-whatsapp.cjs
 */
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');

const QR_PATH = path.join(require('os').homedir(), 'Desktop', 'whatsapp-qr.png');

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./whatsapp-auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['PelangiManager', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await QRCode.toFile(QR_PATH, qr, { scale: 8, margin: 2 });
      console.log(`\nQR code saved to: ${QR_PATH}`);
      console.log('Open it and scan with WhatsApp on +60103084289');
      console.log('(Settings > Linked Devices > Link a Device)\n');
      console.log('Waiting for scan...');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...');
        connectWhatsApp();
      } else {
        console.log('Logged out. Delete ./whatsapp-auth and try again.');
      }
    } else if (connection === 'open') {
      console.log('\nCONNECTED! WhatsApp linked successfully.');
      console.log('Auth saved to ./whatsapp-auth/');
      console.log('You can close this now (Ctrl+C).');
    }
  });
}

connectWhatsApp();
