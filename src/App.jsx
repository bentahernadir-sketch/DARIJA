import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Users, Copy, Check, Sparkles, Trophy, Play, Share2, Clock,
  CheckCircle2, XCircle, RefreshCw, ArrowRight, Globe, Award,
  Volume2, VolumeX, Bot, Radio, Columns, MessageSquareShare,
  Smile, Link2, Send, Settings, Image as ImageIcon, KeyRound
} from 'lucide-react';

const AVATAR_OPTIONS = ['🦁', '🦅', '⚡', '👑', '🔥', '🇲🇦', '⚽', '🎮', '🧠', '🥷', '🚀', '💎'];
const DARIJA_NICKNAME_PRESETS = ['أسد الأطلس 🦁', 'مايسترو 🎩', 'القناص 🎯', 'ولد البلاد 🇲🇦', 'البطل 🏆', 'صقر المغرب 🦅', 'نينجا الكويز 🥷', 'العلامة 🧠'];
const EMOJI_TAUNTS = ['🔥', '⚡', '😎', '🤯', '😂', '👀', '🏆', '💀'];

const inMemoryRooms = {};
const roomSubscribers = new Set();
let mqttClientInstance = null;

function notifyRoomSubscribers() {
  const waitingList = Object.values(inMemoryRooms).filter((r) => r && r.status === 'waiting');
  roomSubscribers.forEach((cb) => { try { cb(waitingList); } catch (e) {} });
}

function initGlobalMultiplayerSync(onRoomUpdate) {
  if (typeof window === 'undefined') return;
  try {
    const bc = new BroadcastChannel('quizblitz_global_sync_v4');
    bc.onmessage = (ev) => {
      if (ev.data?.roomCode) {
        inMemoryRooms[ev.data.roomCode] = ev.data;
        notifyRoomSubscribers();
        onRoomUpdate(ev.data);
      }
    };
    window.__qbBroadcast = bc;
  } catch (e) {}

  if (!window.mqtt && !document.getElementById('mqtt-cdn-script')) {
    const script = document.createElement('script');
    script.id = 'mqtt-cdn-script';
    script.src = 'https://unpkg.com/mqtt@5.3.4/dist/mqtt.min.js';
    script.async = true;
    script.onload = () => connectMqttBroker(onRoomUpdate);
    document.head.appendChild(script);
  } else if (window.mqtt) {
    connectMqttBroker(onRoomUpdate);
  }
}

function connectMqttBroker(onRoomUpdate) {
  try {
    if (!window.mqtt || mqttClientInstance) return;
    const client = window.mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      clientId: 'qb_v4_' + Math.random().toString(16).substring(2, 10),
      clean: true, connectTimeout: 4000, reconnectPeriod: 4000,
    });
    client.on('connect', () => client.subscribe('quizblitz_v4_global/rooms/+'));
    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data?.roomCode) {
          const current = inMemoryRooms[data.roomCode];
          if (!current || (data.updatedAt && data.updatedAt >= (current.updatedAt || 0))) {
            inMemoryRooms[data.roomCode] = data;
            notifyRoomSubscribers();
            onRoomUpdate(data);
          }
        }
      } catch (e) {}
    });
    mqttClientInstance = client;
  } catch (e) {}
}

function seededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return ((h >>> 0) % 10000) / 10000;
}

class SoundFX {
  constructor() { this.ctx = null; this.muted = false; }
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + duration);
    } catch (e) {}
  }
  click() { this.playTone(540, 'triangle', 0.07, 0.12); }
  lockIn() { this.playTone(660, 'sine', 0.1, 0.14); setTimeout(() => this.playTone(880, 'sine', 0.14, 0.14), 65); }
  taunt() { this.playTone(740, 'sine', 0.08, 0.1); setTimeout(() => this.playTone(980, 'triangle', 0.12, 0.12), 60); }
  correct() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.15, 0.18), i * 85)); }
  wrong() { this.playTone(240, 'sawtooth', 0.16, 0.12); setTimeout(() => this.playTone(180, 'sawtooth', 0.25, 0.12), 130); }
  victory() { [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.18, 0.18), i * 105)); }
}
const sfx = new SoundFX();

const makeQ = (q, options, a, wikiTitle, imageCaption, imageEmoji = '🎯', imageUrl = '') => ({
  q, options, a, wikiTitle, imageKeyword: wikiTitle, imageCaption, imageEmoji, imageUrl,
  imageGradient: 'from-indigo-950 via-slate-900 to-emerald-950'
});

