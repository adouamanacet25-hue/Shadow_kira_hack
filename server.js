// ☠︎︎༒︎ 𝕊ℍ𝔸𝔻𝕆𝕎 𝕂𝕀ℝ𝔸 𝔹𝕆𝕋 ༒︎☠︎︎ — Telegram (Telegraf) pilote WhatsApp (Baileys)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import http from 'http';
import pino from 'pino';
import { Telegraf, Markup } from 'telegraf';
import makeWASocket, {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, delay, normalizeMessageContent,
} from '@whiskeysockets/baileys';

// ═════════════════════════ IMAGES / LIENS / CONSTANTES ═════════════════════════
// Pour changer l'image d'un écran : remplace l'URL de sa clé dans IMG (.jpg/.png = image, .gif/.mp4 = animation)
const BRAND = '☠︎︎༒︎ 𝕊ℍ𝔸𝔻𝕆𝕎 𝕂𝕀ℝ𝔸 𝔹𝕆𝕋 ༒︎☠︎︎';
const AUTHOR = '⫸𝐌𝐫 𝐊𝐈𝐑𝐀┃𝗧𝗘𝗖𝗛 🌐⫷';
const PREFIX = '.';
const FREE_TRIES = 3;
const TRIAL_DAYS = 90;
const STAR_PRICE = 5; // prix en ⭐️ Telegram Stars pour le premium
const SHOP = [
  { id: 'banp', name: 'Support ban Puissant 🔱', price: 1000 },
  { id: 'banb', name: 'Ban Bot tech 🚫', price: 3000 },
  { id: 'fbot', name: 'Fichier bot 🗂', price: 1500 },
  { id: 'fbug', name: 'Fichier bug bot 🗂', price: 2500 },
  { id: 'fban', name: 'Fichier ban bot 🗂', price: 3000 },
  { id: 'fsite', name: 'Fichier site 📰', price: 1500 },
  { id: 'tgpr', name: 'Telegram premium ⭐️', price: 3500 },
  { id: 'check', name: 'Check ban personnalisable 📌', price: 0 },
  { id: 'learn', name: 'Apprendre création bot', price: 3500 },
];
const SUPPORT_HUB = 'https://t.me/KIRA_SUPPORT_HUB';

const LINKS = {
  tgChannel: 'https://t.me/+mQ3aQpCsEqI0YmY0',
  tgGroup1: 'https://t.me/+2JDC_Be4_ww1N2Vk',
  tgGroup2: 'https://t.me/+Z-P_xjUgJjU0MjM0',
  waChannel: 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X',
  waGroup: 'https://chat.whatsapp.com/IP0nFB79rMDF0nvFSMXtDR',
};

// Tes 5 images ibb.co
const A = 'https://i.ibb.co/QFZ3vpwf/FDE696-C0-FFC0-412-F-8-B2-E-423-DE06691-BF.jpg'; // /start /menu /help
const B = 'https://i.ibb.co/0VG7zNhY/72-C4782-A-F4-D8-40-FD-8-B30-01267-F7-A49-D0.jpg'; // link / contact / user
const C = 'https://i.ibb.co/FbpnMrjy/FA94-BECC-1023-4-CE6-BE69-610-C2389-DC05.png';   // code promo / premium / shop
const D = 'https://i.ibb.co/kVdX4t2S/50129-DBF-78-A2-42-F3-AE55-EC7094467-E08.jpg';   // groupes / chaînes / conversations
const E = 'https://i.ibb.co/BHmMCtCR/4-E77-AADC-6-AF3-46-B8-B279-2176-DE790766.jpg';  // bot WhatsApp (menu, tagall…)

const IMG = {
  // ── Telegram ──
  start: A, menu: A, help: A, users: A,
  pair: A, pairError: A, pairCode: A, connected: A,
  link: B, contact: B,
  code: 'https://i.ibb.co/gb1dDWkH/CA3-C96-E9-D196-47-E1-A233-109-B01-C89-D8-F.jpg',
  premium: 'https://i.ibb.co/PZ9xxdg8/8-A9-B2-F88-3997-4-D16-983-F-D2-A0-D83-D453-B.jpg',
  premiumPaid: 'https://i.ibb.co/PZ9xxdg8/8-A9-B2-F88-3997-4-D16-983-F-D2-A0-D83-D453-B.jpg',
  shop: 'https://i.ibb.co/SDcQpnCw/55-C2-B254-0209-44-D0-96-F2-BA06-F7-C7-AC48.jpg',
  dash: D, profile: D, groups: D, channels: D, convs: D, conv: D, inbox: D, history: D, settings: D, notif: D,
  ok: A, error: A, ask: D,
  // ── WhatsApp ──
  waMenu: E, waConnected: E, waInfo: E, waTag: E, waPing: E, waLink: E,
};

const QUICK = [
  ['👋', 'Salut, je te réponds dès que possible'],
  ['✅', "D'accord 👍"],
  ['⏳', 'Attends un instant stp'],
  ['❌', 'Je ne peux pas pour le moment'],
  ['📞', "Je t'appelle bientôt"],
];
const EMOJIS = ['😀', '😂', '❤️', '👍', '🙏', '🔥', '😍', '🎉'];

// ═════════════════════════ TEXTES (HTML Telegram : & s'écrit &amp;) ═════════════════════════
const T = (() => {
// ☠︎︎༒︎ 𝕊ℍ𝔸𝔻𝕆𝕎 𝕂𝕀ℝ𝔸 𝔹𝕆𝕋 ༒︎☠︎︎ — TEXTES
// Format Telegram = HTML. Un "&" s'écrit &amp; et un "<" s'écrit &lt;.
// Les textes WhatsApp (waXxx) sont du texte WhatsApp : *gras*, _italique_.

const p2 = (n) => String(n).padStart(2, '0');
const dateBox = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())} / ${p2(d.getDate())} / ${p2(d.getMonth() + 1)} / ${d.getFullYear()}`;
const dateShort = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())} — ${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
const bar = (n) => '━'.repeat(n);
const L = bar(22);
const FOOT = '<blockquote>power by Mr Kira tech 🌐</blockquote>';

// ───────────── /start ─────────────
const start = () =>
  `════════════════════════════════════\n   ✦  ${BRAND}  ✦\n════════════════════════════════════\nCREATOR : ${AUTHOR}\n\n` +
  `👋 <b>Bienvenue sur Shadow Kira Bot</b>\nRejoins nos canaux &amp; groupes pour continuer.\n\nTape /menu pour continuer 📜`;

// ───────────── /menu ─────────────
const menu = (botUser) =>
  `${bar(19)}\n ${BRAND}\n⚜️ Auteur : Mr Kira Tech 🌐\n🔗 Lien : https://t.me/${botUser}\n` +
  `╔══════════════════════════╗\n📜 <b>COMMANDES TÉLÉGRAM</b>\n╚══════════════════════════╝\n\n` +
  `▶️ /start ➜ Démarrer le bot\n📋 /menu ➜ Afficher le menu\n❓ /help ➜ Aide\n🔗 /pair ➜ Lancer un appairage WhatsApp\n` +
  `🔌 /unpair ➜ Déconnecter WhatsApp\n🎛 /wa ➜ Tableau de bord WhatsApp\n💬 /conversations ➜ Conversations\n` +
  `📲 /link ➜ Obtenir le lien\n📩 /contact ➜ Nous contacter\n📊 /users ➜ Nombre d'utilisateurs\n` +
  `🔐 /code ➜ Codes promo\n💎 /premium ➜ Payer le bot (${TRIAL_DAYS / 30} mois gratuits)\n🛒 /shop ➜ Outils tech\n\n` +
  `${bar(18)}\nTape /help pour de l'aide\n${bar(18)}\n${FOOT}`;

// ───────────── /help ─────────────
const help = () =>
  `${bar(20)}\n⚡ <b>DÉMARRAGE RAPIDE</b>\n${bar(20)}\n1️⃣ Tapez ➜ /pair\n2️⃣ Envoyez le numéro à connecter à WhatsApp\n3️⃣ Une fois connecté ✅\n` +
  `4️⃣ Vous verrez les commandes pour contrôler ce compte depuis Telegram\n\nNB : ${FREE_TRIES} essais gratuits 🆓\n${bar(19)}`;

// ───────────── /link /contact /users ─────────────
const link = () => `📲 <b>NOS LIENS OFFICIELS</b>\n${L}\nRejoins nos canaux et groupes 👇\n${FOOT}`;
const contact = () => `📩 <b>Support Kira Tech</b>\nClique sur le bouton ci-dessous pour contacter l'équipe.`;
const users = (n, botUser) =>
  `${bar(18)}\n✦  ${BRAND}  ✦\n⚜️ By Mr Kira Tech 🌐\n${bar(19)}\n╔══════════════════════════╗\n👥 Nombre d'utilisateurs : ( <b>${n}</b> ) 🚹🚺\n╚══════════════════════════╝\n🔗 Bot : https://t.me/${botUser}\n<blockquote>Mr Kira tech 🌐</blockquote>`;

// ───────────── /pair ─────────────
const pairUsage = () => `🔗 <b>APPAIRAGE WHATSAPP</b>\n${L}\nUsage :\n<code>/pair 242XXXXXXXX</code>\n\n⚠️ Sans le + devant le numéro.`;
const pairError = () =>
  `⚠️❌ <b>ERREUR : NUMÉRO ERRONÉ</b> ❌⚠️\n${bar(18)}\n🚫 Le numéro que tu as tapé est invalide.\n📲 Format correct : 242XXXXXXXX\n⛔ Sans le (+) devant.\n✅ Exemple : 242XXXXXXXX\n\n🔁 Réessaie : ➜ /pair 242XXXXXXXX\n${bar(19)}\n${FOOT}`;
const pairConsent = (number) =>
  `⚠️ <b>Avant de continuer</b>\n${L}\n• Ce numéro doit être TON numéro.\n• Le bot pourra lire et envoyer des messages sur ce compte.\n• Tu peux tout supprimer avec /unpair.\n\n📲 Numéro : <b>${number}</b>`;
const pairWait = (number, sym) => `📡 Demande en cours pour ${number}… ${sym}`;
const pairCode = (number, code) =>
  `${bar(19)}\n📲 <b>PAIRING CODE</b> pour ${number} ☑️\n${bar(19)}\n╔══════════════════════════╗\n🔑 CODE DE JUMELAGE :\n╚══════════════════════════╝\n\n` +
  `    ┌───────────────┐\n    │  <code>${code}</code>  │\n    └───────────────┘\n\n${bar(22)}\n👉 <b>INSTRUCTIONS :</b>\n${bar(22)}\n` +
  `1️⃣ Envoie ce code au numéro à connecter 📱\n2️⃣ Va dans « Appareils liés » 🔗 ➜ « Lier un appareil » ➕\n3️⃣ Entre ce code pour associer ce bot 🤖\n\n` +
  `${bar(22)}\n✅ Une fois connecté, tape ${PREFIX}menu pour continuer 📜\n${bar(19)}\n${FOOT}`;
const connected = (date = dateBox()) =>
  `✨${bar(20)}✨\n🎊🎉 <b>CONGRATULATIONS !</b> 🎉🎊\n✨${bar(20)}✨\n\n╔══════════════════════════╗\n✅ BOT ➜ Connecté 🤖\n🟢 STATUS ➜ OPEN\n📅 DATE ➜ ${date}\n⚜️ BY ➜ Mr Kira Tech ⚜️\n╚══════════════════════════╝\n${bar(20)}`;
const controlBox = (date = dateBox()) =>
  `╔══════════════════════════╗\n✅ BOT ➜ Connecté 🤖\n🟢 STATUS ➜ OPEN\n📅 DATE ➜ ${date}\n⚜️ BY ➜ Mr Kira Tech ⚜️\n╚══════════════════════════╝`;

