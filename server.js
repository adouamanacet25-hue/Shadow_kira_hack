// ☠︎︎༒︎ 𝕊ℍ𝔸𝔻𝕆𝕎 𝕂𝕀ℝ𝔸 𝔹𝕆𝕋 ༒︎☠︎︎ — Telegram (Telegraf) pilote WhatsApp (Baileys)
// Auteur : Mr Kira Tech
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
  normalizeMessageContent,
} from '@whiskeysockets/baileys';

// ═════════════════════════ CONFIG ═════════════════════════
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN manquant');

// IDs numeriques (-100...) des canaux/groupes Telegram a verifier. Le bot doit y etre admin.
const REQUIRED_CHATS = (process.env.REQUIRED_CHATS || '').split(',').map(s => s.trim()).filter(Boolean);
const SUPPORT_URL = process.env.SUPPORT_URL || 'https://t.me/';
const ADMIN_ID = Number(process.env.ADMIN_ID || 0); // ton ID Telegram (pour /addcode)
const FREE_TRIES = 5;
const TRIAL_DAYS = 90;
const PREFIX = '.';
const DATA_DIR = process.env.DATA_DIR || './data';
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const DB_FILE = path.join(DATA_DIR, 'users.json');
[SESSIONS_DIR, CACHE_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const LINKS = {
  tgChannel: 'https://t.me/+mQ3aQpCsEqI0YmY0',
  tgGroup1: 'https://t.me/+2JDC_Be4_ww1N2Vk',
  tgGroup2: 'https://t.me/+Z-P_xjUgJjU0MjM0',
  waChannel: 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X',
  waGroup: 'https://chat.whatsapp.com/IP0nFB79rMDF0nvFSMXtDR',
};
const IMG = {
  start: 'https://i.ibb.co/QFZ3vpwf/FDE696-C0-FFC0-412-F-8-B2-E-423-DE06691-BF.jpg',
  link: 'https://i.ibb.co/0VG7zNhY/72-C4782-A-F4-D8-40-FD-8-B30-01267-F7-A49-D0.jpg',
  shop: 'https://i.ibb.co/FbpnMrjy/FA94-BECC-1023-4-CE6-BE69-610-C2389-DC05.png',
  cmd: 'https://i.ibb.co/kVdX4t2S/50129-DBF-78-A2-42-F3-AE55-EC7094467-E08.jpg',
  waMenu: 'https://i.ibb.co/BHmMCtCR/4-E77-AADC-6-AF3-46-B8-B279-2176-DE790766.jpg',
};

const BRAND = '☠︎︎༒︎ 𝕊ℍ𝔸𝔻𝕆𝕎 𝕂𝕀ℝ𝔸 𝔹𝕆𝕋 ༒︎☠︎︎';
const FOOT = '<i>power by Mr Kira tech 🌐</i>';
const L = '━━━━━━━━━━━━━━━━━━━━━━';
const QUICK = [
  ['👋', 'Salut, je te réponds dès que possible'],
  ['✅', "D'accord 👍"],
  ['⏳', 'Attends un instant stp'],
  ['❌', 'Je ne peux pas pour le moment'],
  ['📞', "Je t'appelle bientôt"],
];
const EMOJIS = ['😀', '😂', '❤️', '👍', '🙏', '🔥', '😍', '🎉'];
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
const PAGE = 8;

// ═════════════════════════ BASE DE DONNEES ═════════════════════════
let db = { users: {}, codes: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch {}
const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const DEFAULT_SETTINGS = { notif: 'all', preview: true, read: false, save: false };
function getUser(id) {
  const u = db.users[id] ||= { tries: 0, verified: false, joinedAt: Date.now() };
  u.settings = { ...DEFAULT_SETTINGS, ...(u.settings || {}) };
  u.channels ||= [];
  u.templates ||= [];
  return u;
}
const isPremium = (u) => !!u.premiumUntil && u.premiumUntil > Date.now();

// ═════════════════════════ OUTILS ═════════════════════════
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const p2 = (n) => String(n).padStart(2, '0');
const trunc = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const toNum = (v) => (typeof v === 'number' ? v : v?.toNumber ? v.toNumber() : Number(v) || 0);
const fmtDate = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())} / ${p2(d.getDate())} / ${p2(d.getMonth() + 1)} / ${d.getFullYear()}`;
const fmtTime = (ts) => {
  if (!ts) return '--:--';
  const d = new Date(ts * 1000), n = new Date();
  return d.toDateString() === n.toDateString() ? `${p2(d.getHours())}:${p2(d.getMinutes())}` : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
};
const userPart = (jid) => String(jid || '').split('@')[0].split(':')[0];
const numOf = (jid) => '+' + userPart(jid);
const isGroup = (jid) => String(jid).endsWith('@g.us');
const b = (t, d) => Markup.button.callback(t, d);
const kb = (rows) => Markup.inlineKeyboard(rows);
const logger = pino({ level: 'silent' });
const bot = new Telegraf(BOT_TOKEN);
const sessions = new Map(); // telegramId -> session WhatsApp
const states = new Map();   // telegramId -> saisie en attente

async function send(chatId, { img, text, kb: markup }) {
  const extra = { parse_mode: 'HTML', ...(markup || {}) };
  if (img) {
    try {
      if (text.length <= 1000) return await bot.telegram.sendPhoto(chatId, img, { caption: text, ...extra });
      await bot.telegram.sendPhoto(chatId, img);
    } catch (e) { /* image indisponible : on envoie le texte seul */ }
  }
  return bot.telegram.sendMessage(chatId, text.slice(0, 4000), { ...extra, link_preview_options: { is_disabled: true } });
}
async function screen(ctx, o) {
  if (ctx.callbackQuery) ctx.deleteMessage().catch(() => {});
  return send(ctx.chat.id, o);
}
const H = (fn) => async (ctx, next) => {
  try { await fn(ctx, next); } catch (e) {
    console.error(e);
    await ctx.reply('❌ Erreur : ' + (e?.message || e)).catch(() => {});
  }
};
const ack = (ctx, t, alert = false) => ctx.answerCbQuery(t, { show_alert: alert }).catch(() => {});

// ═════════════════════════ SESSION WHATSAPP ═════════════════════════
const cacheFile = (uid) => path.join(CACHE_DIR, `${uid}.json`);
function newSession(uid) {
  const empty = { chats: {}, msgs: {}, contacts: {}, news: {} };
  let cache = empty;
  if (getUser(uid).settings.save) { try { cache = { ...empty, ...JSON.parse(fs.readFileSync(cacheFile(uid), 'utf8')) }; } catch {} }
  for (const j of getUser(uid).channels) cache.news[j] ||= {};
  return { uid, sock: null, ready: false, number: null, cache, refs: new Map(), rev: new Map(), cur: null, last: null,
    groups: {}, gmeta: {}, chanMeta: {}, search: [], fresh: false, done: new Set(), timer: null };
}
function scheduleSave(s) {
  if (!getUser(s.uid).settings.save) return;
  clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    const slim = { ...s.cache, msgs: Object.fromEntries(Object.entries(s.cache.msgs).map(([k, v]) => [k, v.slice(-80)])) };
    fs.writeFile(cacheFile(s.uid), JSON.stringify(slim), () => {});
  }, 10000);
}
function ref(s, jid) {
  let id = s.refs.get(jid);
  if (!id) { id = (s.refs.size + 1).toString(36); s.refs.set(jid, id); s.rev.set(id, jid); }
  return id;
}
const jidOf = (s, id) => s.rev.get(id);

function addNews(s, jid, name) {
  s.cache.news[jid] = { ...(s.cache.news[jid] || {}), ...(name ? { name } : {}) };
  const u = getUser(s.uid);
  if (!u.channels.includes(jid)) { u.channels.push(jid); saveDb(); }
}
function ingestChat(s, c) {
  const jid = c?.id;
  if (!jid || jid.endsWith('@broadcast')) return;
  if (jid.endsWith('@newsletter')) return addNews(s, jid, c.name);
  const o = s.cache.chats[jid] || { jid, unread: 0, ts: 0 };
  s.cache.chats[jid] = {
    ...o,
    name: c.name || c.subject || o.name,
    unread: c.unreadCount != null ? (c.unreadCount < 0 ? 1 : c.unreadCount) : o.unread,
    ts: c.conversationTimestamp ? toNum(c.conversationTimestamp) : o.ts,
    archived: c.archived !== undefined ? !!c.archived : o.archived,
    pin: c.pinned !== undefined ? !!c.pinned : o.pin,
  };
}
function ingestContact(s, c) {
  if (!c?.id) return;
  const name = c.name || c.notify || c.verifiedName || s.cache.contacts[c.id]?.name;
  if (name) s.cache.contacts[c.id] = { name };
}
function parseMsg(message) {
  const c = normalizeMessageContent(message);
  if (!c) return null;
  if (c.conversation) return { kind: /https?:\/\//i.test(c.conversation) ? 'link' : 'text', text: c.conversation };
  if (c.extendedTextMessage) { const t = c.extendedTextMessage.text || ''; return { kind: /https?:\/\//i.test(t) ? 'link' : 'text', text: t }; }
  if (c.imageMessage) return { kind: 'image', text: '🖼 ' + (c.imageMessage.caption || 'Image') };
  if (c.videoMessage) return { kind: 'video', text: '📹 ' + (c.videoMessage.caption || 'Vidéo') };
  if (c.audioMessage) return { kind: 'audio', text: c.audioMessage.ptt ? '🎤 Vocal' : '🎵 Audio' };
  if (c.documentMessage) return { kind: 'document', text: '📎 ' + (c.documentMessage.fileName || 'Document') };
  if (c.stickerMessage) return { kind: 'sticker', text: '🏷 Sticker' };
  if (c.locationMessage) return { kind: 'location', text: '📍 Position' };
  if (c.contactMessage) return { kind: 'contact', text: '👤 Contact' };
  if (c.reactionMessage || c.protocolMessage || c.senderKeyDistributionMessage) return null;
  return { kind: 'other', text: '💬 Message' };
}
function nameOf(s, jid) {
  return s.cache.contacts[jid]?.name || s.cache.chats[jid]?.name || s.cache.news[jid]?.name || (isGroup(jid) ? 'Groupe' : numOf(jid));
}
function ingestMsg(s, m, live) {
  const jid = m.key?.remoteJid;
  if (!jid || jid === 'status@broadcast' || !m.message) return null;
  const p = parseMsg(m.message);
  if (!p) return null;
  const e = {
    id: m.key.id, key: m.key, ts: toNum(m.messageTimestamp) || Math.floor(Date.now() / 1000),
    fromMe: !!m.key.fromMe, who: m.key.fromMe ? 'Moi' : (m.pushName || nameOf(s, m.key.participant || jid)), ...p,
  };
  const arr = (s.cache.msgs[jid] ||= []);
  if (!arr.some(x => x.id === e.id)) { arr.push(e); if (arr.length > 300) arr.shift(); }
  if (jid.endsWith('@newsletter')) { addNews(s, jid); return e; }
  const c = (s.cache.chats[jid] ||= { jid, unread: 0, ts: 0 });
  if (e.ts >= (c.ts || 0)) { c.ts = e.ts; c.text = e.text; c.fromMe = e.fromMe; }
  if (live && !e.fromMe) c.unread = (c.unread || 0) + 1;
  scheduleSave(s);
  return e;
}
const selfJid = (s) => userPart(s.sock.user?.id) + '@s.whatsapp.net';
const selfIds = (s) => [userPart(s.sock.user?.id), userPart(s.sock.user?.lid)].filter(Boolean);
function adminRole(g, s) {
  const me = selfIds(s);
  const p = g.participants.find(p => me.includes(userPart(p.id)) || me.includes(userPart(p.lid)) || me.includes(userPart(p.phoneNumber)));
  return p?.admin || null; // 'admin' | 'superadmin' | null
}
async function fetchGroups(s) {
  const all = await s.sock.groupFetchAllParticipating();
  s.groups = all;
  for (const g of Object.values(all)) ingestChat(s, { id: g.id, name: g.subject });
  return Object.values(all);
}
async function groupName(s, jid) {
  const n = s.cache.chats[jid]?.name;
  if (n) return n;
  try { const md = await s.sock.groupMetadata(jid); s.gmeta[jid] = md; ingestChat(s, { id: jid, name: md.subject }); return md.subject; } catch { return 'Groupe'; }
}
async function chanMeta(s, jid) {
  const c = s.chanMeta[jid];
  if (c && Date.now() - c.t < 600000) return c.m;
  const m = await s.sock.newsletterMetadata('jid', jid);
  s.chanMeta[jid] = { m, t: Date.now() };
  if (m?.name) addNews(s, jid, m.name);
  return m;
}
const chanRole = (m) => String(m?.viewer_metadata?.role || '').toUpperCase();
const isChanAdmin = (m) => ['OWNER', 'ADMIN'].includes(chanRole(m));
async function resolveNumber(s, text) {
  const digits = String(text || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  const r = await s.sock.onWhatsApp(digits).catch(() => null);
  return r?.[0]?.exists ? r[0].jid : null;
}

async function connectWA(uid, { number = null, fresh = false } = {}) {
  const dir = path.join(SESSIONS_DIR, String(uid));
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();
  const s = sessions.get(uid) || newSession(uid);
  sessions.set(uid, s);
  if (fresh) s.fresh = true;

  const sock = makeWASocket({
    version, auth: state, logger, printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'), markOnlineOnConnect: false, syncFullHistory: false,
  });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      s.ready = true;
      s.number = userPart(sock.user?.id);
      if (s.fresh) {
        s.fresh = false;
        await send(uid, {
          img: IMG.start,
          text: `✨${L}✨\n🎊🎉 <b>CONGRATULATIONS !</b> 🎉🎊\n✨${L}✨\n\n╔══════════════════════════╗\n✅ BOT ➜ Connecté 🤖\n🟢 STATUS ➜ OPEN\n📅 DATE ➜ ${fmtDate()}\n⚜️ BY ➜ Mr Kira Tech ⚜️\n╚══════════════════════════╝`,
        }).catch(() => {});
        await sock.sendMessage(selfJid(s), {
          image: { url: IMG.waMenu },
          caption: `▉ KIRA TECH SHADOW B0T 🌹▉\n\n╔══════════════════════════╗\n║   🎭  KIRA TECH SHADOW  🎭   ║\n╚══════════════════════════╝\n\n✅ BOT ➜ Connecté 🤖\n🟢 STATUS ➜ OPEN\n📅 ${fmtDate()}\n\n➠ Auteur : Mr Kira Tech 🌐\n➠ Prefix : [ ${PREFIX} ]\n➠ Tape ${PREFIX}menu`,
        }).catch(() => {});
        setTimeout(() => showDashboard(uid, null).catch(() => {}), 7000);
      }
    }
    if (connection === 'close') {
      s.ready = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        fs.rmSync(dir, { recursive: true, force: true });
        sessions.delete(uid);
        return bot.telegram.sendMessage(uid, '🔌 WhatsApp a été déconnecté. Refais /pair pour te reconnecter.').catch(() => {});
      }
      if (state.creds.registered || code === DisconnectReason.restartRequired) {
        setTimeout(() => connectWA(uid).catch(console.error), 3000);
      } else {
        fs.rmSync(dir, { recursive: true, force: true });
        sessions.delete(uid);
        bot.telegram.sendMessage(uid, '⌛ Pairage expiré ou échoué. Refais /pair.').catch(() => {});
      }
    }
  });

  sock.ev.on('messaging-history.set', ({ chats = [], contacts = [], messages = [] }) => {
    contacts.forEach(c => ingestContact(s, c));
    chats.forEach(c => ingestChat(s, c));
    messages.forEach(m => ingestMsg(s, m, false));
  });
  sock.ev.on('contacts.upsert', (cs) => cs.forEach(c => ingestContact(s, c)));
  sock.ev.on('contacts.update', (cs) => cs.forEach(c => ingestContact(s, c)));
  sock.ev.on('chats.upsert', (cs) => cs.forEach(c => ingestChat(s, c)));
  sock.ev.on('chats.update', (cs) => cs.forEach(c => ingestChat(s, c)));
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) {
      try {
        const e = ingestMsg(s, m, type === 'notify');
        if (!e) continue;
        if (e.fromMe) {
          if ((e.kind === 'text' || e.kind === 'link') && e.text.startsWith(PREFIX) && !s.done.has(e.id) && Date.now() / 1000 - e.ts < 90) {
            s.done.add(e.id);
            await waCommand(s, m, e.text);
          }
        } else if (type === 'notify') {
          await notifyIncoming(s, m, e);
        }
      } catch (err) { console.error('upsert:', err.message); }
    }
  });

  let pairingCode = null;
  if (number && !state.creds.registered) {
    await delay(2000);
    pairingCode = await sock.requestPairingCode(number);
  }
  return { s, pairingCode };
}

// ═════════════════════════ COMMANDES WHATSAPP (prefix .) ═════════════════════════
async function waCommand(s, m, text) {
  const sock = s.sock, jid = m.key.remoteJid;
  const [cmd, ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
  const reply = (content) => sock.sendMessage(jid, content, { quoted: m });
  switch (cmd.toLowerCase()) {
    case 'menu':
      return sock.sendMessage(jid, {
        image: { url: IMG.waMenu },
        caption: `▉ KIRA TECH SHADOW B0T 🌹▉\n\n╔══════════════════════════╗\n   📜 MENU WHATSAPP\n╚══════════════════════════╝\n\n` +
          `${PREFIX}menu ➜ Afficher ce menu\n${PREFIX}ping ➜ Vitesse du bot\n${PREFIX}tagall ➜ Mentionner tout le groupe\n${PREFIX}hidetag texte ➜ Message avec mention cachée\n` +
          `${PREFIX}link ➜ Lien d'invitation du groupe\n${PREFIX}infos ➜ Infos du groupe\n\n➠ Auteur : Mr Kira Tech 🌐\n➠ Prefix : [ ${PREFIX} ]`,
      }, { quoted: m });
    case 'ping': {
      const t = Date.now();
      const sent = await reply({ text: '🏓 Pong…' });
      return sock.sendMessage(jid, { text: `🏓 Pong ! ${Date.now() - t} ms`, edit: sent.key });
    }
    case 'tagall': case 'hidetag': case 'link': case 'infos': {
      if (!isGroup(jid)) return reply({ text: '⚠️ Commande réservée aux groupes.' });
      const g = await sock.groupMetadata(jid);
      const mentions = g.participants.map(p => p.id);
      if (cmd === 'tagall') {
        return reply({ text: `📢 *TAG ALL*\n${args.join(' ')}\n\n` + mentions.map(j => `@${userPart(j)}`).join('\n'), mentions });
      }
      if (cmd === 'hidetag') return reply({ text: args.join(' ') || '📢', mentions });
      if (cmd === 'link') return reply({ text: 'https://chat.whatsapp.com/' + (await sock.groupInviteCode(jid)) });
      return reply({ text: `👥 *${g.subject}*\n👤 Membres : ${g.participants.length}\n👑 Admins : ${g.participants.filter(p => p.admin).length}\n📅 Créé : ${new Date(g.creation * 1000).toLocaleDateString('fr-FR')}` });
    }
  }
}