const CURATED_PACKS = {
  morocco: {
    title: '🇲🇦 ثقافة وتاريخ المغرب بالدارجة', badge: 'المغرب',
    questions: [
      makeQ('شنو هي أقدم جامعة فالعالم واللي كاينة فمدينة فاس؟', ['جامعة القرويين', 'جامعة الأخوين', 'جامعة محمد الخامس', 'مدرسة بن يوسف'], 0, 'University_of_al-Qarawiyyin', 'جامع وجامعة القرويين فـ فاس', '🕌'),
      makeQ('أشمن مدينة مغربية معروفة بـ "المدينة الزرقاء"؟', ['الصويرة', 'شفشاون', 'أصيلة', 'إفران'], 1, 'Chefchaouen', 'مدينة شفشاون الزرقاء', '💙'),
      makeQ('شنو هو أعلى جبل فالمغرب وفشمال إفريقيا كامل؟', ['جبل تدغين', 'جبل بويبلان', 'جبل توبقال', 'جبل مكون'], 2, 'Toubkal', 'قمة جبل توبقال (4167 متر)', '🏔️'),
      makeQ('فأشمن مدينة مغربية كاينة صومعة حسان الشهيرة؟', ['مراكش', 'الرباط', 'مكناس', 'طنجة'], 1, 'Hassan_Tower', 'صومعة حسان بالرباط', '🏛️'),
      makeQ('شنو هي الأكلة المراكشية اللي كطيب فـ قلة ديال الطين فـ الفرناطشي؟', ['الطنجية المراكشية', 'البسطيلة', 'الرفيسة', 'الحريرة'], 0, 'Tangia', 'الطنجية المراكشية', '🏺'),
      makeQ('شكون هو الرحالة المغربي الشهير اللي ولد فـ طنجة وسافر العالم فـ القرن 14؟', ['ابن خلدون', 'ابن بطوطة', 'الشريف الإدريسي', 'ابن رشد'], 1, 'Ibn_Battuta', 'الرحالة ابن بطوطة', '🧭'),
      makeQ('فأشمن سنة كانت المسيرة الخضراء المظفرة؟', ['1956', '1975', '1979', '1984'], 1, 'Green_March', 'المسيرة الخضراء 1975', '🇲🇦'),
      makeQ('شنو هي الشجرة اللي كتنبت فـ سوس والصويرة وكنخرجو منها زيت أركان؟', ['شجرة الأرز', 'شجرة أركان (Argan)', 'شجرة الزيتون', 'شجرة الصنوبر'], 1, 'Argania', 'شجرة أركان بالمغرب', '🌳'),
    ],
  },
  football: {
    title: '⚽ الكرة المغربية والعالمية بالدارجة', badge: 'الرياضة',
    questions: [
      makeQ('أشمن منتخب وصل لنصف نهائي كأس العالم 2022 كأول منتخب إفريقي وعربي؟', ['منتخب السنغال', 'المنتخب المغربي (أسود الأطلس)', 'منتخب مصر', 'منتخب تونس'], 1, 'Morocco_national_football_team', 'أسود الأطلس مونديال 2022', '🦁'),
      makeQ('شكون هو الحارس المغربي اللي تألق فـ مونديال 2022 وربح أحسن حارس فـ إفريقيا؟', ['منير المحمدي', 'ياسين بونو (Bono)', 'أنس الزنيتي', 'بادو الزاكي'], 1, 'Yassine_Bounou', 'الحارس ياسين بونو', '🧤'),
      makeQ('أشمن فرقة فـ أوروبا رابحة أكبر عدد ديال Champions League؟', ['AC Milan', 'FC Barcelona', 'Real Madrid', 'Bayern Munich'], 2, 'Real_Madrid_CF', 'ريال مدريد', '🏆'),
      makeQ('شكون سجل هدف الرأسية الخيالي للمغرب ضد البرتغال فـ ربع نهائي مونديال 2022؟', ['حكيم زياش', 'يوسف النصيري', 'سفيان بوفال', 'أشرف حكيمي'], 1, 'Youssef_En-Nesyri', 'يوسف النصيري', '⚽'),
      makeQ('شنو كيتسمى الديربي بين الوداد (WAC) والرجاء (RCA)؟', ['ديربي الشمال', 'ديربي كازابلانكا (البيضاء)', 'كلاسيكو العاصمة', 'ديربي فاس'], 1, 'Casablanca_derby', 'ديربي كازابلانكا', '🔥'),
      makeQ('أشمن دول غادي ينظمو كأس العالم 2030 مع المغرب؟', ['فرنسا وإيطاليا', 'إسبانيا والبرتغال', 'ألمانيا وهولندا', 'البرازيل والأرجنتين'], 1, '2030_FIFA_World_Cup', 'مونديال 2030', '🌍'),
      makeQ('شكون رابح 8 ديال الكرات الذهبية (Ballon d’Or)؟', ['Cristiano Ronaldo', 'Lionel Messi', 'Zinedine Zidane', 'Ronaldinho'], 1, 'Lionel_Messi', 'ليونيل ميسي', '🥇'),
      makeQ('شكون سجل البانينكا الشهيرة للمغرب ضد إسبانيا فـ مونديال 2022؟', ['نصير مزراوي', 'أشرف حكيمي', 'بدر بانون', 'رومان سايس'], 1, 'Achraf_Hakimi', 'أشرف حكيمي', '🐧'),
    ],
  },
  general: {
    title: '🌍 معلومات عامة وتحدي الذكاء بالدارجة', badge: 'ثقافة عامة',
    questions: [
      makeQ('أشمن كوكب كيتسمى "الكوكب الأحمر"؟', ['الزهرة (Venus)', 'المريخ (Mars)', 'المشتري (Jupiter)', 'زحل (Saturn)'], 1, 'Mars', 'كوكب المريخ', '🪐'),
      makeQ('شحال من قلب عند الأخطبوط (Octopus)؟', ['قلب واحد (1)', 'جوج قلوب (2)', 'ثلاثة ديال القلوب (3)', 'أربعة ديال القلوب (4)'], 2, 'Octopus', 'الأخطبوط البحري', '🐙'),
      makeQ('شنو هو المعدن اللي الرمز الكيميائي ديالو Au؟', ['الفضة', 'الذهب (Gold)', 'النحاس', 'البلاتين'], 1, 'Gold', 'معدن الذهب', '🪙'),
      makeQ('شحال كياخد الضو ديال الشمس باش يوصل للأرض؟', ['8 ثواني', '8 دقايق و20 ثانية', 'ساعة كاملة', '24 دقيقة'], 1, 'Sun', 'الشمس', '☀️'),
      makeQ('شنو هي أكبر قارة فالعالم مساحةً وسكاناً؟', ['إفريقيا', 'آسيا', 'أمريكا الشمالية', 'أوروبا'], 1, 'Asia', 'قارة آسيا', '🌏'),
      makeQ('شنو هو أسرع حيوان بري كيجري فـ العالم؟', ['الأسد', 'الفهد الصياد (Cheetah)', 'الغزالة', 'الحصان'], 1, 'Cheetah', 'الفهد الصياد', '🐆'),
      makeQ('أشمن مضيق بحري كيفصل بين المغرب وإسبانيا؟', ['مضيق هرمز', 'مضيق جبل طارق', 'مضيق البوسفور', 'قناة السويس'], 1, 'Strait_of_Gibraltar', 'مضيق جبل طارق', '🚢'),
      makeQ('شكون رسم لوحة "الموناليزا"؟', ['Pablo Picasso', 'Leonardo da Vinci', 'Vincent van Gogh', 'Michelangelo'], 1, 'Mona_Lisa', 'لوحة الموناليزا', '🎨'),
    ],
  },
  gaming: {
    title: '🎮 أفلام، أنمي، و Gaming بالدارجة', badge: 'Geek & Anime',
    questions: [
      makeQ('فـ Minecraft، باش تهرس Obsidian خاصك Pickaxe ديالاش؟', ['الحديد (Iron)', 'الذهب (Gold)', 'الدياموند (Diamond)', 'الحجر (Stone)'], 2, 'Obsidian', 'حجر Obsidian', '⛏️'),
      makeQ('فـ أنمي One Piece، شكون عطى لـ Luffy الشابو ديال القش؟', ['Zoro', 'Shanks', 'Ace', 'Garp'], 1, 'One_Piece', 'أنمي One Piece', '🏴‍☠️'),
      makeQ('شنو سميت الكونسول ديال Sony اللي خرج سنة 2020؟', ['PlayStation 5 (PS5)', 'Xbox Series X', 'Nintendo Switch', 'Steam Deck'], 0, 'PlayStation_5', 'جهاز PS5', '🎮'),
      makeQ('شكون هو البوكيمون الأصفر ديال الكهرباء مع Ash؟', ['Charizard', 'Pikachu', 'Bulbasaur', 'Squirtle'], 1, 'Pikachu', 'بيكاتشو', '⚡'),
      makeQ('أشمن مدينة مستوحاة منها Los Santos فـ GTA V؟', ['Miami', 'Los Angeles', 'New York', 'Chicago'], 1, 'Los_Angeles', 'مدينة لوس أنجلوس', '🌴'),
      makeQ('فـ Harry Potter، شنو هو الحيوان اللي كيوصل البريد لـ هاري؟', ['بومة بيضاء (Snowy Owl)', 'غراب', 'صقر', 'قطة'], 0, 'Snowy_owl', 'البومة الثلجية', '🦉'),
      makeQ('شكون هو البطل الخارق اللي اسمو الحقيقي Tony Stark؟', ['Captain America', 'Iron Man', 'Thor', 'Spider-Man'], 1, 'Iron_Man', 'Iron Man', '🤖'),
      makeQ('شنو هي أكثر لعبة مبيعاً فـ التاريخ ديال البناء بالمكعبات؟', ['Tetris', 'Minecraft', 'FIFA', 'Fortnite'], 1, 'Minecraft', 'لعبة Minecraft', '🧱'),
    ],
  },
};