// ───────────── Tableau de bord ─────────────
const dashboard = (d) =>
  `<b>BOT :</b> ${BRAND}\n<b>User :</b> +${d.number}\n<b>Statut :</b> OPEN ✅\n\n—————————————————\n<b>LISTE DES GROUPES 👥</b>\n—————————————————\nNombre : [ ${d.groups} ]\nAdmin : [ ${d.gAdmin} ]\n\n` +
  `—————————————————\n<b>LISTE DES CHAÎNES 📊</b>\n—————————————————\nNombre : [ ${d.news} ]\nAdmin : [ ${d.cAdmin} ]\n\n` +
  `—————————————————\n<b>CONVERSATION 💬</b>\n—————————————————\nNombre : [ ${d.total} ]\nContacts non enregistrés : [ ${d.unsaved} ]\n—————————————————`;

// ───────────── Conversations ─────────────
const convMenu = (d) =>
  `${L}\n💬 <b>GESTION DES CONVERSATIONS</b>\n${L}\n<b>BOT  :</b> ${BRAND}\n<b>User :</b> +${d.number}\n<b>Statut :</b> OPEN ✅\n${L}\n` +
  `📊 Total conversations : [ ${d.total} ]\n💬 Non lues : [ ${d.unread} ]\n👤 Contacts : [ ${d.contacts} ]\n👥 Groupes : [ ${d.groups} ]\n📢 Chaînes : [ ${d.news} ]\n${L}`;
const search = () => `${L}\n🔍 <b>RECHERCHE</b>\n${L}\nTape un :\n➜ Nom du contact\n➜ Numéro de téléphone\n➜ Mot-clé dans les messages`;
const sent = (name, date = dateShort()) => `✅ <b>Message envoyé à ${name}</b>\n📅 ${date}`;
const incoming = (d) =>
  `🔔 <b>NOUVEAU MESSAGE</b>\n${bar(20)}\n${d.where}👤 De : ${d.who} (${d.num})\n💬 Message : ${d.text}\n📅 ${dateShort()}`;
const revoked = (n) => `Félicitations 🎊\nCommande : réussie ✅\nAdmins retirés : 🗑\nNombre 📊 : [ ${n} ]`;

// ───────────── Premium / codes / shop ─────────────
const premium = (status) =>
  `💎 <b>PREMIUM BOT</b> 🌐\n${L}\n${status}\n\n` +
  `✅ ${TRIAL_DAYS / 30} mois gratuits\n📲 Paiement via : [ ⭐️ Stars ]\n📲 Paiement par achat directement au support : [ 📩 Support ]\n${L}`;
const premiumDenied = () =>
  `🚫 <b>ACCÈS REFUSÉ</b> ❌\n${L}\nTes essais gratuits sont épuisés.\n💎 Paye premium pour continuer.\n${L}`;
const premiumPaid = (price, username) =>
  `🎊 <b>ACHAT EFFECTUÉ</b> ✅\n${L}\n🏷 Prix ➜ ${price}⭐️\n💎 Bot ➜ 🟢\n👤 User ➜ ${username}\n${L}\n` +
  `NB : accès illimité de ${TRIAL_DAYS / 30} mois au bot 🤖 merci 🤩\n\n<blockquote>Merci beaucoup 😊</blockquote>`;
const code = () => `🔐 <b>CODES PROMO</b>\n${L}\nEntre ton code :\n<code>/code TONCODE</code>\n\nExemple : <code>/code KIRA25</code>\n${FOOT}`;
const codeOk = (n) => `✅ <b>Code validé</b>\n+${n} essai(s) gratuit(s) ajouté(s).`;
const codeBad = () => '❌ Code invalide ou déjà utilisé.';
const shopHeader = (lines) =>
  `🛒 <b>BOUTIQUE KIRA TECH</b> 🌐\n─────────────────\n${lines}\n─────────────────\n👇 Clique sur un achat`;
const shopItem = (name, price) =>
  `🛍 <b>${name}</b>\n${L}\n🏷 Prix : ${price === 0 ? 'Gratuit' : price + ' f'}\n${L}\nChoisis une option :`;
const shopDemand = (user, name, price) => `.shop achat demander de ${user} de ${name} prix 🏷 ${price === 0 ? 'Gratuit' : price + ' f'}`;

// ───────────── WhatsApp (texte WhatsApp, pas HTML) ─────────────
const waConnected = (date = dateBox()) =>
  `▉ *KIRA TECH SHADOW B0T* 🌹▉\n\n╔══════════════════════════╗\n║   🎭  KIRA TECH SHADOW  🎭   ║\n╚══════════════════════════╝\n\n` +
  `┌──────────────────────────┐\n│  ✅  BOT         ➜  Connecté 🤖\n│  🟢  STATUS      ➜  OPEN\n│  📅  DATE        ➜  ${date}\n│  ⚜️  AUTEUR      ➜  Mr Kira Tech 🌐\n│  🔧  PREFIX      ➜  [ ${PREFIX} ]\n└──────────────────────────┘\n\nTape *${PREFIX}menu* pour voir les commandes 📜`;
const waMenu = () =>
  `▉ *KIRA TECH SHADOW B0T* 🌹▉\n\n╔══════════════════════════╗\n   📜 *MENU WHATSAPP*\n╚══════════════════════════╝\n\n` +
  `${PREFIX}menu ➜ Afficher ce menu\n${PREFIX}ping ➜ Vitesse du bot\n${PREFIX}tagall ➜ Mentionner tout le groupe\n${PREFIX}hidetag texte ➜ Mention cachée\n${PREFIX}link ➜ Lien d'invitation du groupe\n${PREFIX}infos ➜ Infos du groupe\n\n` +
  `➠ Auteur : Mr Kira Tech 🌐\n➠ Prefix : [ ${PREFIX} ]\n> power by Mr Kira tech 🌐`;
  return { dateBox, dateShort, L, FOOT, start, menu, help, link, contact, users, pairUsage, pairError, pairConsent, pairWait, pairCode, connected, controlBox, dashboard, convMenu, search, sent, incoming, revoked, premium, premiumDenied, premiumPaid, code, codeOk, codeBad, shopHeader, shopItem, shopDemand, waConnected, waMenu };
})();

const { L, FOOT } = T;

