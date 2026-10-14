import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import http from 'http';
import pino from 'pino';
import { Telegraf, Markup } from 'telegraf';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  delay,
} from '@whiskeysockets/baileys';

// ───────────── CONFIG ─────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN manquant (variable d\'environnement)');

// IDs des canaux/groupes Telegram a verifier (ex: -1001234567890,-1009876543210)
// Le bot doit etre ADMIN dans chacun pour pouvoir verifier les membres.
const REQUIRED_CHATS = (process.env.REQUIRED_CHATS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const SUPPORT_URL = process.env.SUPPORT_URL || 'https://t.me/';
const FREE_TRIES = 5;
const DATA_DIR = process.env.DATA_DIR || './data';
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const DB_FILE = path.join(DATA_DIR, 'users.json');

const LINKS = {
  tgChannel: 'https://t.me/+mQ3aQpCsEqI0YmY0',
  tgGroup1: 'https://t.me/+2JDC_Be4_ww1N2Vk',
  tgGroup2: 'https://t.me/+Z-P_xjUgJjU0MjM0',
  waChannel: 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X',
  waGroup: 'https://chat.whatsapp.com/IP0nFB79rMDF0nvFSMXtDR',
};

const BRAND = '☠︎︎༒︎ 𝕊ℍ𝔸𝔻𝕆𝕎 𝕂𝕀ℝ𝔸 𝔹𝕆𝕋 ༒︎☠︎︎';
const FOOTER = '> power by Mr Kira tech 🌐';

fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// ───────────── MINI BASE DE DONNEES ─────────────
let db = { users: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const getUser = (id) => {
  if (!db.users[id]) {
    db.users[id] = { tries: 0, verified: false, joinedAt: Date.now() };
    saveDb();
  }
  return db.users[id];
};

// ───────────── OUTILS ─────────────
const logger = pino({ level: 'silent' });
const bot = new Telegraf(BOT_TOKEN);
const socks = new Map(); // userId -> socket Baileys

const nowStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} / ${p(d.getDate())} / ${p(d.getMonth() + 1)} / ${d.getFullYear()}`;
};

const linkButtons = () => Markup.inlineKeyboard([
  [Markup.button.url('📢 Suivre la chaîne Telegram', LINKS.tgChannel)],
  [Markup.button.url('1️⃣ Rejoindre le groupe 1', LINKS.tgGroup1)],
  [Markup.button.url('2️⃣ Rejoindre le groupe 2', LINKS.tgGroup2)],
  [Markup.button.url('📢 Suivre la chaîne WhatsApp', LINKS.waChannel)],
  [Markup.button.url('🌐 Rejoindre le groupe WhatsApp', LINKS.waGroup)],
]);

async function checkMembership(userId) {
  const missing = [];
  for (const chatId of REQUIRED_CHATS) {
    try {
      const m = await bot.telegram.getChatMember(chatId, userId);
      if (!['member', 'administrator', 'creator'].includes(m.status)) missing.push(chatId);
    } catch {
      missing.push(chatId);
    }
  }
  return missing;
}

// Garde : l'utilisateur doit avoir verifie son acces
async function requireAccess(ctx, next) {
  const u = getUser(ctx.from.id);
  if (u.verified) return next();
  await ctx.reply('🔒 Accès refusé. Tape /start puis clique sur ✅ Vérifier.');
}

// ───────────── WHATSAPP (BAILEYS) ─────────────
async function connectWA(userId, { number = null } = {}) {
  const dir = path.join(SESSIONS_DIR, String(userId));
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  socks.set(userId, sock);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      const jid = sock.user?.id?.split(':')[0];
      await bot.telegram.sendMessage(
        userId,
        `✨━━━━━━━━━━━━━━━━━━━━✨\n🎊🎉 CONGRATULATIONS ! 🎉🎊\n✨━━━━━━━━━━━━━━━━━━━━✨\n\n` +
        `╔══════════════════════════╗\n✅ BOT ➜ Connecté 🤖\n🟢 STATUS ➜ OPEN\n` +
        `📅 DATE ➜ ${nowStr()}\n⚜️ BY ➜ Mr Kira Tech ⚜️\n╚══════════════════════════╝`
      ).catch(() => {});
      if (jid) {
        await sock.sendMessage(`${jid}@s.whatsapp.net`, {
          text: `▉ KIRA TECH SHADOW B0T 🌹▉\n\n✅ BOT ➜ Connecté 🤖\n🟢 STATUS ➜ OPEN\n📅 ${nowStr()}\n\n➠ Auteur : Mr Kira Tech 🌐\n➠ Prefix : [ . ]`,
        }).catch(() => {});
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      socks.delete(userId);

      if (code === DisconnectReason.loggedOut) {
        fs.rmSync(dir, { recursive: true, force: true });
        bot.telegram.sendMessage(userId, '🔌 WhatsApp déconnecté. Refais /pair pour te reconnecter.').catch(() => {});
        return;
      }
      // Reconnexion si deja appaire (ou redemarrage demande apres le pairage)
      if (state.creds.registered || code === DisconnectReason.restartRequired) {
        setTimeout(() => connectWA(userId).catch(console.error), 3000);
      } else {
        fs.rmSync(dir, { recursive: true, force: true });
        bot.telegram.sendMessage(userId, '⌛ Pairage expiré ou échoué. Refais /pair.').catch(() => {});
      }
    }
  });

  // Demande du code de jumelage (nouvelle session uniquement)
  let pairingCode = null;
  if (number && !state.creds.registered) {
    await delay(2000);
    pairingCode = await sock.requestPairingCode(number);
  }
  return { sock, pairingCode };
}

// ───────────── COMMANDES TELEGRAM ─────────────
bot.start(async (ctx) => {
  getUser(ctx.from.id);
  await ctx.reply(
    `════════════════════════════════════\n   ✦  ${BRAND} ✦\n════════════════════════════════════\nCREATOR : ⫸𝐌𝐫 𝐊𝐈𝐑𝐀┃𝗧𝗘𝗖𝗛 🌐⫷\n\n` +
    `👋 Bienvenue sur Shadow Kira Bot\nRejoins nos canaux & groupes pour continuer.`,
    Markup.inlineKeyboard([
      ...linkButtons().reply_markup.inline_keyboard,
      [Markup.button.callback('✅ Vérifier', 'verify')],
    ])
  );
});

bot.action('verify', async (ctx) => {
  await ctx.answerCbQuery();
  const missing = await checkMembership(ctx.from.id);
  if (missing.length) {
    return ctx.reply(`❌ Accès refusé.\nTu n'as pas rejoint tous les canaux/groupes (${missing.length} manquant(s)).\nRejoins-les puis clique à nouveau sur ✅ Vérifier.`);
  }
  getUser(ctx.from.id).verified = true;
  saveDb();
  await ctx.reply('Accès autorisé ✅\nTape /menu pour continuer');
});