const wikiImageCache = {};
async function fetchExactSubjectImageFromWikipedia(wikiQuery) {
  if (!wikiQuery) return null;
  const cleanQuery = wikiQuery.trim();
  if (wikiImageCache[cleanQuery]) return wikiImageCache[cleanQuery];
  try {
    const encodedTitle = encodeURIComponent(cleanQuery.replace(/\s+/g, '_'));
    const directRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`);
    if (directRes.ok) {
      const data = await directRes.json();
      const imgUrl = data?.originalimage?.source || data?.thumbnail?.source;
      if (imgUrl) { wikiImageCache[cleanQuery] = imgUrl; return imgUrl; }
    }
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = searchData?.query?.pages;
      if (pages) {
        const thumbUrl = Object.values(pages)[0]?.thumbnail?.source;
        if (thumbUrl) { wikiImageCache[cleanQuery] = thumbUrl; return thumbUrl; }
      }
    }
  } catch (e) {}
  return null;
}

function QuestionPictureBanner({ question, roundNumber }) {
  const [resolvedSrc, setResolvedSrc] = useState(question?.imageUrl || '');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setImgFailed(false);
    setResolvedSrc(question?.imageUrl || '');
    const lookupQuery = question?.wikiTitle || question?.imageKeyword || '';
    if (lookupQuery) {
      fetchExactSubjectImageFromWikipedia(lookupQuery).then((wikiPhoto) => {
        if (isMounted && wikiPhoto) setResolvedSrc((prev) => prev || wikiPhoto);
      });
    }
    return () => { isMounted = false; };
  }, [question?.q, question?.imageUrl, question?.wikiTitle, roundNumber]);

  if (!question) return null;
  const emoji = question.imageEmoji || '🎯';
  const caption = question.imageCaption || question.wikiTitle || `سؤال #${roundNumber}`;

  return (
    <div className="relative w-full h-44 sm:h-56 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 shadow-xl">
      {!imgFailed && resolvedSrc ? (
        <img src={resolvedSrc} alt={caption} onError={() => setImgFailed(true)} className="absolute inset-0 w-full h-full object-cover opacity-90" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-5xl mb-2">{emoji}</div>
          <div className="text-sm font-extrabold text-white/90" dir="rtl">{caption}</div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between" dir="rtl">
        <span className="px-3 py-1 rounded-xl bg-slate-950/85 border border-white/15 text-xs font-bold text-slate-100 truncate">
          {emoji} {caption}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 🔑 قراءة الـ API Key من Vercel / Vite / LocalStorage وتوليد الكويز بـ Gemini
// ============================================================================
function resolveGeminiApiKey(customKey = '') {
  if (customKey && customKey.trim()) return customKey.trim();
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('QB_GEMINI_API_KEY');
    if (saved && saved.trim()) return saved.trim();
  }
  try { if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY.trim(); } catch (e) {}
  try { if (import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY) return import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY.trim(); } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      const k = process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (k) return k.trim();
    }
  } catch (e) {}
  return '';
}

async function generateAIQuizWithGemini(topic, difficulty = 'Medium', count = 8, customKey = '') {
  const cleanTopic = topic.trim();
  const apiKey = resolveGeminiApiKey(customKey);
  if (!apiKey) throw new Error('MISSING_API_KEY');

  const prompt = `أنت منشط مسابقات مغربي. صاوب ${count} أسئلة متعددة الاختيارات (QCM) بالدارجة المغربية حول "${cleanTopic}" (الصعوبة: ${difficulty}).
حط الجواب الصحيح فـ موقع عشوائي (0 أو 1 أو 2 أو 3) وكتب الرقم ديالو فـ "a".
فـ "wikiTitle" كتب اسم الموضوع بالإنجليزية باش نجبدو صورته من ويكيبيديا.
رجع JSON Array فقط:
[{"q":"السؤال بالدارجة؟","options":["1","2","3","4"],"a":0,"wikiTitle":"English Title","imageCaption":"وصف بالدارجة","imageEmoji":"🧠"}]`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let parsedQuestions = null;
  let lastErr = '';

  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        lastErr = data?.error?.message || `HTTP ${res.status}`;
        if (res.status === 400 && lastErr.toLowerCase().includes('api key')) throw new Error('INVALID_API_KEY');
        continue;
      }
      const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = null;
      try { parsed = JSON.parse(cleaned); } catch (e) {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
      }
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.questions)) parsed = parsed.questions;
      if (Array.isArray(parsed) && parsed.length > 0) { parsedQuestions = parsed; break; }
    } catch (err) {
      lastErr = err.message || String(err);
      if (lastErr.includes('INVALID_API_KEY')) throw err;
    }
  }

  if (!parsedQuestions) throw new Error(lastErr || 'GEMINI_FAILED');

  return Promise.all(parsedQuestions.slice(0, count).map(async (item, i) => {
    const wikiTitle = item.wikiTitle || cleanTopic;
    const wikiImg = await fetchExactSubjectImageFromWikipedia(wikiTitle);
    return makeQ(
      item.q || `سؤال ${i + 1} حول ${cleanTopic}؟`,
      Array.isArray(item.options) && item.options.length === 4 ? item.options.map(String) : [cleanTopic, 'اختيار 1', 'اختيار 2', 'اختيار 3'],
      typeof item.a === 'number' && item.a >= 0 && item.a <= 3 ? item.a : 0,
      wikiTitle,
      item.imageCaption || `${cleanTopic} #${i + 1}`,
      item.imageEmoji || '🧠',
      wikiImg || ''
    );
  }));
}