// ═════════════════════════ CONFIG (variables d'environnement) ═════════════════════════
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN manquant');
const SUPPORT_URL = process.env.SUPPORT_URL || 'https://t.me/';
const ADMIN_ID = Number(process.env.ADMIN_ID || 0);
const DATA_DIR = process.env.DATA_DIR || './data';
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const DB_FILE = path.join(DATA_DIR, 'users.json');
[SESSIONS_DIR, CACHE_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
const PAGE = 8;

// ═════════════════════════ BASE DE DONNEES ═════════════════════════
let db = { users: {}, codes: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch {}
db.codes.KIRA25 ||= { tries: 3, used: {} }; // code promo permanent
const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const DEFAULT_SETTINGS = { notif: 'all', preview: true, read: false, save: false };
function getUser(id) {
  const u = (db.users[id] ||= { tries: 0, joinedAt: Date.now() });
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
const fmtTime = (ts) => {
  if (!ts) return '--:--';
  const d = new Date(ts * 1000), n = new Date();
  return d.toDateString() === n.toDateString() ? `${p2(d.getHours())}:${p2(d.getMinutes())}` : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
};
const userPart = (jid) => String(jid || '').split('@')[0].split(':')[0];
const numOf = (jid) => '+' + userPart(jid);
const isGroup = (jid) => String(jid).endsWith('@g.us');
const isLid = (jid) => String(jid).endsWith('@lid');
// WhatsApp masque parfois le vrai numéro derrière un identifiant "@lid" (confidentialité).
// On retrouve le vrai numéro via les membres de groupe déjà chargés (p.phoneNumber).
function realNum(s, jid) {
  if (!isLid(jid)) return numOf(jid);
  const pn = s.lidMap?.get(userPart(jid));
  return pn ? '+' + userPart(pn) : numOf(jid) + ' (ID WhatsApp)';
}
function learnLids(s, participants) {
  for (const p of participants || []) {
    if (p.id && isLid(p.id) && p.phoneNumber) (s.lidMap ||= new Map()).set(userPart(p.id), p.phoneNumber);
    if (p.lid && p.phoneNumber) (s.lidMap ||= new Map()).set(userPart(p.lid), p.phoneNumber);
  }
}
const PRES_LABEL = { available: '🟢 En ligne', composing: '✍️ En train d\'écrire…', recording: '🎤 Enregistre un vocal…', unavailable: '⚪ Hors ligne', paused: '⚪ Hors ligne' };
const b = (t, d) => Markup.button.callback(t, d);
const kb = (rows) => Markup.inlineKeyboard(rows);
const cancelKb = kb([[b('❌ Annuler', 'cancel')]]);
const logger = pino({ level: 'silent' });
const bot = new Telegraf(BOT_TOKEN);
const sessions = new Map(); // telegramId -> session WhatsApp
const states = new Map();   // telegramId -> saisie en attente

// ───────── Envoi Telegram : image + texte + boutons ─────────
async function send(chatId, { img, text, kb: markup }) {
  const extra = { parse_mode: 'HTML', ...(markup || {}) };
  if (img) {
    try {
      const fn = /\.(gif|mp4)(\?|$)/i.test(img) ? 'sendAnimation' : 'sendPhoto';
      if (text.length <= 1000) return await bot.telegram[fn](chatId, img, { caption: text, ...extra });
      await bot.telegram[fn](chatId, img); // texte trop long pour une légende : image puis texte
    } catch (e) { console.error('Image KO:', e.message); }
  }
  return bot.telegram.sendMessage(chatId, text.slice(0, 4000), { ...extra, link_preview_options: { is_disabled: true } });
}
const chatOf = (to) => (typeof to === 'object' ? to.chat.id : to);
const say = (to, key, text, markup) => send(chatOf(to), { img: IMG[key] || IMG.start, text, kb: markup });
const show = (ctx, key, text, markup) => { // navigation : remplace le message du bouton
  if (ctx.callbackQuery) ctx.deleteMessage().catch(() => {});
  return say(ctx, key, text, markup);
};
const ok = (ctx, text, markup) => say(ctx, 'ok', text, markup);
const ask = (ctx, text) => say(ctx, 'ask', text, cancelKb);
const H = (fn) => async (ctx, next) => {
  try { await fn(ctx, next); } catch (e) {
    console.error(e);
    await say(ctx, 'error', `❌ <b>Erreur</b>\n${esc(e?.message || e)}`).catch(() => {});
  }
};
const ack = (ctx, t, alert = false) => ctx.answerCbQuery(t, { show_alert: alert }).catch(() => {});

// ───────── Petite animation de chargement (message modifié en boucle) ─────────
async function loader(chatId, textFn) {
  const syms = ['🔄', '🔃', '⏳', '⌛'];
  let i = 0;
  const m = await bot.telegram.sendMessage(chatId, textFn(syms[0])).catch(() => null);
  const t = setInterval(() => {
    i++;
    if (m) bot.telegram.editMessageText(chatId, m.message_id, undefined, textFn(syms[i % 4])).catch(() => {});
  }, 700);
  return async () => { clearInterval(t); if (m) await bot.telegram.deleteMessage(chatId, m.message_id).catch(() => {}); };
}

// ═════════════════════════ SESSION WHATSAPP ═════════════════════════
const cacheFile = (uid) => path.join(CACHE_DIR, `${uid}.json`);
function newSession(uid) {
  const empty = { chats: {}, msgs: {}, contacts: {}, news: {} };
  let cache = empty;
  if (getUser(uid).settings.save) { try { cache = { ...empty, ...JSON.parse(fs.readFileSync(cacheFile(uid), 'utf8')) }; } catch {} }
  for (const j of getUser(uid).channels) cache.news[j] ||= {};
  return { uid, sock: null, ready: false, number: null, cache, refs: new Map(), rev: new Map(), cur: null, last: null,
    groups: {}, gmeta: {}, chanMeta: {}, search: [], fresh: false, done: new Set(), timer: null,
    lidMap: new Map(), presence: new Map() };
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
  const link = (t) => (/https?:\/\//i.test(t) ? 'link' : 'text');
  if (c.conversation) return { kind: link(c.conversation), text: c.conversation };
  if (c.extendedTextMessage) { const t = c.extendedTextMessage.text || ''; return { kind: link(t), text: t }; }
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
  if (!arr.some((x) => x.id === e.id)) { arr.push(e); if (arr.length > 300) arr.shift(); }
  if (jid.endsWith('@newsletter')) { addNews(s, jid); return e; }
  const c = (s.cache.chats[jid] ||= { jid, unread: 0, ts: 0 });
  if (e.ts >= (c.ts || 0)) { c.ts = e.ts; c.text = e.text; c.fromMe = e.fromMe; }
  if (live && !e.fromMe) c.unread = (c.unread || 0) + 1;
  scheduleSave(s);
  return e;
}
const selfJid = (s) => userPart(s.sock.user?.id) + '@s.whatsapp.net';
const selfIds = (s) => [userPart(s.sock.user?.id), userPart(s.sock.user?.lid)].filter(Boolean);
const isMe = (s, p) => { const me = selfIds(s); return me.includes(userPart(p.id)) || me.includes(userPart(p.lid)) || me.includes(userPart(p.phoneNumber)); };
const adminRole = (g, s) => g.participants.find((p) => isMe(s, p))?.admin || null; // 'admin' | 'superadmin' | null
async function fetchGroups(s) {
  const all = await s.sock.groupFetchAllParticipating();
  s.groups = all;
  for (const g of Object.values(all)) { ingestChat(s, { id: g.id, name: g.subject }); learnLids(s, g.participants); }
  return Object.values(all);
}
async function groupName(s, jid) {
  const n = s.cache.chats[jid]?.name;
  if (n) return n;
  try { const md = await s.sock.groupMetadata(jid); s.gmeta[jid] = md; ingestChat(s, { id: jid, name: md.subject }); learnLids(s, md.participants); return md.subject; } catch { return 'Groupe'; }
}
async function groupMeta(s, jid) {
  const md = s.gmeta[jid] || await s.sock.groupMetadata(jid);
  s.gmeta[jid] = md; learnLids(s, md.participants);
  return md;
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

// ───────── WhatsApp : message avec image + légende (repli texte si l'image échoue) ─────────
async function waSay(sock, jid, key, text, extra = {}, opts = {}) {
  try { return await sock.sendMessage(jid, { image: { url: IMG[key] || IMG.waMenu }, caption: text, ...extra }, opts); }
  catch { return sock.sendMessage(jid, { text, ...extra }, opts); }
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
        await say(uid, 'connected', T.connected()).catch(() => {});
        await say(uid, 'connected', T.controlBox()).catch(() => {});
        await waSay(sock, selfJid(s), 'waConnected', T.waConnected()).catch(() => {});
        setTimeout(() => showDashboard(uid, null).catch(() => {}), 7000);
      }
    }
    if (connection === 'close') {
      s.ready = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        fs.rmSync(dir, { recursive: true, force: true });
        sessions.delete(uid);
        return say(uid, 'error', '🔌 WhatsApp a été déconnecté.\nRefais /pair pour te reconnecter.').catch(() => {});
      }
      if (state.creds.registered || code === DisconnectReason.restartRequired) {
        setTimeout(() => connectWA(uid).catch(console.error), 3000);
      } else {
        fs.rmSync(dir, { recursive: true, force: true });
        sessions.delete(uid);
        say(uid, 'error', '⌛ Pairage expiré ou échoué.\nRefais /pair.').catch(() => {});
      }
    }
  });

  sock.ev.on('messaging-history.set', ({ chats = [], contacts = [], messages = [] }) => {
    contacts.forEach((c) => ingestContact(s, c));
    chats.forEach((c) => ingestChat(s, c));
    messages.forEach((m) => ingestMsg(s, m, false));
  });
  sock.ev.on('presence.update', ({ presences }) => { for (const [k, v] of Object.entries(presences || {})) s.presence.set(k, v); });
  sock.ev.on('contacts.upsert', (cs) => cs.forEach((c) => ingestContact(s, c)));
  sock.ev.on('contacts.update', (cs) => cs.forEach((c) => ingestContact(s, c)));
  sock.ev.on('chats.upsert', (cs) => cs.forEach((c) => ingestChat(s, c)));
  sock.ev.on('chats.update', (cs) => cs.forEach((c) => ingestChat(s, c)));
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) {
      try {
        const e = ingestMsg(s, m, type === 'notify');
        if (!e) continue;
        if (e.fromMe) {
          if ((e.kind === 'text' || e.kind === 'link') && e.text.startsWith(PREFIX) && !s.done.has(e.id) && Date.now() / 1000 - e.ts < 90) {
            s.done.add(e.id);
            await waCommand(s, m, e);
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
async function waCommand(s, m, e) {
  const sock = s.sock, jid = m.key.remoteJid;
  const [cmd, ...args] = e.text.slice(PREFIX.length).trim().split(/\s+/);
  const say2 = (key, text, extra) => waSay(sock, jid, key, text, extra, { quoted: m });
  switch (cmd.toLowerCase()) {
    case 'menu': return say2('waMenu', T.waMenu());
    case 'ping': return say2('waPing', `🏓 *Pong !*\n⚡ Vitesse : ${Math.max(0, Date.now() - e.ts * 1000)} ms\n🟢 Statut : OPEN`);
    case 'tagall': case 'hidetag': case 'link': case 'infos': {
      if (!isGroup(jid)) return say2('waInfo', '⚠️ Commande réservée aux groupes.');
      const g = await groupMeta(s, jid);
      const mentions = g.participants.map((p) => p.id);
      if (cmd === 'tagall') return say2('waTag', `📢 *TAG ALL*\n${args.join(' ')}\n\n` + mentions.map((j) => `@${userPart(j)}`).join('\n'), { mentions });
      if (cmd === 'hidetag') return say2('waTag', args.join(' ') || '📢', { mentions });
      if (cmd === 'link') return say2('waLink', `🔗 *Lien du groupe*\nhttps://chat.whatsapp.com/${await sock.groupInviteCode(jid)}`);
      return say2('waInfo', `👥 *${g.subject}*\n👤 Membres : ${g.participants.length}\n👑 Admins : ${g.participants.filter((p) => p.admin).length}\n📅 Créé : ${new Date(g.creation * 1000).toLocaleDateString('fr-FR')}`);
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
  const id = ref(s, jid);
  await say(s.uid, 'notif', T.incoming({
    where: grp ? `👥 Groupe : ${esc(await groupName(s, jid))}\n` : '',
    who: esc(m.pushName || nameOf(s, m.key.participant || jid)),
    num: esc(realNum(s, m.key.participant || jid)),
    text: st.preview ? `« ${esc(trunc(e.text, 500))} »` : '(aperçu masqué)',
  }), kb([[b('✍️ Répondre', `c:reply:${id}`), b('📜 Ouvrir la conversation', `c:open:${id}`)], [b('🔕 Mute cette conversation', `c:mute:${id}`), b('🗑 Supprimer', `c:del:${id}`)]]));
}

// ═════════════════════════ MIDDLEWARE ═════════════════════════
bot.use(async (ctx, next) => {
  if (!ctx.from) return;
  if (ctx.message?.text?.startsWith('/')) states.delete(ctx.from.id); // une commande annule la saisie en attente
  return next();
});
const needWA = async (ctx) => {
  const s = sessions.get(ctx.from.id);
  if (s?.ready) return s;
  if (ctx.callbackQuery) await ack(ctx, '⚠️ Aucun WhatsApp connecté. Tape /pair', true);
  else await say(ctx, 'error', '⚠️ Aucun WhatsApp connecté.\nTape <code>/pair 242XXXXXXXX</code>');
  return null;
};

// ═════════════════════════ COMMANDES DE BASE ═════════════════════════
const linkRows = () => [
  [Markup.button.url('📢 Suivre la chaîne Telegram', LINKS.tgChannel)],
  [Markup.button.url('1️⃣ Rejoindre le groupe 1', LINKS.tgGroup1)],
  [Markup.button.url('2️⃣ Rejoindre le groupe 2', LINKS.tgGroup2)],
  [Markup.button.url('📢 Suivre la chaîne WhatsApp', LINKS.waChannel)],
  [Markup.button.url('🌐 Rejoindre le groupe WhatsApp', LINKS.waGroup)],
];
bot.start(H(async (ctx) => {
  getUser(ctx.from.id); saveDb();
  await say(ctx, 'start', T.start(), kb([...linkRows(), [b('📋 Ouvrir le menu', 'm:menu')]]));
}));
const menuKb = kb([[b('🎛 Tableau de bord', 'm:dash'), b('💬 Conversations', 'm:conv')], [b('🔗 Appairer WhatsApp', 'm:pairhelp')]]);
bot.command('menu', H((ctx) => say(ctx, 'menu', T.menu(ctx.botInfo.username), menuKb)));
bot.action('m:menu', H(async (ctx) => { await ack(ctx); await show(ctx, 'menu', T.menu(ctx.botInfo.username), menuKb); }));
bot.action('m:pairhelp', H(async (ctx) => { await ack(ctx); await say(ctx, 'pair', T.pairUsage()); }));
bot.command('help', H((ctx) => say(ctx, 'help', T.help())));
bot.command('link', H((ctx) => say(ctx, 'link', T.link(), kb(linkRows()))));
bot.command('contact', H((ctx) => say(ctx, 'contact', T.contact(), kb([[Markup.button.url('💬 Contacter le support', SUPPORT_URL)]]))));
bot.command('users', H((ctx) => {
  const u = ctx.botInfo.username;
  return say(ctx, 'users', T.users(Object.keys(db.users).length, u), kb([[Markup.button.url('📤 Partager le lien du bot', `https://t.me/share/url?url=https://t.me/${u}`)]]));
}));
bot.action('cancel', H(async (ctx) => { states.delete(ctx.from.id); await ack(ctx, 'Annulé'); ctx.deleteMessage().catch(() => {}); }));

// ═════════════════════════ PAIRING ═════════════════════════
bot.command('pair', H(async (ctx) => {
  const raw = ctx.message.text.split(/\s+/)[1] || '';
  if (!raw) return say(ctx, 'pair', T.pairUsage());
  const number = raw.replace(/\D/g, '');
  if (raw.includes('+') || number.length < 8 || number.length > 15) return say(ctx, 'pairError', T.pairError());
  const u = getUser(ctx.from.id);
  if (!isPremium(u) && u.tries >= FREE_TRIES) return showPremiumDenied(ctx);
  if (sessions.get(ctx.from.id)?.ready) return say(ctx, 'error', "ℹ️ Un WhatsApp est déjà lié.\nTape /unpair d'abord.");
  await say(ctx, 'pair', T.pairConsent(number), kb([[b("✅ J'accepte", `pair:${number}`), b('❌ Annuler', 'cancel')]]));
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
  ctx.deleteMessage().catch(() => {});
  const stop = await loader(ctx.chat.id, (sym) => T.pairWait(number, sym));
  try {
    const { pairingCode } = await connectWA(uid, { number, fresh: true });
    await stop();
    const code = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
    await say(ctx, 'pairCode', T.pairCode(number, code), kb([[{ text: '📄 Copier', copy_text: { text: code } }, b('⛔ Check', 'check')]]));
  } catch (e) {
    console.error(e);
    await stop();
    sessions.delete(uid);
    fs.rmSync(path.join(SESSIONS_DIR, String(uid)), { recursive: true, force: true });
    await say(ctx, 'error', '❌ Impossible de générer le code.\nRéessaie dans quelques minutes.');
  }
}));
bot.action('check', (ctx) => ack(ctx, `📊 Numéros connectés au bot : ${[...sessions.values()].filter((x) => x.ready).length}`, true));
bot.command('unpair', H(async (ctx) => {
  const uid = ctx.from.id, s = sessions.get(uid);
  if (s?.sock) { try { await s.sock.logout(); } catch {} }
  sessions.delete(uid);
  fs.rmSync(path.join(SESSIONS_DIR, String(uid)), { recursive: true, force: true });
  fs.rmSync(cacheFile(uid), { force: true });
  await ok(ctx, '🔌 WhatsApp déconnecté.\nSession et cache supprimés ✅');
}));

// ═════════════════════════ PREMIUM (Telegram Stars ⭐️) / CODES / SHOP ═════════════════════════
const premiumKb = () => kb([[b('💳 Payer', 'pr:pay'), b('🔐 Code promo', 'pr:code')]]);
async function showPremium(ctx) {
  const u = getUser(ctx.from.id);
  const st = isPremium(u) ? `🟢 Premium actif jusqu'au ${new Date(u.premiumUntil).toLocaleDateString('fr-FR')}` : '⚪ Pas de premium actif';
  await say(ctx, 'premium', T.premium(st), premiumKb());
}
async function showPremiumDenied(ctx) {
  await say(ctx, 'premium', T.premiumDenied(), kb([[b('🔐 /code promos', 'pr:code'), b('💶 Acheter un code promo', 'pr:buycode')]]));
}
bot.command('premium', H((ctx) => showPremium(ctx)));
bot.action('pr:pay', H(async (ctx) => {
  await ack(ctx);
  await ctx.replyWithInvoice({
    title: 'Premium Shadow Kira Bot',
    description: `Accès illimité au bot pendant ${TRIAL_DAYS / 30} mois (appairages WhatsApp illimités, support prioritaire).`,
    payload: `premium_${ctx.from.id}_${Date.now()}`,
    provider_token: '', // Telegram Stars : aucun provider_token
    currency: 'XTR',
    prices: [{ label: `Premium ${TRIAL_DAYS / 30} mois`, amount: STAR_PRICE }],
  }).catch(async (e) => {
    console.error('Invoice KO:', e.message);
    await say(ctx, 'error', "⚠️ Paiement par Stars indisponible pour le moment.\nUtilise 📩 Support pour payer autrement.", kb([[Markup.button.url('📩 Support', SUPPORT_URL)]]));
  });
}));
bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true).catch(() => {}));
bot.use(async (ctx, next) => { // capte le paiement Stars avant tout autre traitement de message
  const sp = ctx.update?.message?.successful_payment;
  if (sp) {
    const u = getUser(ctx.from.id);
    u.premiumUntil = Date.now() + TRIAL_DAYS * 86400000; u.trialUsed = true; saveDb();
    const username = ctx.from.username ? '@' + ctx.from.username : ctx.from.first_name;
    await say(ctx, 'premiumPaid', T.premiumPaid(sp.total_amount, esc(username)), kb([[b('Utiliser le bot 🤖', 'pr:use')]])).catch(() => {});
    return;
  }
  return next();
});
bot.action('pr:use', H(async (ctx) => { await ack(ctx); await say(ctx, 'pair', T.pairUsage()); }));
bot.action('pr:code', H(async (ctx) => { await ack(ctx); await say(ctx, 'code', T.code()); }));
bot.action('pr:buycode', H(async (ctx) => { await ack(ctx); await say(ctx, 'error', '💶 Pour acheter un code promo, contacte le support.', kb([[Markup.button.url('📩 Support', SUPPORT_URL)]])); }));
bot.command('code', H(async (ctx) => {
  const c = (ctx.message.text.split(/\s+/)[1] || '').toUpperCase();
  if (!c) return say(ctx, 'code', T.code());
  const entry = db.codes[c], u = getUser(ctx.from.id);
  if (!entry) return say(ctx, 'error', T.codeBad());
  entry.used ||= {};
  if (entry.used[ctx.from.id]) return say(ctx, 'error', T.codeBad());
  entry.used[ctx.from.id] = true; u.tries = Math.max(0, u.tries - entry.tries); saveDb();
  await ok(ctx, T.codeOk(entry.tries), kb([[b('🔗 Tenter /pair', 'pr:use')]]));
}));
bot.command('addcode', H(async (ctx) => {
  if (!ADMIN_ID || ctx.from.id !== ADMIN_ID) return;
  const [, code, n] = ctx.message.text.split(/\s+/);
  if (!code) return ok(ctx, 'Usage : <code>/addcode CODE NOMBRE_ESSAIS</code>');
  db.codes[code.toUpperCase()] = { tries: Number(n) || 1, used: {} }; saveDb();
  await ok(ctx, `✅ Code <b>${esc(code.toUpperCase())}</b> créé (+${Number(n) || 1} essais).`);
}));

// ───────────── /shop ─────────────
bot.command('shop', H(async (ctx) => {
  const lines = SHOP.map((p, i) => `* ${p.name} — [ ${p.price === 0 ? '0 f' : p.price + ' f'} ]`).join('\n');
  const rows = [];
  for (let i = 0; i < SHOP.length; i += 2) rows.push(SHOP.slice(i, i + 2).map((p) => b(trunc(p.name, 24), `sh:${p.id}`)));
  rows.push([Markup.button.url('📩 Support', SUPPORT_HUB)]);
  await say(ctx, 'shop', T.shopHeader(lines), kb(rows));
}));
bot.action('sh:back', H(async (ctx) => { await ack(ctx); ctx.deleteMessage().catch(() => {}); await bot.telegram.sendMessage(ctx.chat.id, 'Tape /shop pour revoir la boutique.'); }));
bot.action(/^sh:buy:(\w+)$/, H(async (ctx) => {
  await ack(ctx);
  const item = SHOP.find((p) => p.id === ctx.match[1]);
  if (!item) return;
  const username = ctx.from.username ? '@' + ctx.from.username : ctx.from.first_name;
  const demand = T.shopDemand(username, item.name, item.price);
  await show(ctx, 'shop', `🛍 <b>Demande d'achat prête</b>\n${L}\n<code>${esc(demand)}</code>\n\nCopie ce message et colle-le dans le groupe achats 👇`, kb([
    [{ text: '📄 Copier la demande', copy_text: { text: demand } }], [Markup.button.url('👥 Ouvrir le groupe achats', LINKS.tgGroup2)], [Markup.button.url('📩 Support', SUPPORT_HUB)],
  ]));
}));
bot.action(/^sh:(\w+)$/, H(async (ctx) => {
  await ack(ctx);
  const item = SHOP.find((p) => p.id === ctx.match[1]);
  if (!item) return;
  await show(ctx, 'shop', T.shopItem(esc(item.name), item.price), kb([
    [b('🛍 Acheter', `sh:buy:${item.id}`), Markup.button.url('📩 Support', SUPPORT_HUB)], [b('⬅️ Retour', 'sh:back')],
  ]));
}));

// ═════════════════════════ TABLEAU DE BORD ═════════════════════════
async function showDashboard(uid, ctx) {
  const s = sessions.get(uid);
  if (!s?.ready) return;
  const stop = ctx ? await loader(uid, (sym) => `${sym} Chargement du tableau de bord…`) : null;
  let groups = [], gAdmin = 0;
  try { groups = await fetchGroups(s); gAdmin = groups.filter((g) => adminRole(g, s)).length; } catch {}
  const news = Object.keys(s.cache.news);
  let cAdmin = 0;
    await Promise.allSettled(news.slice(0, 30).map(async (j) => { if (isChanAdmin(await chanMeta(s, j))) cAdmin++; }));
  const indiv = Object.values(s.cache.chats).filter((c) => !isGroup(c.jid));
  const text = T.dashboard({
    number: esc(s.number), groups: groups.length, gAdmin, news: news.length, cAdmin,
    total: Object.keys(s.cache.chats).length, unsaved: indiv.filter((c) => !s.cache.contacts[c.jid]?.name).length,
  });
  const markup = kb([
    [b('👤 Modifier le profil', 'm:prof')], [b('👥 Gérer les groupes admin', 'm:grp')], [b('📊 Gérer les chaînes admin', 'm:chn')],
    [b('💬 Lire les conversations', 'm:conv')], [b('⚙️ Paramètres', 'm:set'), b('🔄 Rafraîchir', 'm:dash')],
  ]);
  if (stop) await stop();
  return ctx ? show(ctx, 'dash', text, markup) : say(uid, 'dash', text, markup);
}
bot.command('wa', H(async (ctx) => { if (await needWA(ctx)) await showDashboard(ctx.from.id, ctx); }));
bot.action('m:dash', H(async (ctx) => { await ack(ctx); if (await needWA(ctx)) await showDashboard(ctx.from.id, ctx); }));

// ═════════════════════════ PROFIL ═════════════════════════
bot.action('m:prof', H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  await show(ctx, 'profile', `👤 <b>MODIFIER LE PROFIL</b>\n${L}\nQue veux-tu modifier ?`, kb([
    [b('✏️ Nom', 'p:name'), b('🖼 Photo de profil', 'p:pic')], [b('📝 Ajouter un statut', 'p:status'), b('💬 Bio (À propos)', 'p:bio')], [b('⬅️ Retour', 'm:dash')],
  ]));
}));
bot.action(/^p:(\w+)(?::(\w+))?$/, H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  const uid = ctx.from.id, [, act, kind] = ctx.match;
  if (act === 'name') { states.set(uid, { type: 'pname' }); return ask(ctx, '✏️ Envoie le <b>nouveau nom</b> du profil :'); }
  if (act === 'pic') { states.set(uid, { type: 'ppic' }); return ask(ctx, '🖼 Envoie la <b>nouvelle photo</b> de profil :'); }
  if (act === 'bio') { states.set(uid, { type: 'pbio' }); return ask(ctx, '💬 Envoie ta <b>nouvelle bio</b> (À propos) :'); }
  if (act === 'status') {
    return show(ctx, 'profile', `📝 <b>AJOUTER UN STATUT</b>\n${L}\nChoisis le type :`, kb([[b('🔤 Texte', 'p:st:text'), b('🖼 Image', 'p:st:image'), b('📹 Vidéo', 'p:st:video')], [b('⬅️ Retour', 'm:prof')]]));
  }
  if (act === 'st') {
    states.set(uid, { type: 'status', kind });
    return ask(ctx, { text: '🔤 Envoie le <b>texte</b> du statut :', image: "🖼 Envoie l'<b>image</b> du statut (légende optionnelle) :", video: '📹 Envoie la <b>vidéo</b> du statut :' }[kind]);
  }
}));

