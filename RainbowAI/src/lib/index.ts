// Barrel export for lib/ modules

export { apiClient, getApiBaseUrl, callAPI } from './http-client.js';
export {
  whatsappManager,
  initBaileys,
  registerMessageHandler,
  getWhatsAppStatus,
  sendWhatsAppMessage,
  logoutWhatsApp,
  formatPhoneNumber
} from './baileys-client.js';
export type { WhatsAppInstanceStatus } from './baileys-client.js';
export { startBaileysWithSupervision } from './baileys-supervisor.js';
export { startDailyReportScheduler } from './daily-report.js';
export { ReplyThrottle } from './reply-throttle.js';
export { evolutionClient } from './evolution-client.js';