// ═════════════════════════ NOTIFICATIONS EN DIRECT ═════════════════════════
async function notifyIncoming(s, m, e) {
  const jid = m.key.remoteJid;
  if (jid.endsWith('@newsletter')) return;
  const st = getUser(s.uid).settings, grp = isGroup(jid);
  if (st.notif === 'none' || (st.notif === 'groups' && !grp) || (st.notif === 'contacts' && grp)) return;
  if (s.cache.chats[jid]?.mutedLocal) return;
  const who = m.pushName || nameOf(s, m.key.participant || jid);
  const num = numOf(m.key.participant || jid);
  const where = grp ? `👥 Groupe : ${esc(await groupName(s, jid))}\n` : '';
  const id = ref(s, jid);
  await send(s.uid, {
    text: `🔔 <b>NOUVEAU MESSAGE</b>\n${L}\n${where}👤 De : ${esc(who)} (${esc(num)})\n` +
      (st.preview ? `💬 Message : « ${esc(trunc(e.text, 500))} »\n` : '💬 Message : (aperçu masqué)\n') + `📅 ${fmtDate()}`,
    kb: kb([[b('✍️ Répondre', `c:reply:${id}`), b('📜 Ouvrir', `c:open:${id}`)], [b('🔕 Mute', `c:mute:${id}`), b('🗑 Supprimer', `c:del:${id}`)]]),
  });
}