// ═════════════════════════ GROUPES ═════════════════════════
bot.action('m:grp', H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  await show(ctx, 'groups', `👥 <b>GÉRER LES GROUPES</b>\n${L}\nChoisis une action :`, kb([
    [b('📋 Liste des groupes', 'gp:list:0')], [b('➕ Ajouter un membre', 'gp:add:0')], [b('👑 Nommer un admin', 'gp:promote:0'), b('⬇️ Retirer un admin', 'gp:demote:0')],
    [b('🚪 Quitter le groupe', 'gp:leave:0')], [b('🗑 Révoker tous les admins', 'gp:revoke:0')], [b('⬅️ Retour', 'm:dash')],
  ]));
}));
// Écran détail d'un groupe : nom, membres, admins, lien, écrire, renommer, nommer admin, quitter.
async function openGroup(ctx, s, gid) {
  const id = ref(s, gid);
  let g; try { g = await groupMeta(s, gid); } catch { return say(ctx, 'error', '⚠️ Groupe introuvable ou inaccessible.'); }
  const role = adminRole(g, s);
  const text = `👥 <b>${esc(g.subject)}</b>\n${L}\n👤 Membres : ${g.participants.length}\n👑 Admins : ${g.participants.filter((p) => p.admin).length}\n🔰 Toi : ${role ? 'admin' : 'non admin'}\n📅 Créé : ${new Date(g.creation * 1000).toLocaleDateString('fr-FR')}\n📝 ${esc(trunc(g.desc || '—', 150))}`;
  await show(ctx, 'groups', text, kb([
    [b('✍️ Écrire un message', `g:msg:${id}`), b('👥 Voir les membres', `g:mem:${id}`)],
    [b('👑 Nommer admin', `g:promote:${id}`), b('⬇️ Retirer admin', `g:demote:${id}`)],
    [b('🔗 Lien du groupe', `g:link:${id}`), b('✏️ Renommer', `g:rename:${id}`)],
    [b('🚪 Quitter', `g:leave:${id}`), b('🔄 Rafraîchir', `g:open:${id}`)],
    [b('⬅️ Retour', 'gp:list:0')],
  ]));
}
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
const ADMIN_ACTIONS = ['promote', 'demote', 'revoke'];
bot.action(/^gp:(\w+):(\d+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const [, act, pg] = ctx.match;
  let groups = await fetchGroups(s);
  if (ADMIN_ACTIONS.includes(act)) groups = groups.filter((g) => adminRole(g, s));
  groups.sort((x, y) => x.subject.localeCompare(y.subject));
  if (!groups.length) return show(ctx, 'groups', '⚠️ Aucun groupe disponible pour cette action.', kb([[b('⬅️ Retour', 'm:grp')]]));
  const { slice, page, pages } = paginate(groups, Number(pg));
  const lines = slice.map((g, i) => `${NUM[i]} | <b>${esc(trunc(g.subject, 30))}</b> → ${g.participants.length} → (${adminRole(g, s) ? 'admin' : 'non admin'})`);
  const rows = [];
  const dest = act === 'list' ? 'open' : act;
  for (let i = 0; i < slice.length; i += 2) rows.push(slice.slice(i, i + 2).map((g, k) => b(`${NUM[i + k]} ${trunc(g.subject, 18)}`, `g:${dest}:${ref(s, g.id)}`)));
  const nav = navRow(`gp:${act}`, page, pages); if (nav.length) rows.push(nav);
  rows.push([b('⬅️ Retour', 'm:grp')]);
  const title = { list: '📋 LISTE DES GROUPES', add: '➕ AJOUTER UN MEMBRE', promote: '👑 NOMMER UN ADMIN', demote: '⬇️ RETIRER UN ADMIN', leave: '🚪 QUITTER UN GROUPE', revoke: '🗑 RÉVOQUER LES ADMINS' }[act];
  await show(ctx, 'groups', `<b>${title}</b>\nUser : +${esc(s.number)}\n${L}\n${lines.join('\n')}\n${L}\nPage ${page + 1}/${pages}${act === 'list' ? '' : '\n👇 Choisis un groupe :'}`, kb(rows));
}));
bot.action(/^g:(\w+):(\w+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const [, act, id] = ctx.match, gid = jidOf(s, id), uid = ctx.from.id;
  if (!gid) return say(ctx, 'error', '⌛ Liste expirée.\nRelance /wa.');
  const name = await groupName(s, gid);
  if (act === 'open') return openGroup(ctx, s, gid);
  if (act === 'msg') { states.set(uid, { type: 'gmsg', gid }); return ask(ctx, `✍️ Groupe : <b>${esc(name)}</b>\nEnvoie le <b>message</b> (texte, image, vidéo ou document) à publier :`); }
  if (act === 'rename') { states.set(uid, { type: 'grename', gid }); return ask(ctx, `✏️ Groupe : <b>${esc(name)}</b>\nEnvoie le <b>nouveau nom</b> du groupe :`); }
  if (act === 'mem') {
    const g = await groupMeta(s, gid);
    const list = g.participants.map((p) => `${p.admin ? '👑' : '👤'} ${esc(nameOf(s, p.id))} (${esc(p.phoneNumber ? numOf(p.phoneNumber) : realNum(s, p.id))})`);
    return show(ctx, 'groups', `👥 <b>MEMBRES — ${esc(name)}</b>\n${L}\n${list.slice(0, 50).join('\n')}${list.length > 50 ? `\n… +${list.length - 50}` : ''}`, kb([[b('⬅️ Retour', `g:open:${id}`)]]));
  }
  if (act === 'link') {
    try {
      const code = await s.sock.groupInviteCode(gid);
      return show(ctx, 'groups', `🔗 <b>Lien d'invitation</b>\nGroupe : ${esc(name)}\n${L}\nhttps://chat.whatsapp.com/${code}`, kb([[{ text: '📄 Copier le lien', copy_text: { text: `https://chat.whatsapp.com/${code}` } }], [b('⬅️ Retour', `g:open:${id}`)]]));
    } catch { return say(ctx, 'error', '⚠️ Impossible de récupérer le lien.\nIl faut être admin du groupe.', kb([[b('⬅️ Retour', `g:open:${id}`)]])); }
  }
  if (act === 'add' || act === 'promote' || act === 'demote') {
    states.set(uid, { type: 'gnum', act, gid });
    const hint = act === 'add' ? '📲 Envoie le <b>numéro à ajouter</b> (format international)\nEx : +242 06 123 45 67' : '📲 Envoie le <b>numéro du membre</b> (format international)';
    return ask(ctx, `👥 Groupe : <b>${esc(name)}</b>\n${hint}`);
  }
  if (act === 'leave') {
    return show(ctx, 'groups', `🚪 <b>Quitter « ${esc(name)} » ?</b>`, kb([[b('🗑 Quitter', `g:leaveok:${id}`), b('❌ Quitter + Supprimer', `g:leavedel:${id}`)], [b('⬅️ Retour', 'm:grp')]]));
  }
  if (act === 'leaveok' || act === 'leavedel') {
    await s.sock.groupLeave(gid);
    if (act === 'leavedel') {
      const last = s.cache.msgs[gid]?.at(-1);
      if (last) await s.sock.chatModify({ delete: true, lastMessages: [{ key: last.key, messageTimestamp: last.ts }] }, gid).catch(() => {});
      delete s.cache.chats[gid]; delete s.cache.msgs[gid];
    }
    return show(ctx, 'groups', `✅ Tu as quitté « ${esc(name)} »${act === 'leavedel' ? ' et la conversation a été supprimée' : ''}.`, kb([[b('⬅️ Retour', 'm:grp')]]));
  }
  if (act === 'revoke') {
    return show(ctx, 'groups', `🗑 <b>Retirer tous les admins de « ${esc(name)} » ?</b>\nLe créateur et ton propre compte ne sont jamais retirés.`, kb([[b('🗑 Retirer tous les admins', `g:revokeok:${id}`)], [b('⬅️ Retour', 'm:grp')]]));
  }
  if (act === 'revokeok') {
    const g = await groupMeta(s, gid);
    const targets = g.participants.filter((p) => p.admin === 'admin' && !isMe(s, p)).map((p) => p.id);
    for (let i = 0; i < targets.length; i += 20) await s.sock.groupParticipantsUpdate(gid, targets.slice(i, i + 20), 'demote');
    return show(ctx, 'groups', T.revoked(targets.length), kb([[b('⬅️ Retour', 'm:grp')]]));
  }
}));
async function groupNumberAction(ctx, s, st) {
  const jid = await resolveNumber(s, ctx.message.text);
  if (!jid) return ask(ctx, '❌ Numéro invalide ou absent de WhatsApp.\nRéessaie (format international) ou clique ❌ Annuler.');
  states.delete(ctx.from.id);
  const name = esc(await groupName(s, st.gid));
  const res = await s.sock.groupParticipantsUpdate(st.gid, [jid], st.act);
  const status = String(res?.[0]?.status || '');
  let msg;
  if (status === '200') msg = { add: '✅ Membre ajouté', promote: '👑 Nommé admin', demote: '⬇️ Admin retiré' }[st.act] + ` : ${esc(numOf(jid))} → ${name}`;
  else if (status === '409') msg = 'ℹ️ Cette personne est déjà dans le groupe.';
  else if (status === '403' && st.act === 'add') {
    const code = await s.sock.groupInviteCode(st.gid);
    await s.sock.sendMessage(jid, { text: `Tu es invité(e) à rejoindre « ${await groupName(s, st.gid)} » : https://chat.whatsapp.com/${code}` });
    msg = "🔗 Ajout direct impossible (confidentialité) : lien d'invitation envoyé en privé.";
  } else if (status === '408') msg = '⚠️ Impossible : la personne a quitté récemment le groupe.';
  else msg = `⚠️ Échec (code ${esc(status || 'inconnu')}).\nVérifie que tu es admin du groupe.`;
  await say(ctx, 'groups', msg, kb([[b('⬅️ Retour au groupe', `g:open:${ref(s, st.gid)}`)], [b('⬅️ Menu groupes', 'm:grp')]]));
}