function copyTextToClipboard(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    return true;
  } catch (e) { return false; }
}

const PACK_CODE_MAP = { morocco: 'M', football: 'F', general: 'G', gaming: 'A' };
const CODE_TO_PACK_MAP = { M: 'morocco', F: 'football', G: 'general', A: 'gaming' };

function generateSmartRoomCode(packKey = 'morocco', settings = {}) {
  const pChar = PACK_CODE_MAP[packKey] || 'M';
  const durCode = settings.roundDurationSec === 8 ? '1' : settings.roundDurationSec === 20 ? '3' : settings.roundDurationSec === 30 ? '4' : '2';
  const countChar = String(settings.questionCount || 8);
  const flagsChar = (settings.showPictures !== false ? 2 : 0) + (settings.allowPowerUps !== false ? 1 : 0);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `${pChar}${durCode}${countChar}${flagsChar}${chars[Math.floor(Math.random() * chars.length)]}${chars[Math.floor(Math.random() * chars.length)]}`;
}

function decodeSmartRoomCode(code) {
  const clean = (code || '').trim().toUpperCase();
  const packKey = CODE_TO_PACK_MAP[clean.charAt(0)] || 'morocco';
  const durChar = clean.charAt(1);
  const roundDurationSec = durChar === '1' ? 8 : durChar === '3' ? 20 : durChar === '4' ? 30 : 12;
  const parsedCount = parseInt(clean.charAt(2), 10);
  const questionCount = [4, 6, 8].includes(parsedCount) ? parsedCount : 8;
  const flags = parseInt(clean.charAt(3), 10);
  return {
    packKey,
    settings: {
      roundDurationSec, questionCount,
      showPictures: isNaN(flags) ? true : (flags & 2) !== 0,
      allowPowerUps: isNaN(flags) ? true : (flags & 1) !== 0,
    },
  };
}

async function saveRoomToGlobalCloud(code, stateObj) {
  if (!code || !stateObj) return false;
  inMemoryRooms[code] = stateObj;
  notifyRoomSubscribers();
  try { window.__qbBroadcast?.postMessage(stateObj); } catch (e) {}
  try {
    if (mqttClientInstance?.connected) {
      mqttClientInstance.publish(`quizblitz_v4_global/rooms/${code}`, JSON.stringify(stateObj), { qos: 0, retain: true });
    }
  } catch (e) {}
  return true;
}