// ═════════════════════════ ACCES / VERIFICATION ═════════════════════════
async function missingChats(userId) {
  const missing = [];
  for (const chatId of REQUIRED_CHATS) {
    try {
      const m = await bot.telegram.getChatMember(chatId, userId);
      if (!['member', 'administrator', 'creator'].includes(m.status)) missing.push(chatId);
    } catch { missing.push(chatId); }
  }
  return missing;
}
const linkRows = () => [
  [Markup.button.url('📢 Suivre la chaîne Telegram', LINKS.tgChannel)],
  [Markup.button.url('1️⃣ Rejoindre le groupe 1', LINKS.tgGroup1)],
  [Markup.button.url('2️⃣ Rejoindre le groupe 2', LINKS.tgGroup2)],
  [Markup.button.url('📢 Suivre la chaîne WhatsApp', LINKS.waChannel)],
  [Markup.button.url('🌐 Rejoindre le groupe WhatsApp', LINKS.waGroup)],
];
const access = H(async (ctx, next) => {
  if (getUser(ctx.from.id).verified) return next();
  await ctx.reply('🔒 Accès refusé. Tape /start puis clique sur ✅ Vérifier.');
});
bot.use(async (ctx, next) => {
  if (!ctx.from) return;
  if (ctx.message?.text?.startsWith('/')) states.delete(ctx.from.id);
  if (ctx.callbackQuery && !['verify', 'cancel'].includes(ctx.callbackQuery.data) && !getUser(ctx.from.id).verified) {
    return ack(ctx, '🔒 Accès refusé : tape /start et vérifie.', true);
  }
  return next();
});
const needWA = async (ctx) => {
  const s = sessions.get(ctx.from.id);
  if (s?.ready) return s;
  if (ctx.callbackQuery) await ack(ctx, '⚠️ Aucun WhatsApp connecté. Tape /pair', true);
  else await ctx.reply('⚠️ Aucun WhatsApp connecté. Tape /pair 242XXXXXXXX');
  return null;
};

// ═════════════════════════ COMMANDES TELEGRAM DE BASE ═════════════════════════
bot.start(H(async (ctx) => {
  getUser(ctx.from.id);
  await send(ctx.chat.id, {
    img: IMG.start,
    text: `════════════════════════════════════\n   ✦  ${BRAND} ✦\n════════════════════════════════════\nCREATOR : ⫸𝐌𝐫 𝐊𝐈𝐑𝐀┃𝗧𝗘𝗖𝗛 🌐⫷\n\n👋 <b>Bienvenue sur Shadow Kira Bot</b>\nRejoins nos canaux et groupes pour continuer.`,
    kb: kb([...linkRows(), [b('✅ Vérifier', 'verify')]]),
  });
}));
bot.action('verify', H(async (ctx) => {
  await ack(ctx);
  const miss = await missingChats(ctx.from.id);
  if (miss.length) return ctx.reply(`❌ Accès refusé.\nIl te manque ${miss.length} canal(aux)/groupe(s) à rejoindre.\nRejoins-les puis clique à nouveau sur ✅ Vérifier.`);
  getUser(ctx.from.id).verified = true; saveDb();
  await ctx.reply('Accès autorisé ✅\nTape /menu pour continuer');
}));
bot.action('cancel', H(async (ctx) => { states.delete(ctx.from.id); await ack(ctx, 'Annulé'); ctx.deleteMessage().catch(() => {}); }));

const menuText = () => `${L}\n ${BRAND}\n⚜️ Auteur : Mr Kira Tech 🌐\n╔══════════════════════════╗\n📜 <b>COMMANDES TÉLÉGRAM</b>\n╚══════════════════════════╝\n\n` +
  `▶️ /start ➜ Démarrer le bot\n📋 /menu ➜ Afficher le menu\n❓ /help ➜ Aide\n🔗 /pair ➜ Appairage WhatsApp\n🔌 /unpair ➜ Déconnecter WhatsApp\n🎛 /wa ➜ Tableau de bord WhatsApp\n💬 /conversations ➜ Conversations\n` +
  `📲 /link ➜ Nos liens\n📩 /contact ➜ Nous contacter\n📊 /users ➜ Nombre d'utilisateurs\n🔐 /code ➜ Codes promo\n💎 /premium ➜ Premium (3 mois gratuits)\n🛒 /shop ➜ Boutique\n\n${L}\nTape /help pour de l'aide\n${FOOT}`;
bot.command('menu', access, H((ctx) => send(ctx.chat.id, { img: IMG.start, text: menuText(), kb: kb([[b('🎛 Tableau de bord', 'm:dash'), b('💬 Conversations', 'm:conv')]]) })));
bot.command('help', H((ctx) => send(ctx.chat.id, {
  img: IMG.start,
  text: `${L}\n⚡ <b>DÉMARRAGE RAPIDE</b>\n${L}\n1️⃣ Tapez ➜ /pair 242XXXXXXXX\n2️⃣ Entrez le code dans WhatsApp ➜ Appareils liés\n3️⃣ Une fois connecté ✅\n4️⃣ Pilotez ce compte depuis Telegram (/wa)\n\nNB : ${FREE_TRIES} essais gratuits 🆓\n${L}`,
})));
bot.command('link', H((ctx) => send(ctx.chat.id, { img: IMG.link, text: `📲 <b>Nos liens officiels</b>\n${FOOT}`, kb: kb(linkRows()) })));
bot.command('contact', H((ctx) => send(ctx.chat.id, {
  img: IMG.link, text: '📩 <b>Support Kira Tech</b>\nClique sur le bouton ci-dessous pour contacter l\'équipe.',
  kb: kb([[Markup.button.url('💬 Contacter le support', SUPPORT_URL)]]),
})));
bot.command('users', H((ctx) => {
  const u = ctx.botInfo.username;
  return send(ctx.chat.id, {
    img: IMG.start,
    text: `${L}\n✦  ${BRAND} ✦\n⚜️ By Mr Kira Tech 🌐\n${L}\n╔══════════════════════════╗\n👥 Nombre d'utilisateurs : ( <b>${Object.keys(db.users).length}</b> ) 🚹🚺\n╚══════════════════════════╝\n🔗 Bot : https://t.me/${u}`,
    kb: kb([[Markup.button.url('📤 Partager le lien du bot', `https://t.me/share/url?url=https://t.me/${u}`)]]),
  });
}));

// ═════════════════════════ PAIRING ═════════════════════════
bot.command('pair', access, H(async (ctx) => {
  const raw = ctx.message.text.split(/\s+/)[1] || '';
  const number = raw.replace(/\D/g, '');
  if (raw.includes('+') || number.length < 8 || number.length > 15) {
    return send(ctx.chat.id, {
      img: IMG.start,
      text: `⚠️❌ <b>ERREUR : NUMÉRO ERRONÉ</b> ❌⚠️\n${L}\n🚫 Le numéro que tu as tapé est invalide.\n📲 Format correct : 242XXXXXXXX\n⛔ Sans le (+) devant.\n\n🔁 Réessaie : ➜ /pair 242XXXXXXXX\n${L}\n${FOOT}`,
    });
  }
  const u = getUser(ctx.from.id);
  if (!isPremium(u) && u.tries >= FREE_TRIES) return ctx.reply('🚫 Essais gratuits épuisés. Tape /premium ou /code.');
  if (sessions.get(ctx.from.id)?.ready) return ctx.reply('ℹ️ Un WhatsApp est déjà lié. Tape /unpair d\'abord.');
  await ctx.reply(
    `⚠️ Avant de continuer :\n• Ce numéro doit être TON numéro.\n• Le bot pourra lire et envoyer des messages sur ce compte.\n• Tu peux tout supprimer avec /unpair.\n\nNuméro : ${number}`,
    kb([[b("✅ J'accepte", `pair:${number}`), b('❌ Annuler', 'cancel')]])
  );
}));
bot.action(/^pair:(\d{8,15})$/, H(async (ctx) => {
  await ack(ctx);
  const uid = ctx.from.id, number = ctx.match[1], u = getUser(uid);
  if (!isPremium(u) && u.tries >= FREE_TRIES) return;
  const old = sessions.get(uid);
  if (old?.ready) return;
  if (old) { try { old.sock.end(); } catch {} sessions.delete(uid); }
  fs.rmSync(path.join(SESSIONS_DIR, String(uid)), { recursive: true, force: true });
  u.tries += 1; saveDb();
  await ctx.reply(`📡 Demande en cours pour ${number}… 🔄`);
  try {
    const { pairingCode } = await connectWA(uid, { number, fresh: true });
    const code = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
    await send(ctx.chat.id, {
      img: IMG.start,
      text: `${L}\n📲 <b>PAIRING CODE</b> pour ${number} ☑️\n${L}\n╔══════════════════════════╗\n🔑 CODE DE JUMELAGE :\n╚══════════════════════════╝\n\n      ┌───────────────┐\n      │  <code>${code}</code>  │\n      └───────────────┘\n\n${L}\n👉 <b>INSTRUCTIONS :</b>\n1️⃣ Ouvre WhatsApp sur ce numéro 📱\n2️⃣ « Appareils liés » 🔗 ➜ « Lier un appareil » ➕\n3️⃣ « Lier avec un numéro de téléphone » puis entre ce code\n${L}\n✅ Une fois connecté, tape ${PREFIX}menu 📜\n${FOOT}`,
      kb: kb([[{ text: '📄 Copier', copy_text: { text: code } }, b('⛔ Check', 'check')]]),
    });
  } catch (e) {
    console.error(e);
    sessions.delete(uid);
    fs.rmSync(path.join(SESSIONS_DIR, String(uid)), { recursive: true, force: true });
    await ctx.reply('❌ Impossible de générer le code. Réessaie dans quelques minutes.');
  }
}));
bot.action('check', (ctx) => ack(ctx, `📊 Numéros connectés au bot : ${[...sessions.values()].filter(x => x.ready).length}`, true));
bot.command('unpair', access, H(async (ctx) => {
  const uid = ctx.from.id, s = sessions.get(uid);
  if (s?.sock) { try { await s.sock.logout(); } catch {} }
  sessions.delete(uid);
  fs.rmSync(path.join(SESSIONS_DIR, String(uid)), { recursive: true, force: true });
  fs.rmSync(cacheFile(uid), { force: true });
  await ctx.reply('🔌 WhatsApp déconnecté. Session et cache supprimés ✅');
}));