// ═════════════════════════ CHAÎNES ═════════════════════════
bot.action(/^m:chn$|^np:(\d+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const jids = Object.keys(s.cache.news);
  const metas = await Promise.all(jids.map(async (j) => { try { return await chanMeta(s, j); } catch { return null; } }));
  const items = jids.map((j, i) => ({ jid: j, name: metas[i]?.name || s.cache.news[j]?.name || 'Chaîne', subs: metas[i]?.subscribers, role: chanRole(metas[i]) }));
  const { slice, page, pages } = paginate(items, Number(ctx.match[1] || 0));
  const lines = slice.map((c, i) => `${NUM[i]} <b>${esc(trunc(c.name, 28))}</b> — (${c.subs ?? '?'} abonnés) — ${c.role === 'OWNER' ? 'propriétaire' : c.role === 'ADMIN' ? 'admin' : c.role ? 'abonné' : '?'}`);
  const rows = [];
  for (let i = 0; i < slice.length; i += 2) rows.push(slice.slice(i, i + 2).map((c, k) => b(`${NUM[i + k]} ${trunc(c.name, 18)}`, `n:open:${ref(s, c.jid)}`)));
  const nav = navRow('np', page, pages); if (nav.length) rows.push(nav);
  rows.push([b('➕ Ajouter une chaîne (lien)', 'n:add:0'), b('🆕 Créer une chaîne', 'n:create:0')], [b('⬅️ Retour', 'm:dash')]);
  await show(ctx, 'channels', `📊 <b>LISTE DES CHAÎNES</b>\n${L}\n${lines.join('\n') || 'Aucune chaîne détectée pour le moment.\nUtilise ➕ pour ajouter une chaîne avec son lien.'}\n${L}\nPage ${page + 1}/${pages}`, kb(rows));
}));
bot.action(/^n:(\w+):(\w+)$/, H(async (ctx) => {
  await ack(ctx); const s = await needWA(ctx); if (!s) return;
  const uid = ctx.from.id, [, act, id] = ctx.match;
  if (act === 'add') { states.set(uid, { type: 'chadd' }); return ask(ctx, '🔗 Envoie le <b>lien de ta chaîne</b> (https://whatsapp.com/channel/…) :'); }
  if (act === 'create') { states.set(uid, { type: 'chcreate' }); return ask(ctx, '🆕 Envoie le <b>nom</b> de la nouvelle chaîne :'); }
  const jid = jidOf(s, id);
  if (!jid) return say(ctx, 'error', '⌛ Liste expirée.\nRouvre le menu des chaînes.');
  const meta = await chanMeta(s, jid).catch(() => null);
  const name = meta?.name || s.cache.news[jid]?.name || 'Chaîne';
  const back = [b('⬅️ Retour', `n:open:${id}`)];
  switch (act) {
    case 'open':
      return show(ctx, 'channels', `📢 <b>CHAÎNE : ${esc(name)}</b>\n${L}\n👥 Abonnés : ${meta?.subscribers ?? '?'}\n🔰 Rôle : ${chanRole(meta) || 'inconnu'}\n${L}`, kb([
        [b('👤 Modifier le profil', `n:prof:${id}`)], [b('👑 Nommer admin', `n:admin:${id}`), b('🔱 Nommer propriétaire', `n:owner:${id}`)],
        [b('🗑 Retirer un admin', `n:demote:${id}`), b('📜 Voir messages', `n:msgs:${id}`)], [b('🚪 Quitter la chaîne', `n:leave:${id}`)], [b('⬅️ Retour', 'm:chn')],
      ]));
    case 'prof':
      return show(ctx, 'channels', `👤 <b>PROFIL DE LA CHAÎNE</b>\n${esc(name)}`, kb([[b('✏️ Nom', `n:name:${id}`), b('🖼 Photo', `n:pic:${id}`)], [b('💬 Envoyer un message', `n:msg:${id}`)], back]));
    case 'name': states.set(uid, { type: 'chname', jid }); return ask(ctx, '✏️ Envoie le <b>nouveau nom</b> de la chaîne :');
    case 'pic': states.set(uid, { type: 'chpic', jid }); return ask(ctx, '🖼 Envoie la <b>nouvelle photo</b> de la chaîne :');
    case 'msg': states.set(uid, { type: 'chmsg', jid }); return ask(ctx, '💬 Envoie le <b>message</b> (texte, image ou vidéo) à publier dans la chaîne :');
    case 'admin': states.set(uid, { type: 'chnum', act: 'admin', jid }); return ask(ctx, '👑 Envoie le <b>numéro à nommer admin</b> :');
    case 'owner': states.set(uid, { type: 'chnum', act: 'owner', jid }); return ask(ctx, '🔱 Envoie le <b>numéro du futur propriétaire</b>\n⚠️ Tu perds la propriété de la chaîne.');
    case 'demote': states.set(uid, { type: 'chnum', act: 'demote', jid }); return ask(ctx, "🗑 Envoie le <b>numéro de l'admin à retirer</b> :");
    case 'msgs': {
      const arr = (s.cache.msgs[jid] || []).slice(-10);
      const t = arr.length ? arr.map((e) => `[${fmtTime(e.ts)}] ${esc(trunc(e.text, 150))}`).join('\n\n') : 'Aucun message en cache pour cette chaîne.';
      return show(ctx, 'channels', `📜 <b>${esc(name)}</b>\n${L}\n${t}`, kb([back]));
    }
    case 'leave':
      return show(ctx, 'channels', `🚪 <b>Quitter « ${esc(name)} » ?</b>`, kb([[b('🗑 Quitter', `n:leaveok:${id}`), b('❌ Quitter + Supprimer', `n:leavedel:${id}`)], back]));
    case 'leaveok': case 'leavedel': {
      if (act === 'leavedel') await s.sock.newsletterDelete(jid); else await s.sock.newsletterUnfollow(jid);
      delete s.cache.news[jid]; const u = getUser(uid); u.channels = u.channels.filter((j) => j !== jid); saveDb();
      return show(ctx, 'channels', act === 'leavedel' ? '✅ Chaîne supprimée.' : '✅ Tu as quitté la chaîne.', kb([[b('⬅️ Retour', 'm:chn')]]));
    }
  }
}));
async function channelNumberAction(ctx, s, st) {
  const jid = await resolveNumber(s, ctx.message.text);
  if (!jid) return ask(ctx, '❌ Numéro invalide ou absent de WhatsApp.\nRéessaie ou clique ❌ Annuler.');
  states.delete(ctx.from.id);
  const sock = s.sock;
  if (st.act === 'admin') {
    const fn = sock.newsletterAdminInvite || sock.newsletterPromote;
    if (typeof fn !== 'function') return say(ctx, 'channels', "⚠️ Cette version de Baileys ne permet pas encore d'inviter un admin de chaîne.\nFais-le depuis WhatsApp.");
    await fn.call(sock, st.jid, jid);
    return ok(ctx, `👑 Invitation admin envoyée à ${esc(numOf(jid))} ✅`);
  }
  if (st.act === 'owner') { await sock.newsletterChangeOwner(st.jid, jid); return ok(ctx, `🔱 Propriété transférée à ${esc(numOf(jid))} ✅`); }
  if (st.act === 'demote') { await sock.newsletterDemote(st.jid, jid); return ok(ctx, `🗑 ${esc(numOf(jid))} n'est plus admin ✅`); }
}

