import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.resolve(__dirname, '../../whatsapp-auth');

let sock: ReturnType<typeof makeWASocket> | null = null;
let currentState: string = 'close';
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export async function initBaileys(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['PelangiManager', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update;

    if (connection) currentState = connection;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        const delay = reconnectTimeout ? 5000 : 2000;
        console.log(`WhatsApp disconnected (code: ${statusCode}), reconnecting in ${delay}ms...`);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          initBaileys();
        }, delay);
      } else {
        console.error('WhatsApp logged out. Delete whatsapp-auth/ and run: node pair-whatsapp.cjs');
      }
    } else if (connection === 'open') {
      const user = (sock as any)?.user;
      console.log(`WhatsApp connected: ${user?.name || 'Unknown'} (${user?.id?.split(':')[0] || '?'})`);
    }
  });
}

export function getWhatsAppStatus(): { state: string; user: any; authDir: string } {
  const user = (sock as any)?.user;
  return {
    state: currentState,
    user: user ? {
      name: user.name,
      id: user.id,
      phone: user.id?.split(':')[0]
    } : null,
    authDir: AUTH_DIR
  };
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function sendWhatsAppMessage(phone: string, text: string): Promise<any> {
  if (!sock || currentState !== 'open') {
    throw new Error('WhatsApp not connected. Check status with pelangi_whatsapp_status.');
  }
  const jid = `${formatPhoneNumber(phone)}@s.whatsapp.net`;
  return sock.sendMessage(jid, { text });
}