// ═════════════════════════ PREMIUM / CODES / SHOP ═════════════════════════
bot.command('premium', access, H((ctx) => {
  const u = getUser(ctx.from.id);
  const st = isPremium(u) ? `🟢 Premium actif jusqu'au ${new Date(u.premiumUntil).toLocaleDateString('fr-FR')}` : '⚪ Pas de premium actif';
  const rows = [];
  if (!u.trialUsed) rows.push([b(`🎁 Activer ${TRIAL_DAYS / 30} mois gratuits`, 'pr:trial')]);
  rows.push([Markup.button.url('💳 Payer / Contacter', SUPPORT_URL)]);
  return send(ctx.chat.id, { img: IMG.shop, text: `💎 <b>PREMIUM</b>\n${L}\n${st}\n\n✔️ Appairages illimités\n✔️ Support prioritaire\n\n🎁 ${TRIAL_DAYS / 30} mois offerts à la première activation.\n${FOOT}`, kb: kb(rows) });
}));
bot.action('pr:trial', H(async (ctx) => {
  const u = getUser(ctx.from.id);
  if (u.trialUsed) return ack(ctx, 'Essai déjà utilisé.', true);
  u.trialUsed = true; u.premiumUntil = Date.now() + TRIAL_DAYS * 86400000; saveDb();
  await ack(ctx, '✅ Premium activé !', true);
  ctx.deleteMessage().catch(() => {});
}));
bot.command('code', access, H(async (ctx) => {
  const c = (ctx.message.text.split(/\s+/)[1] || '').toUpperCase();
  if (!c) return send(ctx.chat.id, { img: IMG.shop, text: `🔐 <b>CODES PROMO</b>\n${L}\nEntre ton code :\n/code TONCODE\n${FOOT}` });
  const entry = db.codes[c], u = getUser(ctx.from.id);
  if (!entry) return ctx.reply('❌ Code invalide.');
  entry.used ||= {};
  if (entry.used[ctx.from.id]) return ctx.reply('⚠️ Code déjà utilisé.');
  entry.used[ctx.from.id] = true; u.tries = Math.max(0, u.tries - entry.tries); saveDb();
  await ctx.reply(`✅ Code validé : +${entry.tries} essai(s) gratuit(s).`);
}));
bot.command('addcode', H(async (ctx) => {
  if (!ADMIN_ID || ctx.from.id !== ADMIN_ID) return;
  const [, code, n] = ctx.message.text.split(/\s+/);
  if (!code) return ctx.reply('Usage : /addcode CODE NOMBRE_ESSAIS');
  db.codes[code.toUpperCase()] = { tries: Number(n) || 1, used: {} }; saveDb();
  await ctx.reply(`✅ Code ${code.toUpperCase()} créé (+${Number(n) || 1} essais).`);
}));
bot.command('shop', access, H((ctx) => send(ctx.chat.id, {
  img: IMG.shop, text: `🛒 <b>BOUTIQUE KIRA TECH</b>\n${L}\nOutils et services tech.\nContacte le support pour le catalogue et les prix.\n${FOOT}`,
  kb: kb([[Markup.button.url('💬 Voir le catalogue', SUPPORT_URL)]]),
})));

// ═════════════════════════ TABLEAU DE BORD ═════════════════════════
async function showDashboard(uid, ctx) {
  const s = sessions.get(uid);
  if (!s?.ready) return;
  let groups = [], gAdmin = 0;
  try { groups = await fetchGroups(s); gAdmin = groups.filter(g => adminRole(g, s)).length; } catch {}
  const news = Object.keys(s.cache.news);
  let cAdmin = 0;
  await Promise.allSettled(news.slice(0, 30).map(async j => { if (isChanAdmin(await chanMeta(s, j))) cAdmin++; }));
  const indiv = Object.values(s.cache.chats).filter(c => !isGroup(c.jid));
  const unsaved = indiv.filter(c => !s.cache.contacts[c.jid]?.name).length;
  const text = `<b>BOT :</b> ${BRAND}\n<b>User :</b> +${esc(s.number)}\n<b>Statut :</b> OPEN ✅\n\n—————————————————\n<b>LISTE DES GROUPES 👥</b>\n—————————————————\nNombre : ${groups.length}\nAdmin : ${gAdmin}\n\n—————————————————\n<b>LISTE DES CHAÎNES 📊</b>\n—————————————————\nNombre : ${news.length}\nAdmin : ${cAdmin}\n\n—————————————————\n<b>CONVERSATION 💬</b>\n—————————————————\nNombre : ${Object.keys(s.cache.chats).length}\nContacts non enregistrés : ${unsaved}\n—————————————————`;
  const o = { img: IMG.cmd, text, kb: kb([
    [b('👤 Modifier le profil', 'm:prof')], [b('👥 Gérer les groupes admin', 'm:grp')], [b('📊 Gérer les chaînes admin', 'm:chn')],
    [b('💬 Lire les conversations', 'm:conv')], [b('⚙️ Paramètres', 'm:set'), b('🔄 Rafraîchir', 'm:dash')],
  ]) };
  return ctx ? screen(ctx, o) : send(uid, o);
}
bot.command('wa', access, H(async (ctx) => { if (await needWA(ctx)) await showDashboard(ctx.from.id, ctx); }));
bot.action('m:dash', H(async (ctx) => { await ack(ctx, 'Actualisation…'); if (await needWA(ctx)) await showDashboard(ctx.from.id, ctx); }));

// ═════════════════════════ PROFIL ═════════════════════════
bot.action('m:prof', H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  await screen(ctx, { img: IMG.cmd, text: `👤 <b>MODIFIER LE PROFIL</b>\n${L}\nQue veux-tu modifier ?`, kb: kb([
    [b('✏️ Nom', 'p:name'), b('🖼 Photo de profil', 'p:pic')], [b('📝 Ajouter un statut', 'p:status'), b('💬 Bio (À propos)', 'p:bio')], [b('⬅️ Retour', 'm:dash')],
  ]) });
}));
const cancelKb = kb([[b('❌ Annuler', 'cancel')]]);
bot.action(/^p:(\w+)(?::(\w+))?$/, H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  const uid = ctx.from.id, [, act, kind] = ctx.match;
  if (act === 'name') { states.set(uid, { type: 'pname' }); return ctx.reply('✏️ Envoie le nouveau nom du profil :', cancelKb); }
  if (act === 'pic') { states.set(uid, { type: 'ppic' }); return ctx.reply('🖼 Envoie la nouvelle photo de profil :', cancelKb); }
  if (act === 'bio') { states.set(uid, { type: 'pbio' }); return ctx.reply('💬 Envoie ta nouvelle bio (À propos) :', cancelKb); }
  if (act === 'status') {
    return screen(ctx, { text: `📝 <b>AJOUTER UN STATUT</b>\n${L}\nChoisis le type :`, kb: kb([[b('🔤 Texte', 'p:st:text'), b('🖼 Image', 'p:st:image'), b('📹 Vidéo', 'p:st:video')], [b('⬅️ Retour', 'm:prof')]]) });
  }
  if (act === 'st') {
    states.set(uid, { type: 'status', kind });
    return ctx.reply({ text: '🔤 Envoie le texte du statut :', image: '🖼 Envoie l\'image (avec légende optionnelle) :', video: '📹 Envoie la vidéo :' }[kind], cancelKb);
  }
}));