// ═════════════════════════ CONVERSATIONS ═════════════════════════
const TITLES = { inbox: '📥 BOÎTE DE RÉCEPTION', unread: '🔵 NON LUS', favs: '⭐ CONVERSATIONS FAVORIS', archives: '🗑 ARCHIVES', groups: '👥 GROUPES', contacts: '👤 CONTACTS', sent: '📤 MESSAGES ENVOYÉS', search: '🔍 RÉSULTATS' };
function chatItems(s, kind) {
  const chats = Object.values(s.cache.chats);
  const toItem = (c) => ({ jid: c.jid, name: nameOf(s, c.jid), ts: c.ts, text: c.text, unread: c.unread, icon: isGroup(c.jid) ? '👥' : '👤', pin: c.pin || c.fav });
  const byTs = (x, y) => (y.ts || 0) - (x.ts || 0);
  const byName = (x, y) => x.name.localeCompare(y.name);
  switch (kind) {
    case 'inbox': return chats.filter((c) => !c.archived).map(toItem).sort(byTs);
    case 'unread': return chats.filter((c) => c.unread > 0 && !c.archived).map(toItem).sort(byTs);
    case 'favs': return chats.filter((c) => c.pin || c.fav).map(toItem).sort(byTs);
    case 'archives': return chats.filter((c) => c.archived).map(toItem).sort(byTs);
    case 'groups': return chats.filter((c) => isGroup(c.jid)).map(toItem).sort(byName);
    case 'contacts': return Object.entries(s.cache.contacts).filter(([j]) => j.endsWith('@s.whatsapp.net')).map(([j, c]) => ({ jid: j, name: c.name, icon: '👤' })).sort(byName);
    case 'sent': return Object.entries(s.cache.msgs).flatMap(([j, arr]) => arr.filter((e) => e.fromMe).slice(-5).map((e) => ({ jid: j, name: nameOf(s, j), ts: e.ts, text: e.text, icon: isGroup(j) ? '👥' : '👤' }))).sort(byTs).slice(0, 40);
    case 'search': return s.search;
  }
  return [];
}
async function showList(ctx, s, kind, pg) {
  if (kind === 'groups') await fetchGroups(s).catch(() => {});
  const { slice, page, pages } = paginate(chatItems(s, kind), pg);
  const lines = slice.map((it, i) => `${NUM[i]} ${it.icon} <b>${esc(trunc(it.name, 26))}</b>${it.ts ? ' — ' + fmtTime(it.ts) : ''}${it.text ? `\n    « ${esc(trunc(it.text, 40))} » ${it.unread > 0 ? '🔵' : '⚪'}${it.pin ? ' ⭐' : ''}` : ''}`);
  const rows = [];
  for (let i = 0; i < slice.length; i += 4) rows.push(slice.slice(i, i + 4).map((it, k) => b(NUM[i + k], `c:open:${ref(s, it.jid)}`)));
  const nav = navRow(`l:${kind}`, page, pages); if (nav.length) rows.push(nav);
  rows.push([b('🔄 Rafraîchir', `l:${kind}:${page}`), ...(kind === 'inbox' || kind === 'unread' ? [b('🔍 Filtrer', 'm:filter')] : [])]);
  rows.push([b('⬅️ Retour', 'm:conv')]);
  const legend = kind === 'inbox' ? '\nLégende : 🔵 non lu | ⚪ lu | ⭐ épinglé' : '';
  await show(ctx, 'inbox', `${L}\n<b>${TITLES[kind]}</b>\n${L}\n${lines.join('\n') || 'Rien à afficher.'}\n${L}\nPage ${page + 1}/${pages}${legend}`, kb(rows));
}
async function convMenu(ctx, s) {
  const chats = Object.values(s.cache.chats);
  await show(ctx, 'convs', T.convMenu({
    number: esc(s.number), total: chats.length, unread: chats.filter((c) => c.unread > 0).length, contacts: Object.keys(s.cache.contacts).length,
    groups: chats.filter((c) => isGroup(c.jid)).length, news: Object.keys(s.cache.news).length,
  }), kb([
    [b('📥 Boîte de réception', 'l:inbox:0'), b('📤 Messages envoyés', 'l:sent:0')], [b('👤 Contacts', 'l:contacts:0'), b('👥 Groupes', 'l:groups:0')],
    [b('📢 Chaînes', 'm:chn'), b('🔍 Rechercher', 'm:search')], [b('⭐ Favoris', 'l:favs:0'), b('🗑 Archives', 'l:archives:0')], [b('⬅️ Retour', 'm:dash')],
  ]));
}
bot.command('conversations', H(async (ctx) => { if (await needWA(ctx)) await convMenu(ctx, sessions.get(ctx.from.id)); }));
bot.action('m:conv', H(async (ctx) => { await ack(ctx); const s = await needWA(ctx); if (s) await convMenu(ctx, s); }));
bot.action(/^l:(\w+):(\d+)$/, H(async (ctx) => { await ack(ctx); const s = await needWA(ctx); if (s) await showList(ctx, s, ctx.match[1], Number(ctx.match[2])); }));
bot.action('m:filter', H(async (ctx) => {
  await ack(ctx);
  await show(ctx, 'inbox', '🔍 <b>Filtrer la boîte de réception</b>', kb([[b('🔵 Non lus', 'l:unread:0'), b('🕒 Récents', 'l:inbox:0'), b('⭐ Importants', 'l:favs:0')], [b('⬅️ Retour', 'm:conv')]]));
}));
bot.action('m:search', H(async (ctx) => {
  await ack(ctx); if (!await needWA(ctx)) return;
  states.set(ctx.from.id, { type: 'search' });
  await ask(ctx, T.search());
}));
function runSearch(s, q) {
  q = q.toLowerCase();
  const digits = q.replace(/\D/g, '');
  const out = [];
  for (const j of new Set([...Object.keys(s.cache.chats), ...Object.keys(s.cache.contacts)])) {
    if (!j.endsWith('@s.whatsapp.net') && !isGroup(j)) continue;
    const nameHit = nameOf(s, j).toLowerCase().includes(q) || (digits.length > 3 && userPart(j).includes(digits));
    const hits = (s.cache.msgs[j] || []).filter((e) => e.text.toLowerCase().includes(q)).length;
    if (nameHit || hits) out.push({ jid: j, name: nameOf(s, j), icon: isGroup(j) ? '👥' : '👤', text: hits ? `${hits} résultat(s)` : '', ts: s.cache.chats[j]?.ts });
  }
  return out.sort((x, y) => (y.ts || 0) - (x.ts || 0));
}
async function convText(s, jid, limit = 12) {
  const arr = (s.cache.msgs[jid] || []).slice().sort((x, y) => x.ts - y.ts).slice(-limit);
  const c = s.cache.chats[jid] || {};
  let head;
  if (isGroup(jid)) {
    let g; try { g = await groupMeta(s, jid); } catch {}
    head = `👥 <b>GROUPE : ${esc(nameOf(s, jid))}</b>\n${L}\n👤 Membres : ${g?.participants?.length ?? '?'}\n👑 Admins : ${g ? g.participants.filter((p) => p.admin).length : '?'}\n📅 Dernier message : ${fmtTime(c.ts)}`;
  } else {
    s.sock.presenceSubscribe(jid).catch(() => {});
    const pres = s.presence.get(jid);
    const statusLine = pres ? (PRES_LABEL[pres.lastKnownPresence] || PRES_LABEL.unavailable) : '⚪ Inconnu';
    head = `💬 <b>CONVERSATION</b>\n${L}\n👤 Contact : ${esc(nameOf(s, jid))}\n📞 Numéro  : ${esc(realNum(s, jid))}\nStatut  : ${statusLine}\n📅 Dernier message : ${fmtTime(c.ts)}`;
  }
  const body = arr.length ? arr.map((e) => `[${fmtTime(e.ts)}] ${e.fromMe ? '🤖 Moi' : '👤 ' + esc(trunc(e.who, 20))} :\n${esc(trunc(e.text, 160))}`).join('\n\n') : 'Aucun message en cache pour cette conversation (les nouveaux messages apparaîtront ici).';
  return `${head}\n${L}\n📜 <b>HISTORIQUE (${arr.length} derniers messages)</b>\n─────────────────────────\n${body}\n─────────────────────────`;
}
async function openConv(ctx, s, jid) {
  s.cur = jid;
  const id = ref(s, jid), c = (s.cache.chats[jid] ||= { jid, unread: 0, ts: 0 });
  if (getUser(s.uid).settings.read) {
    const keys = (s.cache.msgs[jid] || []).filter((e) => !e.fromMe).slice(-10).map((e) => e.key);
    if (keys.length) s.sock.readMessages(keys).catch(() => {});
    c.unread = 0;
  }
  const grp = isGroup(jid), fav = c.pin || c.fav, mute = c.muted || c.mutedLocal;
  const rows = [
    [b('✍️ Répondre', `c:reply:${id}`), b('🖼 Envoyer image', `c:img:${id}`)], [b('🎤 Envoyer vocal', `c:voc:${id}`), b('📎 Envoyer document', `c:doc:${id}`)],
    [b('📹 Envoyer vidéo', `c:vid:${id}`), b('📍 Envoyer localisation', `c:loc:${id}`)], [b('😀 Emojis', `c:emo:${id}`), b('⚡ Réponses rapides', `c:quick:${id}`)],
    [b('📜 Historique', `c:hist:${id}:0:all`), b('🔄 Rafraîchir', `c:open:${id}`)],
    [b(fav ? '⭐ Retirer favori' : '⭐ Épingler', `c:${fav ? 'unpin' : 'pin'}:${id}`), b(mute ? '🔊 Unmute' : '🔕 Mute', `c:${mute ? 'unmute' : 'mute'}:${id}`)],
    [b(c.archived ? '📤 Désarchiver' : '📥 Archiver', `c:${c.archived ? 'unarch' : 'arch'}:${id}`), b('👁 Marquer lu', `c:read:${id}`)],
    [b('🗑 Supprimer', `c:del:${id}`), grp ? b('🚪 Quitter', `g:leave:${id}`) : b(c.blocked ? '✅ Débloquer' : '🚫 Bloquer', `c:${c.blocked ? 'unblock' : 'block'}:${id}`)],
    [b('👤 Infos', `c:info:${id}`), ...(grp ? [b('👥 Membres', `c:members:${id}`), b('👑 Admins', `c:admins:${id}`)] : [])],
    [b('⬅️ Retour', 'l:inbox:0')],
  ];
  await show(ctx, 'conv', await convText(s, jid), kb(rows));
}
const lastKeys = (s, jid) => { const l = s.cache.msgs[jid]?.at(-1); return l ? [{ key: l.key, messageTimestamp: l.ts }] : []; };
const PROMPT = (n) => ({
  text: `✍️ Envoie ton <b>message</b> à ${n} :`, image: '📸 Envoie la <b>photo</b> à envoyer :', voice: '🎤 Envoie le <b>vocal</b> :',
  video: '📹 Envoie la <b>vidéo</b> :', document: '📎 Envoie le <b>document</b> :', location: '📍 Envoie ta <b>localisation</b> (trombone ➜ Position) :',
});
async function sendAndConfirm(ctx, s, jid, content) {
  const sent = await s.sock.sendMessage(jid, content);
  s.last = { jid, key: sent?.key, text: content.text };
  const id = ref(s, jid);
  await say(ctx, 'ok', T.sent(esc(nameOf(s, jid))), kb([[...(content.text ? [b('🔄 Renvoyer', `c:resend:${id}`)] : []), b('↩️ Annuler', `c:undo:${id}`)], [b('⬅️ Retour', `c:open:${id}`)]]));
}
bot.action(/^c:(\w+):(\w+)(?::(.+))?$/, H(async (ctx) => {
  const s = await needWA(ctx); if (!s) return;
  const [, act, id, extra] = ctx.match, uid = ctx.from.id;
  const jid = jidOf(s, id);
  await ack(ctx);
  if (!jid) return say(ctx, 'error', '⌛ Conversation introuvable (redémarrage ?).\nRouvre-la via /conversations.');
  const c = (s.cache.chats[jid] ||= { jid, unread: 0, ts: 0 });
  const name = nameOf(s, jid), P = PROMPT(esc(name));
  switch (act) {
    case 'open': case 'refresh': return openConv(ctx, s, jid);
    case 'reply': states.set(uid, { type: 'send', kind: 'text', jid }); return ask(ctx, P.text);
    case 'img': states.set(uid, { type: 'send', kind: 'image', jid }); return ask(ctx, P.image);
    case 'voc': states.set(uid, { type: 'send', kind: 'voice', jid }); return ask(ctx, P.voice);
    case 'vid': states.set(uid, { type: 'send', kind: 'video', jid }); return ask(ctx, P.video);
    case 'doc': states.set(uid, { type: 'send', kind: 'document', jid }); return ask(ctx, P.document);
    case 'loc': states.set(uid, { type: 'send', kind: 'location', jid }); return ask(ctx, P.location);
    case 'emo': return show(ctx, 'conv', '😀 <b>Choisis un emoji à envoyer</b>', kb([EMOJIS.slice(0, 4).map((e, i) => b(e, `c:e:${id}:${i}`)), EMOJIS.slice(4).map((e, i) => b(e, `c:e:${id}:${i + 4}`)), [b('⬅️ Retour', `c:open:${id}`)]]));
    case 'e': return sendAndConfirm(ctx, s, jid, { text: EMOJIS[Number(extra)] });
    case 'quick': {
      const rows = [...QUICK.map(([e, t], i) => [b(`${e} ${trunc(t, 34)}`, `c:q:${id}:${i}`)]), ...getUser(uid).templates.map((t, i) => [b(`📝 ${trunc(t, 34)}`, `c:q:${id}:${QUICK.length + i}`)]), [b('➕ Créer un modèle', `c:tpl:${id}`)], [b('⬅️ Retour', `c:open:${id}`)]];
      return show(ctx, 'conv', `⚡ <b>RÉPONSES RAPIDES</b> → ${esc(name)}`, kb(rows));
    }
    case 'q': {
      const i = Number(extra), t = i < QUICK.length ? QUICK[i][1] : getUser(uid).templates[i - QUICK.length];
      return t ? sendAndConfirm(ctx, s, jid, { text: t }) : undefined;
    }
    case 'tpl': states.set(uid, { type: 'tpl' }); return ask(ctx, '📝 Envoie le <b>texte du nouveau modèle</b> de réponse :');
    case 'resend': return s.last?.text ? sendAndConfirm(ctx, s, s.last.jid, { text: s.last.text }) : undefined;
    case 'undo':
      if (s.last?.key) { await s.sock.sendMessage(s.last.jid, { delete: s.last.key }); return ok(ctx, '↩️ Message supprimé pour tout le monde ✅'); }
      return;
    case 'hist': { const [pg = '0', filter = 'all'] = String(extra || '0:all').split(':'); return showHistory(ctx, s, jid, id, Number(pg), filter); }
    case 'hdate': states.set(uid, { type: 'hdate', jid }); return ask(ctx, '📅 Envoie la <b>date</b> au format JJ/MM/AAAA :');
    case 'read': {
      const keys = (s.cache.msgs[jid] || []).filter((e) => !e.fromMe).slice(-10).map((e) => e.key);
      if (keys.length) await s.sock.readMessages(keys);
      c.unread = 0; return ack(ctx, '👁 Marqué comme lu', true);
    }
    case 'pin': case 'unpin':
      c.fav = act === 'pin'; c.pin = c.fav; await s.sock.chatModify({ pin: act === 'pin' }, jid).catch(() => {});
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
      return show(ctx, 'conv', `🗑 <b>Supprimer la conversation avec ${esc(name)} ?</b>`, kb([[b('🗑 Oui, supprimer', `c:delok:${id}`), b('⬅️ Non', `c:open:${id}`)]]));
    case 'delok':
      await s.sock.chatModify({ delete: true, lastMessages: lastKeys(s, jid) }, jid).catch(() => {});
      delete s.cache.chats[jid]; delete s.cache.msgs[jid];
      return show(ctx, 'ok', '🗑 Conversation supprimée ✅', kb([[b('⬅️ Retour', 'l:inbox:0')]]));
    case 'info': {
      const pic = await s.sock.profilePictureUrl(jid, 'image').catch(() => null);
      let text;
      if (isGroup(jid)) {
        const g = await groupMeta(s, jid);
        text = `👥 <b>${esc(g.subject)}</b>\n${L}\n👤 Membres : ${g.participants.length}\n👑 Admins : ${g.participants.filter((p) => p.admin).length}\n📅 Créé : ${new Date(g.creation * 1000).toLocaleDateString('fr-FR')}\n📝 ${esc(trunc(g.desc || '—', 200))}`;
      } else {
        const st = await s.sock.fetchStatus(jid).catch(() => null);
        const bio = st?.[0]?.status?.status ?? st?.status?.status ?? '—';
        text = `${L}\n👤 <b>INFORMATIONS CONTACT</b>\n${L}\n📛 Nom    : ${esc(name)}\n📞 Numéro : ${esc(realNum(s, jid))}\n📝 Bio    : « ${esc(trunc(bio, 150))} »\n🔒 Type   : ${s.cache.contacts[jid]?.name ? 'Contact enregistré' : 'Non enregistré'}\n${L}\n📅 Dernière interaction : ${fmtTime(c.ts)}\n💬 Messages en cache : ${(s.cache.msgs[jid] || []).length}`;
      }
      return send(ctx.chat.id, { img: pic || IMG.conv, text, kb: kb([[b('⬅️ Retour', `c:open:${id}`)]]) });
    }
    case 'members': case 'admins': {
      const g = await groupMeta(s, jid);
      const list = g.participants.filter((p) => act === 'members' || p.admin).map((p) => `${p.admin ? '👑' : '👤'} ${esc(nameOf(s, p.id))} (${esc(p.phoneNumber ? numOf(p.phoneNumber) : realNum(s, p.id))})`);
      return show(ctx, 'conv', `${act === 'members' ? '👥 MEMBRES' : '👑 ADMINS'} — ${esc(g.subject)}\n${L}\n${list.slice(0, 40).join('\n')}${list.length > 40 ? `\n… +${list.length - 40}` : ''}`, kb([[b('⬅️ Retour', `c:open:${id}`)]]));
    }
  }
}));
async function showHistory(ctx, s, jid, id, pg, filter) {
  const kinds = { media: ['image', 'video', 'sticker'], voice: ['audio'], docs: ['document'], links: ['link'] };
  let arr = (s.cache.msgs[jid] || []).slice().sort((x, y) => y.ts - x.ts);
  if (kinds[filter]) arr = arr.filter((e) => kinds[filter].includes(e.kind));
  if (filter.startsWith('d')) arr = arr.filter((e) => { const d = new Date(e.ts * 1000); return `d${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}` === filter; });
  const per = 12, pages = Math.max(1, Math.ceil(arr.length / per)), page = Math.min(pg, pages - 1);
  const slice = arr.slice(page * per, (page + 1) * per).reverse();
  const range = arr.length ? `${new Date(arr.at(-1).ts * 1000).toLocaleDateString('fr-FR')} → ${new Date(arr[0].ts * 1000).toLocaleDateString('fr-FR')}` : '—';
  const body = slice.map((e) => `[${fmtTime(e.ts)}] ${e.fromMe ? '🤖 Moi' : '👤 ' + esc(trunc(e.who, 20))} : ${esc(trunc(e.text, 140))}`).join('\n\n') || 'Aucun message.';
  const nav = [];
  if (page < pages - 1) nav.push(b('⬅️ Plus anciens', `c:hist:${id}:${page + 1}:${filter}`));
  if (page > 0) nav.push(b('➡️ Plus récents', `c:hist:${id}:${page - 1}:${filter}`));
  await show(ctx, 'history', `${L}\n📜 <b>HISTORIQUE — ${esc(nameOf(s, jid))}</b>\n${L}\nTotal messages : [ ${arr.length} ]\n📅 Période : ${range}\n${L}\n${body}`, kb([
    ...(nav.length ? [nav] : []),
    [b('🖼 Médias', `c:hist:${id}:0:media`), b('🎤 Vocaux', `c:hist:${id}:0:voice`)], [b('📎 Documents', `c:hist:${id}:0:docs`), b('🔗 Liens', `c:hist:${id}:0:links`)],
    [b('📅 Filtrer par date', `c:hdate:${id}`), b('🔄 Tout', `c:hist:${id}:0:all`)], [b('⬅️ Retour', `c:open:${id}`)],
  ]));
}