bot.command('menu', requireAccess, (ctx) => ctx.reply(
  `━━━━━━━━━━━━━━━━━━━\n ${BRAND}\n⚜️ Auteur : Mr Kira Tech 🌐\n╔══════════════════════════╗\n📜 COMMANDES TÉLÉGRAM\n╚══════════════════════════╝\n\n` +
  `▶️ /start ➜ Démarrer le bot\n📋 /menu ➜ Afficher le menu\n❓ /help ➜ Aide\n🔗 /pair ➜ Lancer un appairage WhatsApp\n` +
  `🔌 /unpair ➜ Déconnecter WhatsApp\n📲 /link ➜ Obtenir le lien\n📩 /contact ➜ Nous contacter\n📊 /users ➜ Nombre d'utilisateurs\n` +
  `🔐 /code ➜ Codes promo\n💎 /premium ➜ Payer le bot\n🛒 /shop ➜ Outils tech & ban\n\n━━━━━━━━━━━━━━━━━━\n${FOOTER}`
));

bot.help((ctx) => ctx.reply(
  `━━━━━━━━━━━━━━━━━━━━\n⚡ DÉMARRAGE RAPIDE\n━━━━━━━━━━━━━━━━━━━━\n1️⃣ Tapez ➜ /pair 242XXXXXXXX\n2️⃣ Entrez le code dans WhatsApp ➜ Appareils liés\n3️⃣ Une fois connecté ✅\n4️⃣ Vous contrôlez ce compte depuis Telegram\n\nNB : ${FREE_TRIES} essais gratuits 🆓\n━━━━━━━━━━━━━━━━━━━`
));

bot.command('link', (ctx) => ctx.reply('📲 Nos liens :', linkButtons()));

bot.command('contact', (ctx) => ctx.reply(
  '📩 Support Kira Tech\nClique sur le bouton ci-dessous pour contacter l\'équipe.',
  Markup.inlineKeyboard([[Markup.button.url('💬 Contacter le support', SUPPORT_URL)]])
));

bot.command('users', (ctx) => {
  const botUser = ctx.botInfo.username;
  ctx.reply(
    `━━━━━━━━━━━━━━━━━━\n✦  ${BRAND} ✦\n⚜️ By Mr Kira Tech 🌐\n━━━━━━━━━━━━━━━━━━━\n╔══════════════════════════╗\n👥 Nombre d'utilisateurs : ( ${Object.keys(db.users).length} ) 🚹🚺\n╚══════════════════════════╝\n🔗 Bot : https://t.me/${botUser}`,
    Markup.inlineKeyboard([[Markup.button.url('📤 Partager le lien du bot', `https://t.me/share/url?url=https://t.me/${botUser}`)]])
  );
});