// ═════════════════════════ GROUPES ═════════════════════════
bot.action('m:grp', H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  await screen(ctx, { img: IMG.cmd, text: `👥 <b>GÉRER LES GROUPES</b>\n${L}\nChoisis une action :`, kb: kb([
    [b('📋 Liste des groupes', 'gp:list:0')], [b('➕ Ajouter un membre', 'gp:add:0')], [b('👑 Nommer un admin', 'gp:promote:0'), b('⬇️ Retirer un admin', 'gp:demote:0')],
    [b('🚪 Quitter le groupe', 'gp:leave:0')], [b('🗑 Révoker tous les admins', 'gp:revoke:0')], [b('⬅️ Retour', 'm:dash')],
  ]) });
}));
const ADMIN_ACTIONS = ['promote', 'demote', 'revoke'];
bot.action(/^gp:(\w+):(\d+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const [, act, pg] = ctx.match;
  let groups = await fetchGroups(s);
  if (ADMIN_ACTIONS.includes(act)) groups = groups.filter(g => adminRole(g, s));
  groups.sort((a, b2) => a.subject.localeCompare(b2.subject));
  if (!groups.length) return screen(ctx, { text: '⚠️ Aucun groupe disponible pour cette action.', kb: kb([[b('⬅️ Retour', 'm:grp')]]) });
  const { slice, page, pages } = paginate(groups, Number(pg));
  const lines = slice.map((g, i) => `${NUM[i]} | <b>${esc(trunc(g.subject, 30))}</b> → ${g.participants.length} membres → ${adminRole(g, s) ? 'admin' : 'non admin'}`);
  const rows = [];
  if (act !== 'list') for (let i = 0; i < slice.length; i += 2) rows.push(slice.slice(i, i + 2).map((g, k) => b(`${NUM[i + k]} ${trunc(g.subject, 18)}`, `g:${act}:${ref(s, g.id)}`)));
  const nav = navRow(`gp:${act}`, page, pages); if (nav.length) rows.push(nav);
  rows.push([b('⬅️ Retour', 'm:grp')]);
  const title = { list: '📋 LISTE DES GROUPES', add: '➕ AJOUTER UN MEMBRE', promote: '👑 NOMMER UN ADMIN', demote: '⬇️ RETIRER UN ADMIN', leave: '🚪 QUITTER UN GROUPE', revoke: '🗑 RÉVOQUER LES ADMINS' }[act];
  await screen(ctx, { img: IMG.cmd, text: `<b>${title}</b>\nUser : +${esc(s.number)}\n${L}\n${lines.join('\n')}\n${L}\nPage ${page + 1}/${pages}${act === 'list' ? '' : '\n👇 Choisis un groupe :'}`, kb: kb(rows) });
}));
function paginate(items, page) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  page = Math.min(Math.max(0, page), pages - 1);
  return { slice: items.slice(page * PAGE, (page + 1) * PAGE), page, pages };
}
const navRow = (prefix, page, pages) => {
  const r = [];
  if (page > 0) r.push(b('⬅️ Précédent', `${prefix}:${page - 1}`));
  if (page < pages - 1) r.push(b('➡️ Suivant', `${prefix}:${page + 1}`));
  return r;
};
bot.action(/^g:(\w+):(\w+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const [, act, id] = ctx.match, gid = jidOf(s, id), uid = ctx.from.id;
  if (!gid) return ctx.reply('⌛ Liste expirée, relance /wa.');
  const name = await groupName(s, gid);
  if (act === 'add' || act === 'promote' || act === 'demote') {
    states.set(uid, { type: 'gnum', act, gid });
    const hint = act === 'add' ? '📲 Envoie le numéro à ajouter (format international)\nEx : +242 06 123 45 67' : '📲 Envoie le numéro du membre (format international)';
    return ctx.reply(`Groupe : ${name}\n${hint}`, cancelKb);
  }
  if (act === 'leave') {
    return screen(ctx, { text: `🚪 <b>Quitter « ${esc(name)} » ?</b>`, kb: kb([[b('🗑 Quitter', `g:leaveok:${id}`), b('❌ Quitter + Supprimer', `g:leavedel:${id}`)], [b('⬅️ Retour', 'm:grp')]]) });
  }
  if (act === 'leaveok' || act === 'leavedel') {
    await s.sock.groupLeave(gid);
    if (act === 'leavedel') {
      const last = s.cache.msgs[gid]?.at(-1);
      if (last) await s.sock.chatModify({ delete: true, lastMessages: [{ key: last.key, messageTimestamp: last.ts }] }, gid).catch(() => {});
      delete s.cache.chats[gid]; delete s.cache.msgs[gid];
    }
    return screen(ctx, { text: `✅ Tu as quitté « ${esc(name)} »${act === 'leavedel' ? ' et la conversation a été supprimée' : ''}.`, kb: kb([[b('⬅️ Retour', 'm:grp')]]) });
  }
  if (act === 'revoke') {
    return screen(ctx, { text: `🗑 <b>Retirer tous les admins de « ${esc(name)} » ?</b>\nLe créateur et ton propre compte ne sont jamais retirés.`, kb: kb([[b('🗑 Retirer tous les admins', `g:revokeok:${id}`)], [b('⬅️ Retour', 'm:grp')]]) });
  }
  if (act === 'revokeok') {
    const g = await s.sock.groupMetadata(gid), me = selfIds(s);
    const targets = g.participants.filter(p => p.admin === 'admin' && !me.includes(userPart(p.id)) && !me.includes(userPart(p.lid)) && !me.includes(userPart(p.phoneNumber))).map(p => p.id);
    for (let i = 0; i < targets.length; i += 20) await s.sock.groupParticipantsUpdate(gid, targets.slice(i, i + 20), 'demote');
    return screen(ctx, { text: `Félicitations 🎊\nCommande : réussie ✅\nAdmins retirés : 🗑\nNombre 📊 : ${targets.length}`, kb: kb([[b('⬅️ Retour', 'm:grp')]]) });
  }
}));
async function groupNumberAction(ctx, s, st) {
  const jid = await resolveNumber(s, ctx.message.text);
  if (!jid) return ctx.reply('❌ Numéro invalide ou absent de WhatsApp. Réessaie (format international) ou ❌ Annuler.', cancelKb);
  states.delete(ctx.from.id);
  const name = await groupName(s, st.gid);
  const upd = { add: 'add', promote: 'promote', demote: 'demote' }[st.act];
  const res = await s.sock.groupParticipantsUpdate(st.gid, [jid], upd);
  const status = String(res?.[0]?.status || '');
  let msg;
  if (status === '200') msg = { add: '✅ Membre ajouté', promote: '👑 Nommé admin', demote: '⬇️ Admin retiré' }[upd] + ` : ${numOf(jid)} → ${name}`;
  else if (status === '409') msg = 'ℹ️ Cette personne est déjà dans le groupe.';
  else if (status === '403' && upd === 'add') {
    const code = await s.sock.groupInviteCode(st.gid);
    await s.sock.sendMessage(jid, { text: `Tu es invité(e) à rejoindre « ${name} » : https://chat.whatsapp.com/${code}` });
    msg = '🔗 Ajout direct impossible (confidentialité) : lien d\'invitation envoyé en privé.';
  } else if (status === '408') msg = '⚠️ Impossible : la personne a quitté récemment le groupe.';
  else msg = `⚠️ Échec (code ${status || 'inconnu'}). Vérifie que tu es admin du groupe.`;
  await ctx.reply(msg, kb([[b('⬅️ Retour', 'm:grp')]]));
}

// ═════════════════════════ CHAÎNES ═════════════════════════
bot.action(/^m:chn$|^np:(\d+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const jids = Object.keys(s.cache.news);
  const metas = await Promise.all(jids.map(async j => { try { return await chanMeta(s, j); } catch { return null; } }));
  const items = jids.map((j, i) => ({ jid: j, name: metas[i]?.name || s.cache.news[j]?.name || 'Chaîne', subs: metas[i]?.subscribers, role: chanRole(metas[i]) }));
  const { slice, page, pages } = paginate(items, Number(ctx.match[1] || 0));
  const lines = slice.map((c, i) => `${NUM[i]} <b>${esc(trunc(c.name, 28))}</b> — ${c.subs ?? '?'} abonnés — ${c.role === 'OWNER' ? 'propriétaire' : c.role === 'ADMIN' ? 'admin' : c.role ? 'abonné' : '?'}`);
  const rows = [];
  for (let i = 0; i < slice.length; i += 2) rows.push(slice.slice(i, i + 2).map((c, k) => b(`${NUM[i + k]} ${trunc(c.name, 18)}`, `n:open:${ref(s, c.jid)}`)));
  const nav = navRow('np', page, pages); if (nav.length) rows.push(nav);
  rows.push([b('➕ Ajouter une chaîne (lien)', 'n:add:0')], [b('⬅️ Retour', 'm:dash')]);
  await screen(ctx, { img: IMG.cmd, text: `📊 <b>LISTE DES CHAÎNES</b>\n${L}\n${lines.join('\n') || 'Aucune chaîne détectée pour le moment.\nUtilise ➕ pour ajouter une chaîne avec son lien.'}\n${L}\nPage ${page + 1}/${pages}`, kb: kb(rows) });
}));
bot.action(/^n:(\w+):(\w+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const uid = ctx.from.id, [, act, id] = ctx.match;
  if (act === 'add') { states.set(uid, { type: 'chadd' }); return ctx.reply('🔗 Envoie le lien de ta chaîne (https://whatsapp.com/channel/…) :', cancelKb); }
  const jid = jidOf(s, id);
  if (!jid) return ctx.reply('⌛ Liste expirée, rouvre le menu des chaînes.');
  const meta = await chanMeta(s, jid).catch(() => null);
  const name = meta?.name || s.cache.news[jid]?.name || 'Chaîne';
  const back = [b('⬅️ Retour', `n:open:${id}`)];
  switch (act) {
    case 'open':
      return screen(ctx, { img: IMG.cmd, text: `📢 <b>CHAÎNE : ${esc(name)}</b>\n${L}\n👥 Abonnés : ${meta?.subscribers ?? '?'}\n🔰 Rôle : ${chanRole(meta) || 'inconnu'}\n${L}`, kb: kb([
        [b('👤 Modifier le profil', `n:prof:${id}`)], [b('👑 Nommer admin', `n:admin:${id}`), b('🔱 Nommer propriétaire', `n:owner:${id}`)],
        [b('🗑 Retirer un admin', `n:demote:${id}`), b('📜 Voir messages', `n:msgs:${id}`)], [b('🚪 Quitter la chaîne', `n:leave:${id}`)], [b('⬅️ Retour', 'm:chn')],
      ]) });
    case 'prof':
            return screen(ctx, { text: `👤 <b>PROFIL DE LA CHAÎNE</b>\n${esc(name)}`, kb: kb([[b('✏️ Nom', `n:name:${id}`), b('🖼 Photo', `n:pic:${id}`)], [b('💬 Envoyer un message', `n:msg:${id}`)], back]) });
    case 'name': states.set(uid, { type: 'chname', jid }); return ctx.reply('✏️ Envoie le nouveau nom de la chaîne :', cancelKb);
    case 'pic': states.set(uid, { type: 'chpic', jid }); return ctx.reply('🖼 Envoie la nouvelle photo de la chaîne :', cancelKb);
    case 'msg': states.set(uid, { type: 'chmsg', jid }); return ctx.reply('💬 Envoie le message (texte, image ou vidéo) à publier dans la chaîne :', cancelKb);
    case 'admin': states.set(uid, { type: 'chnum', act: 'admin', jid }); return ctx.reply('👑 Envoie le numéro à nommer admin :', cancelKb);
    case 'owner': states.set(uid, { type: 'chnum', act: 'owner', jid }); return ctx.reply('🔱 Envoie le numéro du futur propriétaire (⚠️ tu perds la propriété) :', cancelKb);
    case 'demote': states.set(uid, { type: 'chnum', act: 'demote', jid }); return ctx.reply('🗑 Envoie le numéro de l\'admin à retirer :', cancelKb);
    case 'msgs': {
      const arr = (s.cache.msgs[jid] || []).slice(-10);
      const t = arr.length ? arr.map(e => `[${fmtTime(e.ts)}] ${esc(trunc(e.text, 150))}`).join('\n\n') : 'Aucun message en cache pour cette chaîne.';
      return screen(ctx, { text: `📜 <b>${esc(name)}</b>\n${L}\n${t}`, kb: kb([back]) });
    }
    case 'leave':
      return screen(ctx, { text: `🚪 <b>Quitter « ${esc(name)} » ?</b>`, kb: kb([[b('🗑 Quitter', `n:leaveok:${id}`), b('❌ Quitter + Supprimer', `n:leavedel:${id}`)], back]) });
    case 'leaveok': case 'leavedel': {
      if (act === 'leavedel') await s.sock.newsletterDelete(jid); else await s.sock.newsletterUnfollow(jid);
      delete s.cache.news[jid]; const u = getUser(uid); u.channels = u.channels.filter(j => j !== jid); saveDb();
      return screen(ctx, { text: act === 'leavedel' ? '✅ Chaîne supprimée.' : '✅ Tu as quitté la chaîne.', kb: kb([[b('⬅️ Retour', 'm:chn')]]) });
    }
  }
}));
async function channelNumberAction(ctx, s, st) {
  const jid = await resolveNumber(s, ctx.message.text);
  if (!jid) return ctx.reply('❌ Numéro invalide ou absent de WhatsApp. Réessaie ou ❌ Annuler.', cancelKb);
  states.delete(ctx.from.id);
  const sock = s.sock;
  if (st.act === 'admin') {
    const fn = sock.newsletterAdminInvite || sock.newsletterPromote;
    if (typeof fn !== 'function') return ctx.reply('⚠️ Cette version de Baileys ne permet pas encore d\'inviter un admin de chaîne. Fais-le depuis WhatsApp.');
    await fn.call(sock, st.jid, jid);
    return ctx.reply(`👑 Invitation admin envoyée à ${numOf(jid)} ✅`);
  }
  if (st.act === 'owner') { await sock.newsletterChangeOwner(st.jid, jid); return ctx.reply(`🔱 Propriété transférée à ${numOf(jid)} ✅`); }
  if (st.act === 'demote') { await sock.newsletterDemote(st.jid, jid); return ctx.reply(`🗑 ${numOf(jid)} n'est plus admin ✅`); }
}