// ═════════════════════════ PARAMETRES ═════════════════════════
async function settingsScreen(ctx) {
  const st = getUser(ctx.from.id).settings;
  const nl = { all: '🔔 Toutes les conversations', none: '🔕 Aucune', groups: '✅ Groupes uniquement', contacts: '✅ Contacts uniquement' }[st.notif];
  await show(ctx, 'settings', `${L}\n⚙️ <b>PARAMÈTRES</b>\n${L}\n🔔 Notifications : ${nl}\n👁 Aperçu messages : ${st.preview ? '✅ Affiché' : '❌ Masqué'}\n✔️ Accusés de lecture auto : ${st.read ? '✅ Activés' : '❌ Désactivés (mode fantôme)'}\n💾 Sauvegarde du cache sur le serveur : ${st.save ? '✅ Activée' : '❌ Désactivée'}\n🌐 Langue : Français`, kb([
    [b('🔔 Notifications', 's:notif'), b('👁 Aperçu ON/OFF', 's:prev')], [b('✔️ Accusés de lecture', 's:read'), b('💾 Sauvegarde', 's:save')],
    [b("🗑 Vider l'historique", 's:clear')], [b('⬅️ Retour', 'm:dash')],
  ]));
}
bot.action('m:set', H(async (ctx) => { await ack(ctx); await settingsScreen(ctx); }));
bot.action(/^s:(\w+)$/, H(async (ctx) => {
  const uid = ctx.from.id, st = getUser(uid).settings, act = ctx.match[1], s = sessions.get(uid);
  await ack(ctx);
  if (act === 'notif') { const order = ['all', 'groups', 'contacts', 'none']; st.notif = order[(order.indexOf(st.notif) + 1) % 4]; }
  if (act === 'prev') st.preview = !st.preview;
  if (act === 'read') st.read = !st.read;
  if (act === 'save') { st.save = !st.save; if (!st.save) fs.rmSync(cacheFile(uid), { force: true }); else if (s) scheduleSave(s); }
  if (act === 'clear' && s) { s.cache.chats = {}; s.cache.msgs = {}; s.cache.contacts = {}; fs.rmSync(cacheFile(uid), { force: true }); await ok(ctx, '🗑 Historique en cache vidé ✅'); }
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
  if (!s?.ready) { states.delete(uid); return say(ctx, 'error', '⚠️ WhatsApp non connecté.\nTape /pair'); }
  const m = ctx.message, sock = s.sock;
  const wrong = () => say(ctx, 'error', '⚠️ Type de message incorrect.\nRéessaie ou clique ❌ Annuler.', cancelKb);
  switch (st.type) {
    case 'send': {
      const content = await buildContent(m, st.kind); if (!content) return wrong();
      states.delete(uid); return sendAndConfirm(ctx, s, st.jid, content);
    }
    case 'pname': if (!m.text) return wrong(); await sock.updateProfileName(m.text.slice(0, 25)); states.delete(uid); return ok(ctx, '✅ Nom du profil modifié.');
    case 'pbio': if (!m.text) return wrong(); await sock.updateProfileStatus(m.text.slice(0, 139)); states.delete(uid); return ok(ctx, '✅ Bio modifiée.');
    case 'ppic': {
      const c = await buildContent(m, 'image'); if (!c) return wrong();
      await sock.updateProfilePicture(selfJid(s), c.image); states.delete(uid); return ok(ctx, '✅ Photo de profil modifiée.');
    }
    case 'status': {
      const c = await buildContent(m, st.kind); if (!c) return wrong();
      const list = [...new Set([selfJid(s), ...Object.keys(s.cache.contacts).filter((j) => j.endsWith('@s.whatsapp.net'))])];
      await sock.sendMessage('status@broadcast', c, { backgroundColor: '#1a1a2e', font: 2, statusJidList: list });
      states.delete(uid); return ok(ctx, `✅ Statut publié (visible par ${list.length} contact(s) connus du bot).`);
    }
    case 'gnum': if (!m.text) return wrong(); return groupNumberAction(ctx, s, st);
    case 'gmsg': {
      const c = (await buildContent(m, 'text')) || (await buildContent(m, 'image')) || (await buildContent(m, 'video')) || (await buildContent(m, 'document')); if (!c) return wrong();
      await sock.sendMessage(st.gid, c); states.delete(uid); return ok(ctx, '✅ Message envoyé dans le groupe.', kb([[b('⬅️ Retour', `g:open:${ref(s, st.gid)}`)]]));
    }
    case 'grename': if (!m.text) return wrong(); await sock.groupUpdateSubject(st.gid, m.text.slice(0, 100)); states.delete(uid); return ok(ctx, '✅ Nom du groupe modifié.', kb([[b('⬅️ Retour', `g:open:${ref(s, st.gid)}`)]]));
    case 'chcreate': if (!m.text) return wrong(); states.set(uid, { type: 'chdesc', name: m.text.slice(0, 50) }); return ask(ctx, '📝 Envoie la <b>description</b> de la chaîne (ou "-" pour aucune) :');
    case 'chdesc': {
      if (!m.text) return wrong();
      const desc = m.text.trim() === '-' ? '' : m.text.slice(0, 200);
      const meta = await sock.newsletterCreate(st.name, desc);
      addNews(s, meta.id, meta.name || st.name); s.chanMeta[meta.id] = { m: meta, t: Date.now() }; states.delete(uid);
      return ok(ctx, `✅ Chaîne créée : <b>${esc(meta.name || st.name)}</b> 🎉`, kb([[b('📊 Mes chaînes', 'm:chn')]]));
    }
    case 'chnum': if (!m.text) return wrong(); return channelNumberAction(ctx, s, st);
    case 'chname': if (!m.text) return wrong(); await sock.newsletterUpdateName(st.jid, m.text); states.delete(uid); return ok(ctx, '✅ Nom de la chaîne modifié.');
    case 'chpic': {
      const c = await buildContent(m, 'image'); if (!c) return wrong();
      await sock.newsletterUpdatePicture(st.jid, c.image); states.delete(uid); return ok(ctx, '✅ Photo de la chaîne modifiée.');
    }
    case 'chmsg': {
      const c = (await buildContent(m, 'text')) || (await buildContent(m, 'image')) || (await buildContent(m, 'video')); if (!c) return wrong();
      await sock.sendMessage(st.jid, c); states.delete(uid); return ok(ctx, '✅ Message publié dans la chaîne.');
    }
    case 'chadd': {
      const code = m.text?.match(/channel\/([\w-]+)/)?.[1];
      if (!code) return say(ctx, 'error', '⚠️ Lien invalide.\nExemple : https://whatsapp.com/channel/XXXX', cancelKb);
      const meta = await sock.newsletterMetadata('invite', code);
      addNews(s, meta.id, meta.name); s.chanMeta[meta.id] = { m: meta, t: Date.now() }; states.delete(uid);
      return ok(ctx, `✅ Chaîne ajoutée : <b>${esc(meta.name)}</b>\nRôle détecté : ${esc(chanRole(meta) || 'inconnu')}`, kb([[b('📊 Mes chaînes', 'm:chn')]]));
    }
    case 'search': {
            if (!m.text) return wrong(); states.delete(uid);
      s.search = runSearch(s, m.text.trim());
      return showList(ctx, s, 'search', 0);
    }
    case 'tpl': if (!m.text) return wrong(); getUser(uid).templates.push(m.text.slice(0, 200)); saveDb(); states.delete(uid); return ok(ctx, '✅ Modèle enregistré (⚡ Réponses rapides).');
    case 'hdate': {
      const r = m.text?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!r) return say(ctx, 'error', '⚠️ Format attendu : JJ/MM/AAAA', cancelKb);
      states.delete(uid);
      return showHistory(ctx, s, st.jid, ref(s, st.jid), 0, `d${r[3]}${p2(r[2])}${p2(r[1])}`);
    }
  }
}));