// /pair 242XXXXXXXX  → avertissement + confirmation
bot.command('pair', requireAccess, async (ctx) => {
  const number = (ctx.message.text.split(/\s+/)[1] || '').replace(/\D/g, '');
  if (number.length < 8 || number.length > 15 || ctx.message.text.includes('+')) {
    return ctx.reply(
      `⚠️❌ ERREUR : NUMÉRO ERRONÉ ❌⚠️\n━━━━━━━━━━━━━━━━━━\n🚫 Le numéro que tu as tapé est invalide.\n📲 Format correct : 242XXXXXXXX\n⛔ Sans le (+) devant.\n\n🔁 Réessaie : ➜ /pair 242XXXXXXXX\n━━━━━━━━━━━━━━━━━━━\n${FOOTER}`
    );
  }
  const u = getUser(ctx.from.id);
  if (u.tries >= FREE_TRIES) return ctx.reply('🚫 Tes essais gratuits sont épuisés. Tape /premium.');
  if (socks.has(ctx.from.id)) return ctx.reply('ℹ️ Un WhatsApp est déjà lié. Tape /unpair d\'abord.');

  await ctx.reply(
    `⚠️ Avant de continuer :\n• Ce numéro doit être TON numéro.\n• Le bot pourra lire et envoyer des messages sur ce compte.\n• Tu peux tout supprimer à tout moment avec /unpair.\n\nNuméro : ${number}`,
    Markup.inlineKeyboard([[
      Markup.button.callback('✅ J\'accepte', `pair:${number}`),
      Markup.button.callback('❌ Annuler', 'cancel'),
    ]])
  );
});

bot.action('cancel', (ctx) => ctx.answerCbQuery('Annulé').then(() => ctx.deleteMessage().catch(() => {})));

bot.action(/^pair:(\d{8,15})$/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const number = ctx.match[1];
  const u = getUser(userId);
  if (u.tries >= FREE_TRIES || socks.has(userId)) return;

  u.tries += 1;
  saveDb();
  await ctx.reply(`📡 Demande en cours pour ${number}… 🔄`);

  try {
    const { pairingCode } = await connectWA(userId, { number });
    const code = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
    await ctx.reply(
      `━━━━━━━━━━━━━━━━━━━\n📲 PAIRING CODE pour ${number} ☑️\n━━━━━━━━━━━━━━━━━━━\n🔑 CODE DE JUMELAGE :\n\n<code>${code}</code>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n👉 INSTRUCTIONS :\n1️⃣ Ouvre WhatsApp sur ce numéro 📱\n2️⃣ « Appareils liés » 🔗 ➜ « Lier un appareil » ➕\n3️⃣ « Lier avec un numéro de téléphone » et entre ce code\n━━━━━━━━━━━━━━━━━━━━━━\n${FOOTER}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('⛔ Check', 'check')]]),
      }
    );
  } catch (e) {
    console.error(e);
    socks.delete(userId);
    fs.rmSync(path.join(SESSIONS_DIR, String(userId)), { recursive: true, force: true });
    await ctx.reply('❌ Impossible de générer le code. Réessaie dans quelques minutes.');
  }
});

bot.action('check', (ctx) =>
  ctx.answerCbQuery(`📊 Numéros connectés au bot : ${socks.size}`, { show_alert: true })
);

bot.command('unpair', requireAccess, async (ctx) => {
  const userId = ctx.from.id;
  const sock = socks.get(userId);
  if (sock) {
    try { await sock.logout(); } catch {}
    socks.delete(userId);
  }
  fs.rmSync(path.join(SESSIONS_DIR, String(userId)), { recursive: true, force: true });
  await ctx.reply('🔌 WhatsApp déconnecté et session supprimée ✅');
});

for (const cmd of ['code', 'premium', 'shop']) {
  bot.command(cmd, (ctx) => ctx.reply('🚧 Module bientôt disponible.'));
}

bot.catch((err) => console.error('Erreur bot:', err));

// ───────────── DEMARRAGE ─────────────
// Restaure les sessions WhatsApp existantes apres un redemarrage
for (const id of fs.readdirSync(SESSIONS_DIR)) {
  if (/^\d+$/.test(id)) connectWA(Number(id)).catch(console.error);
}

bot.launch().then(() => console.log('Shadow Kira Bot en ligne ✅'));

// Petit serveur HTTP pour Render (health check)
http.createServer((_, res) => res.end('Shadow Kira Bot OK')).listen(process.env.PORT || 3000);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