// ═════════════════════════ CONVERSATIONS ═════════════════════════
const TITLES = { inbox: '📥 BOÎTE DE RÉCEPTION', unread: '🔵 NON LUS', favs: '⭐ CONVERSATIONS FAVORIS', archives: '🗑 ARCHIVES', groups: '👥 GROUPES', contacts: '👤 CONTACTS', sent: '📤 MESSAGES ENVOYÉS', search: '🔍 RÉSULTATS' };
function chatItems(s, kind) {
  const chats = Object.values(s.cache.chats);
  const toItem = (c) => ({ jid: c.jid, name: nameOf(s, c.jid), ts: c.ts, text: c.text, unread: c.unread, icon: isGroup(c.jid) ? '👥' : '👤', pin: c.pin || c.fav });
  const byTs = (a, b2) => (b2.ts || 0) - (a.ts || 0);
  switch (kind) {
    case 'inbox': return chats.filter(c => !c.archived).map(toItem).sort(byTs);
    case 'unread': return chats.filter(c => c.unread > 0 && !c.archived).map(toItem).sort(byTs);
    case 'favs': return chats.filter(c => c.pin || c.fav).map(toItem).sort(byTs);
    case 'archives': return chats.filter(c => c.archived).map(toItem).sort(byTs);
    case 'groups': return chats.filter(c => isGroup(c.jid)).map(toItem).sort((a, b2) => a.name.localeCompare(b2.name));
    case 'contacts': return Object.entries(s.cache.contacts).filter(([j]) => j.endsWith('@s.whatsapp.net')).map(([j, c]) => ({ jid: j, name: c.name, icon: '👤' })).sort((a, b2) => a.name.localeCompare(b2.name));
    case 'sent': return Object.entries(s.cache.msgs).flatMap(([j, arr]) => arr.filter(e => e.fromMe).slice(-5).map(e => ({ jid: j, name: nameOf(s, j), ts: e.ts, text: e.text, icon: isGroup(j) ? '👥' : '👤' }))).sort(byTs).slice(0, 40);
    case 'search': return s.search;
  }
  return [];
}
async function showList(ctx, s, kind, pg) {
  if (kind === 'groups') await fetchGroups(s).catch(() => {});
  const items = chatItems(s, kind);
  const { slice, page, pages } = paginate(items, pg);
  const lines = slice.map((it, i) => `${NUM[i]} ${it.icon} <b>${esc(trunc(it.name, 26))}</b>${it.ts ? ' — ' + fmtTime(it.ts) : ''}${it.text ? `\n    « ${esc(trunc(it.text, 40))} » ${it.unread > 0 ? '🔵' : '⚪'}${it.pin ? ' ⭐' : ''}` : ''}`);
  const rows = [];
  for (let i = 0; i < slice.length; i += 4) rows.push(slice.slice(i, i + 4).map((it, k) => b(NUM[i + k], `c:open:${ref(s, it.jid)}`)));
  const nav = navRow(`l:${kind}`, page, pages); if (nav.length) rows.push(nav);
  rows.push([b('🔄 Rafraîchir', `l:${kind}:${page}`), ...(kind === 'inbox' || kind === 'unread' ? [b('🔍 Filtrer', 'm:filter')] : [])]);
  rows.push([b('⬅️ Retour', 'm:conv')]);
  const legend = kind === 'inbox' ? '\nLégende : 🔵 non lu | ⚪ lu | ⭐ épinglé' : '';
  await screen(ctx, { img: IMG.cmd, text: `${L}\n<b>${TITLES[kind]}</b>\n${L}\n${lines.join('\n') || 'Rien à afficher.'}\n${L}\nPage ${page + 1}/${pages}${legend}`, kb: kb(rows) });
}
bot.command('conversations', access, H(async (ctx) => { if (await needWA(ctx)) await convMenu(ctx, sessions.get(ctx.from.id)); }));
async function convMenu(ctx, s) {
  const chats = Object.values(s.cache.chats);
  await screen(ctx, { img: IMG.cmd, text: `${L}\n💬 <b>GESTION DES CONVERSATIONS</b>\n${L}\n<b>BOT :</b> ${BRAND}\n<b>User :</b> +${esc(s.number)}\n<b>Statut :</b> OPEN ✅\n${L}\n📊 Total conversations : ${chats.length}\n💬 Non lues : ${chats.filter(c => c.unread > 0).length}\n👤 Contacts : ${Object.keys(s.cache.contacts).length}\n👥 Groupes : ${chats.filter(c => isGroup(c.jid)).length}\n📢 Chaînes : ${Object.keys(s.cache.news).length}\n${L}`, kb: kb([
    [b('📥 Boîte de réception', 'l:inbox:0'), b('📤 Messages envoyés', 'l:sent:0')], [b('👤 Contacts', 'l:contacts:0'), b('👥 Groupes', 'l:groups:0')],
    [b('📢 Chaînes', 'm:chn'), b('🔍 Rechercher', 'm:search')], [b('⭐ Favoris', 'l:favs:0'), b('🗑 Archives', 'l:archives:0')], [b('⬅️ Retour', 'm:dash')],
  ]) });
}
bot.action('m:conv', H(async (ctx) => { await ack(ctx); const s = await needWA(ctx); if (s) await convMenu(ctx, s); }));
bot.action(/^l:(\w+):(\d+)$/, H(async (ctx) => { await ack(ctx); const s = await needWA(ctx); if (s) await showList(ctx, s, ctx.match[1], Number(ctx.match[2])); }));
bot.action('m:filter', H(async (ctx) => {
  await ack(ctx);
  await screen(ctx, { text: '🔍 <b>Filtrer la boîte de réception</b>', kb: kb([[b('🔵 Non lus', 'l:unread:0'), b('🕒 Récents', 'l:inbox:0'), b('⭐ Importants', 'l:favs:0')], [b('⬅️ Retour', 'm:conv')]]) });
}));
bot.action('m:search', H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  states.set(ctx.from.id, { type: 'search' });
  await ctx.reply(`${L}\n🔍 RECHERCHE\n${L}\nTape un :\n➜ Nom du contact\n➜ Numéro de téléphone\n➜ Mot-clé dans les messages`, cancelKb);
}));
function runSearch(s, q) {
  q = q.toLowerCase();
  const out = [];
  const jids = new Set([...Object.keys(s.cache.chats), ...Object.keys(s.cache.contacts)]);
  for (const j of jids) {
    if (!j.endsWith('@s.whatsapp.net') && !isGroup(j)) continue;
    const nameHit = nameOf(s, j).toLowerCase().includes(q) || userPart(j).includes(q.replace(/\D/g, '') || '§');
    const hits = (s.cache.msgs[j] || []).filter(e => e.text.toLowerCase().includes(q)).length;
    if (nameHit || hits) out.push({ jid: j, name: nameOf(s, j), icon: isGroup(j) ? '👥' : '👤', text: hits ? `${hits} résultat(s)` : '', ts: s.cache.chats[j]?.ts });
  }
  return out.sort((a, b2) => (b2.ts || 0) - (a.ts || 0));
}