bot.catch((err) => console.error('Erreur bot:', err));

// ═════════════════════════ DEMARRAGE ═════════════════════════
for (const id of fs.readdirSync(SESSIONS_DIR)) if (/^\d+$/.test(id)) connectWA(Number(id)).catch(console.error);
http.createServer((_, res) => res.end('Shadow Kira Bot OK — ' + new Date().toISOString())).listen(process.env.PORT || 3000);

// Anti-sommeil Render (plan gratuit) : le service s'appelle lui-même toutes les 5 minutes.
// RENDER_EXTERNAL_URL est fourni automatiquement par Render ; SELF_URL en secours ailleurs.
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
if (SELF_URL) {
  setInterval(() => {
    fetch(SELF_URL).then(() => console.log('⏰ Auto-ping OK —', new Date().toLocaleTimeString('fr-FR'))).catch((e) => console.log('⏰ Auto-ping échoué :', e.message));
  }, 5 * 60 * 1000);
} else {
  console.log("⚠️ SELF_URL/RENDER_EXTERNAL_URL absent : le service peut s'endormir sur le plan gratuit Render.");
}

// Telegraf 4 : launch() ne se termine qu'à l'arrêt du bot, d'où le callback de démarrage.
bot.launch({ dropPendingUpdates: true }, async () => {
  console.log('Shadow Kira Bot en ligne ✅');
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Démarrer le bot' }, { command: 'menu', description: 'Afficher le menu' }, { command: 'help', description: 'Aide' },
    { command: 'pair', description: 'Lancer un appairage WhatsApp' }, { command: 'unpair', description: 'Déconnecter WhatsApp' }, { command: 'wa', description: 'Tableau de bord WhatsApp' },
    { command: 'conversations', description: 'Gérer les conversations' }, { command: 'link', description: 'Obtenir le lien' }, { command: 'contact', description: 'Nous contacter' },
    { command: 'users', description: "Nombre d'utilisateurs" }, { command: 'code', description: 'Codes promo' }, { command: 'premium', description: 'Premium' }, { command: 'shop', description: 'Boutique' },
  ]).catch(() => {});
}).catch((e) => { console.error('Lancement impossible :', e.message); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