function QuizArenaInstance({ user, defaultName = '', sharedOpenRooms = [] }) {
  const [playerName, setPlayerName] = useState(defaultName);
  const [playerAvatar, setPlayerAvatar] = useState('🦁');
  const [view, setView] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [isBotMode, setIsBotMode] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [selectedPack, setSelectedPack] = useState('morocco');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [customApiKey, setCustomApiKey] = useState(() => (typeof window !== 'undefined' ? window.localStorage.getItem('QB_GEMINI_API_KEY') || '' : ''));
  const [showApiKeyBox, setShowApiKeyBox] = useState(false);
  const hasActiveGeminiKey = Boolean(resolveGeminiApiKey(customApiKey));

  const [quizSettings, setQuizSettings] = useState({ roundDurationSec: 12, showPictures: true, questionCount: 8, allowPowerUps: true });
  const activeSettings = sessionData?.settings || quizSettings;
  const ROUND_DURATION = (activeSettings.roundDurationSec || 12) * 1000;

  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundRevealed, setRoundRevealed] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState(null);
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedDoublePoints, setUsedDoublePoints] = useState(false);
  const [activeDoublePoints, setActiveDoublePoints] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]);

  const sessionDataRef = useRef(null);
  useEffect(() => { sessionDataRef.current = sessionData; }, [sessionData]);

  const syncRoomStateEverywhere = async (nextState) => {
    const stamped = { ...nextState, updatedAt: Date.now() };
    sessionDataRef.current = stamped;
    setSessionData(stamped);
    if (stamped.roomCode) saveRoomToGlobalCloud(stamped.roomCode, stamped);
  };

  useEffect(() => {
    initGlobalMultiplayerSync((incoming) => {
      if (incoming && sessionDataRef.current && incoming.roomCode === sessionDataRef.current.roomCode) {
        setSessionData(incoming);
        sessionDataRef.current = incoming;
        if (incoming.status === 'playing') setView('game');
        else if (incoming.status === 'finished') setView('results');
        else if (incoming.status === 'waiting') setView('lobby');
      }
    });
  }, []);

  const currentRound = sessionData?.currentRound ?? 0;
  const matchId = sessionData?.matchId ?? 0;

  useEffect(() => {
    setSelectedOption(null); setRoundRevealed(false); setTimeLeftMs(ROUND_DURATION);
    setHiddenOptions([]); setActiveDoublePoints(false);
  }, [currentRound, matchId, ROUND_DURATION]);

  useEffect(() => {
    if (view !== 'game' || sessionData?.status !== 'playing') return;
    const timer = setInterval(() => {
      const currentS = sessionDataRef.current;
      if (!currentS) return;
      const rem = Math.max(0, ROUND_DURATION - (Date.now() - (currentS.roundStartTime || Date.now())));
      setTimeLeftMs(rem);
      const pList = Object.values(currentS.players || {});
      const rIdx = currentS.currentRound || 0;
      if ((pList.length > 0 && pList.every((p) => p.answers?.[rIdx] !== undefined)) || rem <= 0) {
        setRoundRevealed(true);
      }
    }, 90);
    return () => clearInterval(timer);
  }, [view, sessionData?.status, currentRound, ROUND_DURATION]);

  useEffect(() => {
    if (view !== 'game' || sessionData?.status !== 'playing') return;
    const currentS = sessionDataRef.current;
    const rivalId = isBotMode ? 'bot-rival' : currentS?.players?.['friend-synced'] ? 'friend-synced' : null;
    if (!rivalId || currentS?.players?.[rivalId]?.answers?.[currentRound] !== undefined) return;

    const delayMs = 2200 + seededRandom(`${currentS.roomCode}-${currentRound}`) * 3000;
    const t = setTimeout(() => {
      const latestS = sessionDataRef.current;
      if (!latestS || latestS.status !== 'playing') return;
      const rIdx = latestS.currentRound || 0;
      const qObj = latestS.questions?.[rIdx];
      if (!qObj) return;
      const isCorrect = seededRandom(`${currentS.roomCode}-${rIdx}-acc`) < 0.75;
      const pts = isCorrect ? Math.round(1000 * (1 - (delayMs / ROUND_DURATION) * 0.5)) : 0;
      const rival = latestS.players[rivalId];
      syncRoomStateEverywhere({
        ...latestS,
        players: {
          ...latestS.players,
          [rivalId]: {
            ...rival,
            score: (rival.score || 0) + pts,
            streak: isCorrect ? (rival.streak || 0) + 1 : 0,
            answers: { ...(rival.answers || {}), [rIdx]: { choice: isCorrect ? qObj.a : (qObj.a + 1) % 4, pts, correct: isCorrect } },
          },
        },
      });
    }, delayMs);
    return () => clearTimeout(t);
  }, [view, currentRound, matchId, isBotMode, ROUND_DURATION]);

  const handleCreateRoom = (bot = false) => {
    sfx.click();
    const cleanName = playerName.trim() || `بطل ${playerAvatar}`;
    setPlayerName(cleanName);
    const code = generateSmartRoomCode(selectedPack, quizSettings);
    const qList = CURATED_PACKS[selectedPack].questions.slice(0, quizSettings.questionCount || 8);
    const players = {
      [user.uid]: { id: user.uid, name: cleanName, avatar: playerAvatar, score: 0, streak: 0, isHost: true, answers: {} }
    };
    if (bot) {
      players['bot-rival'] = { id: 'bot-rival', name: 'CyberRival (AI)', avatar: '🤖', score: 0, streak: 0, isHost: false, answers: {} };
    }
    const roomDoc = {
      roomCode: code, hostId: user.uid, hostName: cleanName, status: 'waiting',
      quizTitle: CURATED_PACKS[selectedPack].title, questions: qList, settings: quizSettings,
      currentRound: 0, roundStartTime: Date.now(), matchId: 1, players
    };
    setIsBotMode(bot); setRoomCode(code); setSessionData(roomDoc); sessionDataRef.current = roomDoc;
    setView('lobby');
    if (!bot) saveRoomToGlobalCloud(code, roomDoc);
  };

  const handleJoinRoom = async (rawCode = null) => {
    sfx.click();
    const code = (rawCode || joinInput || '').trim().toUpperCase().slice(0, 10);
    if (code.length < 4) {
      setStatusBanner({ type: 'error', msg: '🔑 كتب كود الروم الصحيح!' });
      return;
    }
    const cleanName = playerName.trim() || `منافس ${playerAvatar}`;
    setPlayerName(cleanName);
    const existing = inMemoryRooms[code];
    if (existing) {
      const updated = {
        ...existing,
        players: { ...existing.players, [user.uid]: { id: user.uid, name: cleanName, avatar: playerAvatar, score: 0, streak: 0, isHost: false, answers: {} } }
      };
      setRoomCode(code); await syncRoomStateEverywhere(updated); setView('lobby');
      return;
    }
    const decoded = decodeSmartRoomCode(code);
    const packObj = CURATED_PACKS[decoded.packKey] || CURATED_PACKS.morocco;
    const syncedDoc = {
      roomCode: code, hostId: user.uid, hostName: cleanName, status: 'waiting',
      quizTitle: packObj.title, questions: packObj.questions.slice(0, decoded.settings.questionCount || 8),
      settings: decoded.settings, currentRound: 0, roundStartTime: Date.now(), matchId: 1,
      players: {
        [user.uid]: { id: user.uid, name: cleanName, avatar: playerAvatar, score: 0, streak: 0, isHost: true, answers: {} },
        'friend-synced': { id: 'friend-synced', name: 'منافسك المباشر ⚡', avatar: '🔥', score: 0, streak: 0, isHost: false, answers: {} }
      }
    };
    setRoomCode(code); await syncRoomStateEverywhere(syncedDoc); setView('lobby');
  };

  const handleGenerateCustomQuiz = async () => {
    if (!aiTopic.trim()) {
      setStatusBanner({ type: 'error', msg: '✍️ كتب الموضوع اللي بغيتي بعدا!' });
      return;
    }
    if (!resolveGeminiApiKey(customApiKey)) {
      setShowApiKeyBox(true);
      setStatusBanner({ type: 'error', msg: '🔑 حط الـ Gemini API Key ديالك فـ الخانة اللي تحلات لتحت باش يخدم فـ البلاصة!' });
      return;
    }
    setIsGeneratingAI(true);
    setStatusBanner({ type: 'info', msg: `✨ Gemini كيصاوب الأسئلة بالدارجة حول "${aiTopic}"...` });
    try {
      const generated = await generateAIQuizWithGemini(aiTopic, aiDifficulty, activeSettings.questionCount || 8, customApiKey);
      const customTitle = `✨ ${aiTopic.trim()} (${aiDifficulty})`;
      if (sessionDataRef.current) {
        await syncRoomStateEverywhere({ ...sessionDataRef.current, quizTitle: customTitle, questions: generated });
      }
      setStatusBanner({ type: 'success', msg: `✅ واجد! تم توليد الكويز "${customTitle}" بـ Gemini AI بنجاح!` });
      sfx.lockIn();
    } catch (err) {
      setShowApiKeyBox(true);
      setStatusBanner({ type: 'error', msg: `⚠️ خطأ فـ Gemini: تأكد من الـ API Key ديالك فـ الخانة لتحت (${err.message})` });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleLockAnswer = async (idx) => {
    const currentS = sessionDataRef.current;
    const me = currentS?.players?.[user.uid];
    if (!me || me.answers?.[currentRound] !== undefined) return;
    setSelectedOption(idx);
    const qObj = currentS.questions[currentRound];
    const isCorrect = idx === qObj.a;
    if (isCorrect) sfx.correct(); else sfx.wrong();
    const elapsed = Math.min(ROUND_DURATION, Math.max(0, Date.now() - (currentS.roundStartTime || Date.now())));
    const basePts = isCorrect ? Math.round(1000 * (1 - (elapsed / ROUND_DURATION) * 0.5)) : 0;
    const pts = activeDoublePoints ? basePts * 2 : basePts;
    await syncRoomStateEverywhere({
      ...currentS,
      players: {
        ...currentS.players,
        [user.uid]: {
          ...me,
          score: (me.score || 0) + pts,
          streak: isCorrect ? (me.streak || 0) + 1 : 0,
          answers: { ...(me.answers || {}), [currentRound]: { choice: idx, pts, correct: isCorrect } }
        }
      }
    });
  };

  const playersList = sessionData?.players ? Object.values(sessionData.players).sort((a, b) => (b.score || 0) - (a.score || 0)) : [];
  const currentQuestion = sessionData?.questions?.[currentRound] || null;
  const myAnswerObj = sessionData?.players?.[user.uid]?.answers?.[currentRound];

  return (
    <div className="w-full space-y-4">
      {statusBanner && (
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${statusBanner.type === 'error' ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : statusBanner.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'}`}>
          <span className="text-xs sm:text-sm font-bold" dir="auto">{statusBanner.msg}</span>
          <button onClick={() => setStatusBanner(null)} className="text-xs px-2 py-0.5 rounded bg-black/20">✕</button>
        </div>
      )}

      {view === 'home' && (
        <div className="bg-slate-900/85 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-3">
            <label className="text-xs font-extrabold text-indigo-300 block">👤 كتب سميتك واختار الأفاتار:</label>
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/25 border border-indigo-400/40 flex items-center justify-center text-2xl shrink-0">{playerAvatar}</div>
              <input
                type="text" dir="auto" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                placeholder="كتب سميتك هنا (مثلاً: نادر، أسد الأطلس...)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {AVATAR_OPTIONS.map((av) => (
                <button key={av} onClick={() => setPlayerAvatar(av)} className={`w-8 h-8 rounded-xl flex items-center justify-center ${playerAvatar === av ? 'bg-indigo-600 border border-white' : 'bg-slate-900'}`}>{av}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" dir="rtl">
              {DARIJA_NICKNAME_PRESETS.map((p) => (
                <button key={p} onClick={() => setPlayerName(p)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 border border-white/10 text-slate-300 hover:text-white">{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-white">Create Online 1v1 Room</h3>
                <p className="text-xs text-slate-400 mt-1">صاوب روم جديد بـ كود ديال 6 حروف ولعب مع صاحبك أونلاين</p>
              </div>
              <button onClick={() => handleCreateRoom(false)} className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <Zap className="w-4 h-4 fill-white" /> Create Online Room ⚡
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col justify-between space-y-3">
              <h3 className="text-base font-extrabold text-white">Join Friend's Room</h3>
              <input
                type="text" value={joinInput} onChange={(e) => setJoinInput(e.target.value)}
                placeholder="كتب كود الروم هنا (مثلاً M283K9)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-center font-mono text-sm font-bold text-emerald-300"
              />
              <button onClick={() => handleJoinRoom()} className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <ArrowRight className="w-4 h-4" /> Join Room ⚡
              </button>
            </div>
          </div>

          <button onClick={() => handleCreateRoom(true)} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 cursor-pointer">
            🤖 تدرب بوحدك ضد الروبوت (Play Solo vs CyberRival Bot)
          </button>
        </div>
      )}

      {view === 'lobby' && sessionData && (
        <div className="bg-slate-900/85 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-indigo-300 font-bold block">🔑 كود الروم ديالك:</span>
              <span className="font-mono text-3xl font-black tracking-widest text-white">{roomCode}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { copyTextToClipboard(roomCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'تم النسخ!' : 'نسخ الكود'}
              </button>
              <button onClick={() => setView('home')} className="px-3 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300">خروج</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playersList.map((p) => (
              <div key={p.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{p.avatar || '🦁'}</span>
                  <span className="font-bold text-sm text-white">{p.name}</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">واجد ✓</span>
              </div>
            ))}
          </div>

          {/* قسم توليد الكويز بـ Gemini AI مع إعداد المفتاح المباشر */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-950/60 via-slate-900 to-indigo-950/60 border border-fuchsia-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-fuchsia-300 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> صاوب كويز بـ Gemini AI (أي موضوع بالدارجة)
                </span>
                <button
                  type="button"
                  onClick={() => setShowApiKeyBox(!showApiKeyBox)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-extrabold border flex items-center gap-1 cursor-pointer ${
                    hasActiveGeminiKey ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-rose-500/25 border-rose-400 text-rose-200 animate-pulse'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  {hasActiveGeminiKey ? 'مفتاح Gemini متصل ✓' : '🔑 دخل مفتاح Gemini API هنا'}
                </button>
              </div>
              <div className="flex gap-1">
                {['Easy', 'Medium', 'Hard'].map((d) => (
                  <button key={d} onClick={() => setAiDifficulty(d)} className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${aiDifficulty === d ? 'bg-fuchsia-500 text-white' : 'bg-slate-950 text-slate-400'}`}>{d}</button>
                ))}
              </div>
            </div>

            {showApiKeyBox && (
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-400/50 space-y-2" dir="rtl">
                <div className="text-xs text-amber-200 font-bold">
                  🔑 حط الـ Gemini API Key ديالك هنا (كيتسجل فـ متصفحك مباشرة وكيخدم بلا ما تعاود دير Redeploy فـ Vercel):
                </div>
                <div className="flex gap-2">
                  <input
                    type="password" dir="ltr" value={customApiKey}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setCustomApiKey(val);
                      if (typeof window !== 'undefined') window.localStorage.setItem('QB_GEMINI_API_KEY', val);
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/20 text-xs font-mono text-emerald-300"
                  />
                  <button onClick={() => setShowApiKeyBox(false)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">حفظ ✓</button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text" dir="auto" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateCustomQuiz(); }}
                placeholder="كتب أي موضوع بغيتي: المنتخب المغربي، الأنمي، التاريخ، الطبخ، ريال مدريد..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white"
              />
              <button
                onClick={handleGenerateCustomQuiz} disabled={isGeneratingAI}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingAI ? 'جاري التوليد بـ Gemini...' : 'توليد الكويز بالدارجة ✨'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(CURATED_PACKS).map(([k, pack]) => (
              <button
                key={k}
                onClick={() => {
                  setSelectedPack(k);
                  syncRoomStateEverywhere({ ...sessionData, quizTitle: pack.title, questions: pack.questions.slice(0, activeSettings.questionCount || 8) });
                }}
                className={`p-3 rounded-xl border text-right font-bold text-xs flex items-center justify-between cursor-pointer ${sessionData.quizTitle === pack.title ? 'bg-indigo-600/30 border-indigo-400 text-white' : 'bg-slate-950/60 border-white/10 text-slate-300'}`}
              >
                <span>{pack.badge}</span>
                <span dir="rtl">{pack.title}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              sfx.lockIn();
              const resetPlayers = {};
              Object.keys(sessionData.players || {}).forEach((pid) => {
                resetPlayers[pid] = { ...sessionData.players[pid], score: 0, streak: 0, answers: {} };
              });
              syncRoomStateEverywhere({ ...sessionData, status: 'playing', currentRound: 0, roundStartTime: Date.now(), matchId: (sessionData.matchId || 1) + 1, players: resetPlayers });
              setView('game');
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" /> بدا الماتش دابا ({sessionData.quizTitle})
          </button>
        </div>
      )}

      {view === 'game' && sessionData && currentQuestion && (
        <div className="bg-slate-900/85 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-white/10">
            {playersList.slice(0, 2).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-xl">{p.avatar}</span>
                <div>
                  <div className="text-xs font-bold text-white">{p.name}</div>
                  <div className="text-sm font-black text-indigo-400 font-mono">{p.score || 0} pts</div>
                </div>
              </div>
            ))}
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-bold">السؤال {currentRound + 1}/{sessionData.questions.length}</div>
              <div className="text-sm font-mono font-black text-amber-400">{(timeLeftMs / 1000).toFixed(1)}s</div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2" dir="rtl">
            <button
              disabled={usedFiftyFifty || myAnswerObj !== undefined || roundRevealed}
              onClick={() => {
                const wrong = [0, 1, 2, 3].filter((i) => i !== currentQuestion.a).sort(() => Math.random() - 0.5).slice(0, 2);
                setHiddenOptions(wrong); setUsedFiftyFifty(true);
              }}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600/30 border border-indigo-400 text-indigo-200 disabled:opacity-30"
            >
              ✂️ 50/50
            </button>
            <button
              disabled={usedDoublePoints || myAnswerObj !== undefined || roundRevealed}
              onClick={() => { setActiveDoublePoints(true); setUsedDoublePoints(true); }}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 border border-amber-400 text-amber-200 disabled:opacity-30"
            >
              ⚡ x2 مضاعفة النقاط
            </button>
          </div>

          <QuestionPictureBanner question={currentQuestion} roundNumber={currentRound + 1} />

          <h2 className="text-lg sm:text-2xl font-extrabold text-white text-right leading-relaxed" dir="rtl">
            {currentQuestion.q}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
            {currentQuestion.options.map((optText, idx) => {
              const isHidden = hiddenOptions.includes(idx) && !roundRevealed;
              const isMine = selectedOption === idx || myAnswerObj?.choice === idx;
              const isCorrect = idx === currentQuestion.a;
              let cls = 'bg-slate-950/80 border-white/15 text-slate-100';
              if (isHidden) cls = 'opacity-25 pointer-events-none bg-slate-950 border-white/5';
              else if (roundRevealed) {
                if (isCorrect) cls = 'bg-emerald-500/30 border-emerald-400 text-emerald-100';
                else if (isMine) cls = 'bg-rose-500/30 border-rose-400 text-rose-100';
              } else if (isMine) cls = 'bg-indigo-600/40 border-indigo-400 text-white';

              return (
                <button
                  key={idx}
                  disabled={myAnswerObj !== undefined || roundRevealed || isHidden}
                  onClick={() => handleLockAnswer(idx)}
                  className={`p-4 rounded-2xl border-2 text-right font-bold text-sm sm:text-base flex items-center justify-between gap-2 cursor-pointer ${cls}`}
                >
                  <span>{isHidden ? '— محذوف —' : optText}</span>
                  {roundRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {roundRevealed && isMine && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {roundRevealed && (
            <button
              onClick={() => {
                if (currentRound + 1 >= sessionData.questions.length) {
                  sfx.victory();
                  syncRoomStateEverywhere({ ...sessionData, status: 'finished' });
                  setView('results');
                } else {
                  syncRoomStateEverywhere({ ...sessionData, currentRound: currentRound + 1, roundStartTime: Date.now() });
                }
              }}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm cursor-pointer"
            >
              {currentRound + 1 >= sessionData.questions.length ? 'شوف النتيجة النهائية 🏆' : 'السؤال الموالي ←'}
            </button>
          )}
        </div>
      )}

      {view === 'results' && sessionData && (
        <div className="bg-slate-900/85 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl sm:text-4xl font-black text-white">🏆 الفائز: {playersList[0]?.name}</h1>
          <div className="space-y-3 max-w-md mx-auto">
            {playersList.map((p, i) => (
              <div key={p.id} className="p-4 rounded-2xl bg-slate-950 border border-white/15 flex items-center justify-between">
                <span className="font-bold text-white">#{i + 1} {p.avatar} {p.name}</span>
                <span className="font-mono font-black text-indigo-400 text-lg">{p.score || 0} pts</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { syncRoomStateEverywhere({ ...sessionData, status: 'waiting' }); setView('lobby'); }}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> عاود الماتش أو بدل الكويز
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user] = useState(() => ({ uid: 'p1-' + Math.random().toString(36).substring(2, 9) }));
  const [openRooms, setOpenRooms] = useState([]);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const cb = (list) => setOpenRooms([...list]);
    roomSubscribers.add(cb);
    return () => roomSubscribers.delete(cb);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur-md px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-extrabold text-lg text-white">QuizBlitz Arena 🇲🇦</span>
          </div>
          <button
            onClick={() => { sfx.muted = !muted; setMuted(!muted); }}
            className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col justify-center">
        <QuizArenaInstance user={user} sharedOpenRooms={openRooms} />
      </main>

      <footer className="border-t border-white/10 bg-slate-950 py-3 px-4 text-center text-xs text-slate-400">
        QuizBlitz Arena v4 · Moroccan Darija Edition + Gemini AI
      </footer>
    </div>
  );
}