async function convText(s, jid, limit = 12) {
  const arr = (s.cache.msgs[jid] || []).slice().sort((a, b2) => a.ts - b2.ts).slice(-limit);
  const c = s.cache.chats[jid] || {};
  let head;
  if (isGroup(jid)) {
    let g = s.gmeta[jid]; if (!g) { try { g = s.gmeta[jid] = await s.sock.groupMetadata(jid); } catch {} }
    head = `👥 <b>GROUPE : ${esc(nameOf(s, jid))}</b>\n${L}\n👤 Membres : ${g?.participants?.length ?? '?'}\n👑 Admins : ${g ? g.participants.filter(p => p.admin).length : '?'}\n📅 Dernier message : ${fmtTime(c.ts)}`;
  } else {
    head = `💬 <b>CONVERSATION</b>\n${L}\n👤 Contact : ${esc(nameOf(s, jid))}\n📞 Numéro  : ${esc(numOf(jid))}\n📅 Dernier message : ${fmtTime(c.ts)}`;
  }
  const body = arr.length ? arr.map(e => `[${fmtTime(e.ts)}] ${e.fromMe ? '🤖 Moi' : '👤 ' + esc(trunc(e.who, 20))} :\n${esc(trunc(e.text, 160))}`).join('\n\n') : 'Aucun message en cache pour cette conversation (les nouveaux messages apparaîtront ici).';
  return `${head}\n${L}\n📜 <b>HISTORIQUE (${arr.length} derniers messages)</b>\n─────────────────────────\n${body}\n─────────────────────────`;
}
async function openConv(ctx, s, jid) {
  s.cur = jid;
  const id = ref(s, jid), c = (s.cache.chats[jid] ||= { jid, unread: 0, ts: 0 });
  if (getUser(s.uid).settings.read) {
    const keys = (s.cache.msgs[jid] || []).filter(e => !e.fromMe).slice(-10).map(e => e.key);
    if (keys.length) s.sock.readMessages(keys).catch(() => {});
    c.unread = 0;
  }
  const grp = isGroup(jid);
  const rows = [
    [b('✍️ Répondre', `c:reply:${id}`), b('🖼 Image', `c:img:${id}`)], [b('🎤 Vocal', `c:voc:${id}`), b('📎 Document', `c:doc:${id}`)],
    [b('📹 Vidéo', `c:vid:${id}`), b('📍 Localisation', `c:loc:${id}`)], [b('😀 Emojis', `c:emo:${id}`), b('⚡ Réponses rapides', `c:quick:${id}`)],
    [b('📜 Historique', `c:hist:${id}:0:all`), b('🔄 Rafraîchir', `c:open:${id}`)],
    [b(c.pin || c.fav ? '⭐ Retirer favori' : '⭐ Épingler', `c:${c.pin || c.fav ? 'unpin' : 'pin'}:${id}`), b(c.muted || c.mutedLocal ? '🔊 Unmute' : '🔕 Mute', `c:${c.muted || c.mutedLocal ? 'unmute' : 'mute'}:${id}`)],
    [b(c.archived ? '📤 Désarchiver' : '📥 Archiver', `c:${c.archived ? 'unarch' : 'arch'}:${id}`), b('👁 Marquer lu', `c:read:${id}`)],
    [b('🗑 Supprimer', `c:del:${id}`), grp ? b('🚪 Quitter', `g:leave:${id}`) : b(c.blocked ? '✅ Débloquer' : '🚫 Bloquer', `c:${c.blocked ? 'unblock' : 'block'}:${id}`)],
    [b('👤 Infos', `c:info:${id}`), ...(grp ? [b('👥 Membres', `c:members:${id}`), b('👑 Admins', `c:admins:${id}`)] : [])],
    [b('⬅️ Retour', 'l:inbox:0')],
  ];
  await screen(ctx, { text: await convText(s, jid), kb: kb(rows) });
}
function lastKeys(s, jid) { const l = s.cache.msgs[jid]?.at(-1); return l ? [{ key: l.key, messageTimestamp: l.ts }] : []; }
const PROMPT = (n) => ({
  text: `✍️ Envoie ton message à ${n} :`, image: '📸 Envoie la photo à envoyer :', voice: '🎤 Envoie le vocal :',
  video: '📹 Envoie la vidéo :', document: '📎 Envoie le document :', location: '📍 Envoie ta localisation (trombone ➜ Position) :',
});
async function sendAndConfirm(ctx, s, jid, content) {
  const sent = await s.sock.sendMessage(jid, content);
  s.last = { jid, key: sent?.key, text: content.text };
  const id = ref(s, jid);
  await send(ctx.chat.id, {
    text: `✅ <b>Message envoyé</b> à ${esc(nameOf(s, jid))}\n📅 ${fmtDate()}`,
    kb: kb([[...(content.text ? [b('🔄 Renvoyer', `c:resend:${id}`)] : []), b('↩️ Annuler', `c:undo:${id}`)], [b('⬅️ Retour', `c:open:${id}`)]]),
  });
}
bot.action(/^c:(\w+):(\w+)(?::(.+))?$/, H(async (ctx) => {
  const s = await needWA(ctx); if (!s) return;
  const [, act, id, extra] = ctx.match, uid = ctx.from.id;
  const jid = jidOf(s, id);
  if (!jid) { await ack(ctx); return ctx.reply('⌛ Conversation introuvable (redémarrage ?). Rouvre-la via /conversations.'); }
  const c = (s.cache.chats[jid] ||= { jid, unread: 0, ts: 0 });
  const name = nameOf(s, jid);
  await ack(ctx);
  switch (act) {
    case 'open': return openConv(ctx, s, jid);
    case 'reply': states.set(uid, { type: 'send', kind: 'text', jid }); return ctx.reply(PROMPT(name).text, cancelKb);
    case 'img': states.set(uid, { type: 'send', kind: 'image', jid }); return ctx.reply(PROMPT(name).image, cancelKb);
    case 'voc': states.set(uid, { type: 'send', kind: 'voice', jid }); return ctx.reply(PROMPT(name).voice, cancelKb);
    case 'vid': states.set(uid, { type: 'send', kind: 'video', jid }); return ctx.reply(PROMPT(name).video, cancelKb);
    case 'doc': states.set(uid, { type: 'send', kind: 'document', jid }); return ctx.reply(PROMPT(name).document, cancelKb);
    case 'loc': states.set(uid, { type: 'send', kind: 'location', jid }); return ctx.reply(PROMPT(name).location, cancelKb);
    case 'emo': return screen(ctx, { text: '😀 <b>Choisis un emoji à envoyer</b>', kb: kb([EMOJIS.slice(0, 4).map((e, i) => b(e, `c:e:${id}:${i}`)), EMOJIS.slice(4).map((e, i) => b(e, `c:e:${id}:${i + 4}`)), [b('⬅️ Retour', `c:open:${id}`)]]) });
    case 'e': return sendAndConfirm(ctx, s, jid, { text: EMOJIS[Number(extra)] });
    case 'quick': {
      const tpl = getUser(uid).templates;
      const rows = [...QUICK.map(([e, t], i) => [b(`${e} ${trunc(t, 34)}`, `c:q:${id}:${i}`)]), ...tpl.map((t, i) => [b(`📝 ${trunc(t, 34)}`, `c:q:${id}:${QUICK.length + i}`)]), [b('➕ Créer un modèle', `c:tpl:${id}`)], [b('⬅️ Retour', `c:open:${id}`)]];
      return screen(ctx, { text: `⚡ <b>RÉPONSES RAPIDES</b> → ${esc(name)}`, kb: kb(rows) });
    }
    case 'q': {
      const i = Number(extra), t = i < QUICK.length ? QUICK[i][1] : getUser(uid).templates[i - QUICK.length];
      if (!t) return;
      return sendAndConfirm(ctx, s, jid, { text: t });
    }
    case 'tpl': states.set(uid, { type: 'tpl' }); return ctx.reply('📝 Envoie le texte du nouveau modèle de réponse :', cancelKb);
    case 'resend': if (s.last?.text) return sendAndConfirm(ctx, s, s.last.jid, { text: s.last.text }); return;
    case 'undo':
      if (s.last?.key) { await s.sock.sendMessage(s.last.jid, { delete: s.last.key }); return ctx.reply('↩️ Message supprimé pour tout le monde ✅'); }
      return;
    case 'hist': {
      const [pg = '0', filter = 'all'] = String(extra || '0:all').split(':');
      return showHistory(ctx, s, jid, id, Number(pg), filter);
    }
    case 'refresh': return openConv(ctx, s, jid);
    case 'read': {
      const keys = (s.cache.msgs[jid] || []).filter(e => !e.fromMe).slice(-10).map(e => e.key);
      if (keys.length) await s.sock.readMessages(keys); c.unread = 0;
      return ack(ctx, '👁 Marqué comme lu', true);
    }
    case 'pin': case 'unpin':
      c.fav = act === 'pin'; await s.sock.chatModify({ pin: act === 'pin' }, jid).catch(() => {}); c.pin = c.fav;
      return openConv(ctx, s, jid);
    case 'mute': case 'unmute':
      c.mutedLocal = act === 'mute'; c.muted = act === 'mute';
      await s.sock.chatModify({ mute: act === 'mute' ? 8 * 3600 * 1000 : null }, jid).catch(() => {});
      return openConv(ctx, s, jid);
    case 'arch': case 'unarch':
      await s.sock.chatModify({ archive: act === 'arch', lastMessages: lastKeys(s, jid) }, jid).catch(() => {});
      c.archived = act === 'arch'; return openConv(ctx, s, jid);
    case 'block': case 'unblock':
      await s.sock.updateBlockStatus(jid, act); c.blocked = act === 'block'; return openConv(ctx, s, jid);
    case 'del':
      return screen(ctx, { text: `🗑 <b>Supprimer la conversation avec ${esc(name)} ?</b>`, kb: kb([[b('🗑 Oui, supprimer', `c:delok:${id}`), b('⬅️ Non', `c:open:${id}`)]]) });
    case 'delok':
      await s.sock.chatModify({ delete: true, lastMessages: lastKeys(s, jid) }, jid).catch(() => {});
      delete s.cache.chats[jid]; delete s.cache.msgs[jid];
      return screen(ctx, { text: '🗑 Conversation supprimée ✅', kb: kb([[b('⬅️ Retour', 'l:inbox:0')]]) });
    case 'info': {
      const pic = await s.sock.profilePictureUrl(jid, 'image').catch(() => null);
      let text;
      if (isGroup(jid)) {
        const g = await s.sock.groupMetadata(jid);
        text = `👥 <b>${esc(g.subject)}</b>\n${L}\n👤 Membres : ${g.participants.length}\n👑 Admins : ${g.participants.filter(p => p.admin).length}\n📅 Créé : ${new Date(g.creation * 1000).toLocaleDateString('fr-FR')}\n📝 ${esc(trunc(g.desc || '—', 200))}`;
      } else {
        const st = await s.sock.fetchStatus(jid).catch(() => null);
        const bio = st?.[0]?.status?.status ?? st?.status?.status ?? '—';
        text = `${L}\n👤 <b>INFORMATIONS CONTACT</b>\n${L}\n📛 Nom    : ${esc(name)}\n📞 Numéro : ${esc(numOf(jid))}\n📝 Bio    : « ${esc(trunc(bio, 150))} »\n🔒 Type   : ${s.cache.contacts[jid]?.name ? 'Contact enregistré' : 'Non enregistré'}\n${L}\n📅 Dernière interaction : ${fmtTime(c.ts)}\n💬 Messages en cache : ${(s.cache.msgs[jid] || []).length}`;
      }
      return send(ctx.chat.id, { img: pic, text, kb: kb([[b('⬅️ Retour', `c:open:${id}`)]]) });
    }
    case 'members': case 'admins': {
      const g = await s.sock.groupMetadata(jid);
      const list = g.participants.filter(p => act === 'members' || p.admin).map(p => `${p.admin ? '👑' : '👤'} ${esc(nameOf(s, p.id))} (${esc(numOf(p.phoneNumber || p.id))})`);
      return screen(ctx, { text: `${act === 'members' ? '👥 MEMBRES' : '👑 ADMINS'} — ${esc(g.subject)}\n${L}\n${list.slice(0, 40).join('\n')}${list.length > 40 ? `\n… +${list.length - 40}` : ''}`, kb: kb([[b('⬅️ Retour', `c:open:${id}`)]]) });
    }
  }
}));
async function showHistory(ctx, s, jid, id, pg, filter) {
  const kinds = { media: ['image', 'video', 'sticker'], voice: ['audio'], docs: ['document'], links: ['link'] };
  let arr = (s.cache.msgs[jid] || []).slice().sort((a, b2) => b2.ts - a.ts);
  if (kinds[filter]) arr = arr.filter(e => kinds[filter].includes(e.kind));
  if (filter.startsWith('d')) arr = arr.filter(e => { const d = new Date(e.ts * 1000); return `d${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}` === filter; });
  const per = 12, pages = Math.max(1, Math.ceil(arr.length / per)), page = Math.min(pg, pages - 1);
  const slice = arr.slice(page * per, (page + 1) * per).reverse();
  const range = arr.length ? `${new Date(arr.at(-1).ts * 1000).toLocaleDateString('fr-FR')} → ${new Date(arr[0].ts * 1000).toLocaleDateString('fr-FR')}` : '—';
  const body = slice.map(e => `[${fmtTime(e.ts)}] ${e.fromMe ? '🤖 Moi' : '👤 ' + esc(trunc(e.who, 20))} : ${esc(trunc(e.text, 140))}`).join('\n\n') || 'Aucun message.';
  const nav = [];
  if (page < pages - 1) nav.push(b('⬅️ Plus anciens', `c:hist:${id}:${page + 1}:${filter}`));
  if (page > 0) nav.push(b('➡️ Plus récents', `c:hist:${id}:${page - 1}:${filter}`));
  await screen(ctx, { text: `${L}\n📜 <b>HISTORIQUE — ${esc(nameOf(s, jid))}</b>\n${L}\nTotal messages : ${arr.length}\n📅 Période : ${range}\n${L}\n${body}`, kb: kb([
    ...(nav.length ? [nav] : []),
    [b('🖼 Médias', `c:hist:${id}:0:media`), b('🎤 Vocaux', `c:hist:${id}:0:voice`)], [b('📎 Documents', `c:hist:${id}:0:docs`), b('🔗 Liens', `c:hist:${id}:0:links`)],
    [b('📅 Filtrer par date', `c:hdate:${id}`), b('🔄 Tout', `c:hist:${id}:0:all`)], [b('⬅️ Retour', `c:open:${id}`)],
  ]) });
}
bot.action(/^c:hdate:(\w+)$/, H(async (ctx) => { await ack(ctx); const s = await needWA(ctx); if (!s) return; states.set(ctx.from.id, { type: 'hdate', jid: jidOf(s, ctx.match[1]) }); await ctx.reply('📅 Envoie la date au format JJ/MM/AAAA :', cancelKb); }));

// ═════════════════════════ PARAMETRES ═════════════════════════
async function settingsScreen(ctx) {
  const st = getUser(ctx.from.id).settings;
  const nl = { all: '🔔 Toutes les conversations', none: '🔕 Aucune', groups: '✅ Groupes uniquement', contacts: '✅ Contacts uniquement' }[st.notif];
  await screen(ctx, { img: IMG.cmd, text: `${L}\n⚙️ <b>PARAMÈTRES</b>\n${L}\n🔔 Notifications : ${nl}\n👁 Aperçu messages : ${st.preview ? '✅ Affiché' : '❌ Masqué'}\n✔️ Accusés de lecture auto : ${st.read ? '✅ Activés' : '❌ Désactivés (mode fantôme)'}\n💾 Sauvegarde du cache sur le serveur : ${st.save ? '✅ Activée' : '❌ Désactivée'}\n🌐 Langue : Français`, kb: kb([
    [b('🔔 Notifications', 's:notif'), b('👁 Aperçu ON/OFF', 's:prev')], [b('✔️ Accusés de lecture', 's:read'), b('💾 Sauvegarde', 's:save')],
    [b('🗑 Vider l\'historique', 's:clear')], [b('⬅️ Retour', 'm:dash')],
  ]) });
}
bot.action('m:set', H(async (ctx) => { await ack(ctx); await settingsScreen(ctx); }));
bot.action(/^s:(\w+)$/, H(async (ctx) => {
  const uid = ctx.from.id, u = getUser(uid), st = u.settings, act = ctx.match[1], s = sessions.get(uid);
  await ack(ctx);
  if (act === 'notif') { const order = ['all', 'groups', 'contacts', 'none']; st.notif = order[(order.indexOf(st.notif) + 1) % 4]; }
  if (act === 'prev') st.preview = !st.preview;
  if (act === 'read') st.read = !st.read;
  if (act === 'save') { st.save = !st.save; if (!st.save) fs.rmSync(cacheFile(uid), { force: true }); else if (s) scheduleSave(s); }
  if (act === 'clear' && s) { s.cache.chats = {}; s.cache.msgs = {}; s.cache.contacts = {}; fs.rmSync(cacheFile(uid), { force: true }); await ctx.reply('🗑 Historique en cache vidé ✅'); }
  saveDb();
  await settingsScreen(ctx);
}));

// ═════════════════════════ SAISIES (texte / medias) ═════════════════════════
async function tgDownload(fileId) {
  const url = await bot.telegram.getFileLink(fileId);
  const r = await fetch(url.href);
  if (!r.ok) throw new Error('Téléchargement Telegram échoué');
  return Buffer.from(await r.arrayBuffer());
}
async function buildContent(m, kind) {
  const cap = m.caption || undefined;
  if (kind === 'text') return m.text ? { text: m.text } : null;
  if (kind === 'image') { const f = m.photo?.at(-1); return f ? { image: await tgDownload(f.file_id), caption: cap } : null; }
  if (kind === 'video') { const f = m.video || m.video_note; return f ? { video: await tgDownload(f.file_id), caption: cap } : null; }
  if (kind === 'voice') {
    const f = m.voice || m.audio; if (!f) return null;
    return { audio: await tgDownload(f.file_id), ptt: !!m.voice, mimetype: m.voice ? 'audio/ogg; codecs=opus' : (f.mime_type || 'audio/mpeg') };
  }
  if (kind === 'document') { const f = m.document; return f ? { document: await tgDownload(f.file_id), fileName: f.file_name || 'fichier', mimetype: f.mime_type || 'application/octet-stream', caption: cap } : null; }
  if (kind === 'location') return m.location ? { location: { degreesLatitude: m.location.latitude, degreesLongitude: m.location.longitude } } : null;
  return null;
}
bot.on(['text', 'photo', 'video', 'video_note', 'voice', 'audio', 'document', 'location'], H(async (ctx) => {
  const uid = ctx.from.id, st = states.get(uid);
  if (!st) return;
  const s = sessions.get(uid);
  if (!s?.ready) { states.delete(uid); return ctx.reply('⚠️ WhatsApp non connecté. Tape /pair'); }
  const m = ctx.message, sock = s.sock;
  const wrong = () => ctx.reply('⚠️ Type de message incorrect. Réessaie ou clique ❌ Annuler.', cancelKb);
  switch (st.type) {
    case 'send': {
      const content = await buildContent(m, st.kind); if (!content) return wrong();
      states.delete(uid); return sendAndConfirm(ctx, s, st.jid, content);
    }
    case 'pname': if (!m.text) return wrong(); await sock.updateProfileName(m.text.slice(0, 25)); states.delete(uid); return ctx.reply('✅ Nom du profil modifié.');
    case 'pbio': if (!m.text) return wrong(); await sock.updateProfileStatus(m.text.slice(0, 139)); states.delete(uid); return ctx.reply('✅ Bio modifiée.');
    case 'ppic': {
      const c = await buildContent(m, 'image'); if (!c) return wrong();
      await sock.updateProfilePicture(selfJid(s), c.image); states.delete(uid); return ctx.reply('✅ Photo de profil modifiée.');
    }
    case 'status': {
      const c = await buildContent(m, st.kind); if (!c) return wrong();
      const list = [...new Set([selfJid(s), ...Object.keys(s.cache.contacts).filter(j => j.endsWith('@s.whatsapp.net'))])];
      await sock.sendMessage('status@broadcast', c, { backgroundColor: '#1a1a2e', font: 2, statusJidList: list });
      states.delete(uid); return ctx.reply(`✅ Statut publié (visible par ${list.length} contact(s) connus du bot).`);
    }
    case 'gnum': if (!m.text) return wrong(); return groupNumberAction(ctx, s, st);
    case 'chnum': if (!m.text) return wrong(); return channelNumberAction(ctx, s, st);
    case 'chname': if (!m.text) return wrong(); await sock.newsletterUpdateName(st.jid, m.text); states.delete(uid); return ctx.reply('✅ Nom de la chaîne modifié.');
    case 'chpic': {
      const c = await buildContent(m, 'image'); if (!c) return wrong();
      await sock.newsletterUpdatePicture(st.jid, c.image); states.delete(uid); return ctx.reply('✅ Photo de la chaîne modifiée.');
    }
    case 'chmsg': {
      const c = (await buildContent(m, 'text')) || (await buildContent(m, 'image')) || (await buildContent(m, 'video')); if (!c) return wrong();
      await sock.sendMessage(st.jid, c); states.delete(uid); return ctx.reply('✅ Message publié dans la chaîne.');
    }
    case 'chadd': {
      const code = m.text?.match(/channel\/([\w-]+)/)?.[1]; if (!code) return ctx.reply('⚠️ Lien invalide. Exemple : https://whatsapp.com/channel/XXXX', cancelKb);
      const meta = await sock.newsletterMetadata('invite', code);
      addNews(s, meta.id, meta.name); s.chanMeta[meta.id] = { m: meta, t: Date.now() }; states.delete(uid);
      return ctx.reply(`✅ Chaîne ajoutée : ${meta.name}\nRôle détecté : ${chanRole(meta) || 'inconnu'}`, kb([[b('📊 Mes chaînes', 'm:chn')]]));
    }
    case 'search': {
      if (!m.text) return wrong(); states.delete(uid);
      s.search = runSearch(s, m.text.trim());
      await ctx.reply(`🔍 ${s.search.length} résultat(s) pour « ${m.text.trim()} »`);
      return showList(ctx, s, 'search', 0);
    }
    case 'tpl': if (!m.text) return wrong(); getUser(uid).templates.push(m.text.slice(0, 200)); saveDb(); states.delete(uid); return ctx.reply('✅ Modèle enregistré (⚡ Réponses rapides).');
    case 'hdate': {
      const r = m.text?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!r) return ctx.reply('⚠️ Format attendu : JJ/MM/AAAA', cancelKb);
      states.delete(uid);
      return showHistory(ctx, s, st.jid, ref(s, st.jid), 0, `d${r[3]}${p2(r[2])}${p2(r[1])}`);
    }
  }
}));

bot.catch((err) => console.error('Erreur bot:', err));

// ═════════════════════════ DEMARRAGE ═════════════════════════
for (const id of fs.readdirSync(SESSIONS_DIR)) if (/^\d+$/.test(id)) connectWA(Number(id)).catch(console.error);

bot.launch().then(async () => {
  console.log('Shadow Kira Bot en ligne ✅');
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Démarrer le bot' }, { command: 'menu', description: 'Afficher le menu' }, { command: 'help', description: 'Aide' },
    { command: 'pair', description: 'Appairage WhatsApp' }, { command: 'unpair', description: 'Déconnecter WhatsApp' }, { command: 'wa', description: 'Tableau de bord WhatsApp' },
    { command: 'conversations', description: 'Gérer les conversations' }, { command: 'link', description: 'Obtenir les liens' }, { command: 'contact', description: 'Nous contacter' },
    { command: 'users', description: "Nombre d'utilisateurs" }, { command: 'code', description: 'Codes promo' }, { command: 'premium', description: 'Premium' }, { command: 'shop', description: 'Boutique' },
  ]).catch(() => {});
});
http.createServer((_, res) => res.end('Shadow Kira Bot OK')).listen(process.env.PORT || 3000);
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
  
