import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Users,
  Copy,
  Check,
  Sparkles,
  Trophy,
  Play,
  Share2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Globe,
  Award,
  Volume2,
  VolumeX,
  Bot,
  Radio,
  Columns,
  MessageSquareShare,
  Smile,
  HelpCircle,
  Link2,
  Send,
  Settings,
  Image as ImageIcon,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

const AVATAR_OPTIONS = ['🦁', '🦅', '⚡', '👑', '🔥', '🇲🇦', '⚽', '🎮', '🧠', '🥷', '🚀', '💎'];

const DARIJA_NICKNAME_PRESETS = [
  'أسد الأطلس 🦁',
  'مايسترو 🎩',
  'القناص 🎯',
  'ولد البلاد 🇲🇦',
  'البطل 🏆',
  'صقر المغرب 🦅',
  'نينجا الكويز 🥷',
  'العلامة 🧠'
];

// Global + Local Room Store & Real-Time MQTT/BroadcastChannel Sync (Works across devices on Vercel!)
const inMemoryRooms = {};
const roomSubscribers = new Set();
let mqttClientInstance = null;

function notifyRoomSubscribers() {
  const waitingList = Object.values(inMemoryRooms).filter(
    (r) => r && r.status === 'waiting'
  );
  roomSubscribers.forEach((cb) => {
    try {
      cb(waitingList);
    } catch (e) {}
  });
}

// Initialize Global WebSocket MQTT Broker when running on Vercel or outside restricted sandboxes
function initGlobalMultiplayerSync(onRoomUpdate) {
  if (typeof window === 'undefined') return;

  // 1. BroadcastChannel for instant multi-tab sync
  try {
    const bc = new BroadcastChannel('quizblitz_global_sync_v4');
    bc.onmessage = (ev) => {
      if (ev.data && ev.data.roomCode) {
        inMemoryRooms[ev.data.roomCode] = ev.data;
        notifyRoomSubscribers();
        onRoomUpdate(ev.data);
      }
    };
    window.__qbBroadcast = bc;
  } catch (e) {}

  // 2. Dynamic MQTT over WebSockets for real-time cross-device sync on Vercel
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
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 4000
    });

    client.on('connect', () => {
      client.subscribe('quizblitz_v4_global/rooms/+');
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data && data.roomCode) {
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

// Seeded deterministic pseudo-random generator
function seededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return ((h >>> 0) % 10000) / 10000;
}

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
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
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }
  click() {
    this.playTone(540, 'triangle', 0.07, 0.12);
  }
  lockIn() {
    this.playTone(660, 'sine', 0.1, 0.14);
    setTimeout(() => this.playTone(880, 'sine', 0.14, 0.14), 65);
  }
  taunt() {
    this.playTone(740, 'sine', 0.08, 0.1);
    setTimeout(() => this.playTone(980, 'triangle', 0.12, 0.12), 60);
  }
  correct() {
    this.playTone(523.25, 'triangle', 0.11, 0.18);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.11, 0.18), 85);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.14, 0.18), 170);
    setTimeout(() => this.playTone(1046.5, 'triangle', 0.28, 0.2), 255);
  }
  wrong() {
    this.playTone(240, 'sawtooth', 0.16, 0.12);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.25, 0.12), 130);
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.18, 0.18), i * 105);
    });
  }
}

const sfx = new SoundFX();

const CURATED_PACKS = {
  makla: {
    title: '🍲 الماكلة المغربية وأسرار الطبخ',
    badge: 'الطبخ المغربي',
    category: '🇲🇦 تراث ومغربيات',
    questions: [
      {
        q: 'شنو هي التبزيرة (العطرية) الأساسية اللي كتعطي للطنجية المراكشية المذاق الأصيل ديالها وما كيدارش فيها البصلة نهائياً؟',
        options: ['الكامون، الثومة، المصير، السمن الحار والزعفران الحر', 'التحميرة، القزبور يابس، البصلة محكوكة ومطيشة', 'القرفة، سكنجبير، الكوزة واللوز مقلي', 'الخرقوم، البزار الأبيض، والربيع مقطع'],
        a: 0,
        wikiTitle: 'Tangia',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Tanjia_Marrakchia.jpg/960px-Tanjia_Marrakchia.jpg',
        imageCaption: 'الطنجية المراكشية فـ قلة الطين بالفرناطشي',
        imageEmoji: '🏺',
        imageKeyword: 'Tangia',
        imageGradient: 'from-amber-900 via-orange-950 to-slate-900'
      },
      {
        q: 'فـ تحضير "راس الحانوت" المغربي الأصيل ديال المروزية أو الرفيسة، شحال كيوصل عدد الأعشاب والتوابل اللي كيخلط العطار المزيان؟',
        options: ['غير 4 ديال التوابل', 'ما بين 20 حتى لـ 35 عشبة وتابل', 'أقل من 7 ديال التوابل', 'غير البزار والكمون والملحة'],
        a: 1,
        wikiTitle: 'Ras_el_hanout',
        imageUrl: '',
        imageCaption: 'خلطة راس الحانوت المغربية العريقة عند العطار',
        imageEmoji: '🌶️',
        imageKeyword: 'Ras el hanout',
        imageGradient: 'from-red-900 via-amber-950 to-slate-900'
      },
      {
        q: 'شنو الفرق الأساسي بين "البسطيلة الفاسية" التقليدية و"البسطيلة التطوانية/الشمالية" القديمة؟',
        options: ['الفاسية بالحوت والتطوانية بالخضرة', 'الفاسية بالحمام واللوز على المذاق الحلو والمالح، والتطوانية بالدجاج والبيض والحامض بلا حلاوة زايدة', 'الفاسية كطيب فـ الماء والتطوانية فوق الفاخر', 'الفاسية كدار بالخبز والتطوانية بالسميدة'],
        a: 1,
        wikiTitle: 'Pastilla',
        imageUrl: '',
        imageCaption: 'البسطيلة المغربية الأصيلة بالورقة المقرمشة',
        imageEmoji: '🥧',
        imageKeyword: 'Pastilla',
        imageGradient: 'from-amber-900 via-yellow-950 to-slate-900'
      },
      {
        q: 'شنو سميت الحلوى المغربية العريقة اللي أصلها من مدينة آسفي وكتصاوب باللوز والزبدة والبيض وكتطيب على شكل قوقعة؟',
        options: ['الكعك المسفيوي أو قريشلات آسفي', 'الشباكية المخرقة', 'الفقاص البلدي بالنافع', 'غريبة البهلة'],
        a: 0,
        wikiTitle: 'Moroccan_cuisine',
        imageUrl: '',
        imageCaption: 'الحلويات المغربية التقليدية العريقة',
        imageEmoji: '🍪',
        imageKeyword: 'Moroccan cuisine',
        imageGradient: 'from-orange-900 via-amber-900 to-slate-900'
      },
      {
        q: 'فـ منطقة سوس وتافراوت، شنو سميت العجين التقليدي اللي كيتحضر من اللوز محمر ومطحون مع زيت أركان والعسل الحر؟',
        options: ['أملو (Amlou)', 'الزميطة', 'سلو (السفوف)', 'بركوكش'],
        a: 0,
        wikiTitle: 'Amlou',
        imageUrl: '',
        imageCaption: 'أملو السوسي الأصيل بزيت أركان واللوز والعسل',
        imageEmoji: '🍯',
        imageKeyword: 'Amlou',
        imageGradient: 'from-yellow-900 via-amber-950 to-slate-900'
      },
      {
        q: 'فاش كنطيبو "المروزية" المغربية فـ عيد الكبير، شنو هو المكون السري اللي كيخلي اللحم يتعسل وما يخسرش ليه المذاق واخا يبقى أيام؟',
        options: ['العسل والزبيب مع راس الحانوت والسمن وبلا بصلة ولا مطيشة فـ اللخر', 'الحليب والفرماج محكوك', 'مطيشة الحك والبطاطا', 'الخل الأبيض والحامض'],
        a: 0,
        wikiTitle: 'Mrouzia',
        imageUrl: '',
        imageCaption: 'طبق المروزية المغربية المعسلة بالزبيب واللوز',
        imageEmoji: '🍖',
        imageKeyword: 'Mrouzia',
        imageGradient: 'from-rose-950 via-amber-950 to-slate-900'
      },
      {
        q: 'شنو سميت الشوربة التقليدية اللي معروفة بيها مدينة وجدة والشرق فـ رمضان وكتصاوب بـ تشيشة الشعير (البلبولة) والزعتر؟',
        options: ['البيصارة الجبلية', 'الحريرة الوجدية بالتشيشة أو الكرانتيكا', 'تشيشة الزعتر والكمون الشرقية', 'الرفيسة العمية'],
        a: 2,
        wikiTitle: 'Harira',
        imageUrl: '',
        imageCaption: 'زلافة الشوربة والحريرة المغربية السخونة',
        imageEmoji: '🥣',
        imageKeyword: 'Harira',
        imageGradient: 'from-red-950 via-orange-900 to-slate-900'
      },
      {
        q: 'شنو هي "الخميرة البلدية" اللي كانو جدودنا كيعجنو بيها الخبز المغربي وكيفاش كانت كتربّى فـ الأول؟',
        options: ['دقيق القمح الكامل مع الماء والتمر أو اللبن كيتخمر طبيعياً بلا خميرة كيماوية', 'خميرة الحلويات الحمراء مع السكر كلاصي', 'البيكاربونات مع الخل والملحة', 'النشا مع الحليب سخون'],
        a: 0,
        wikiTitle: 'Sourdough',
        imageUrl: '',
        imageCaption: 'الخبز البلدي المغربي بالخميرة البلدية الصحية',
        imageEmoji: '🍞',
        imageKeyword: 'Moroccan bread',
        imageGradient: 'from-stone-900 via-amber-950 to-slate-900'
      }
    ]
  },
  cars: {
    title: '🏎️ ماركات الطوموبيلات وعالم السيارات',
    badge: 'الطوموبيلات',
    category: '🌍 عالم وتحديات',
    questions: [
      {
        q: 'أشمن شركة طوموبيلات إيطالية فاخرة الشعار ديالها فيه "ثور هائج" (Raging Bull) حيت مؤسسها Ferruccio كان برج الثور؟',
        options: ['Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo'],
        a: 1,
        wikiTitle: 'Lamborghini',
        imageUrl: '',
        imageCaption: 'سيارة خارقة بشعار الثور الإيطالي الشهير',
        imageEmoji: '🐂',
        imageKeyword: 'Lamborghini',
        imageGradient: 'from-amber-900 via-yellow-950 to-slate-950'
      },
      {
        q: 'الألوان الأبيض والأزرق المربعات فـ اللوغو ديال BMW شنو كيمثلو فـ الحقيقة التاريخية؟',
        options: ['مروحة طائرة فـ السما', 'ألوان راية إقليم بافاريا الألماني (Bavaria)', 'موج البحر المتوسط', 'حلبة سباق فورمولا 1'],
        a: 1,
        wikiTitle: 'BMW',
        imageUrl: '',
        imageCaption: 'علامة BMW البافارية الشهيرة',
        imageEmoji: '🛞',
        imageKeyword: 'BMW',
        imageGradient: 'from-blue-950 via-sky-900 to-slate-950'
      },
      {
        q: 'أشمن طوموبيل تقليدية أسطورية فالمغرب كيتسمى الموديل ديالها "240D" و"الكرافس" ومعروفة بالصح فـ الطاكسيات الكبار القدام؟',
        options: ['Mercedes-Benz W123', 'Peugeot 504', 'Renault 18', 'Volkswagen Golf 2'],
        a: 0,
        wikiTitle: 'Mercedes-Benz_W123',
        imageUrl: '',
        imageCaption: 'أسطورة الطرقات المغربية — ميرسيدس 240 (W123)',
        imageEmoji: '🚕',
        imageKeyword: 'Mercedes-Benz W123',
        imageGradient: 'from-emerald-950 via-teal-900 to-slate-950'
      },
      {
        q: 'الـ 4 ديال الحلقات المتداخلة فـ شعار شركة Audi الألمانية شنو كيعنيو؟',
        options: ['4 ديال الرويض كيدورو (Quattro)', 'اندماج 4 ديال شركات السيارات القدام فـ سنة 1932 (Auto Union)', '4 ديال الألقاب العالمية فـ السباق', '4 ديال الإخوة لي أسسو الشركة'],
        a: 1,
        wikiTitle: 'Audi',
        imageUrl: '',
        imageCaption: 'شعار الحلقات الأربعة ديال شركة Audi',
        imageEmoji: '⭕',
        imageKeyword: 'Audi',
        imageGradient: 'from-slate-900 via-zinc-900 to-indigo-950'
      },
      {
        q: 'أشمن طوموبيل كتيتصنع فـ مصنع SOMACA بالدار البيضاء ومصنع طنجة ولات هي الأكثر مبيعاً فالمغرب وفأوروبا لسنوات؟',
        options: ['Dacia Sandero', 'Hyundai Tucson', 'Toyota Yaris', 'Ford Fiesta'],
        a: 0,
        wikiTitle: 'Dacia_Sandero',
        imageUrl: '',
        imageCaption: 'طوموبيل Dacia Sandero المصنعة فـ المغرب',
        imageEmoji: '🚗',
        imageKeyword: 'Dacia Sandero',
        imageGradient: 'from-indigo-950 via-blue-900 to-slate-950'
      },
      {
        q: 'شكون هي الشركة الأم (المالكة) ديال ماركة السيارات الخارقة Bugatti و Porsche و Bentley؟',
        options: ['مجموعة Volkswagen الألمانية', 'مجموعة Stellantis', 'شركة General Motors', 'شركة Toyota'],
        a: 0,
        wikiTitle: 'Bugatti_Chiron',
        imageUrl: '',
        imageCaption: 'الوحش الهندسي Bugatti Chiron',
        imageEmoji: '🚀',
        imageKeyword: 'Bugatti Chiron',
        imageGradient: 'from-blue-950 via-indigo-950 to-slate-950'
      },
      {
        q: 'شنو كتعني حروف "AMG" الشهيرة فـ الطوموبيلات الرياضية ديال Mercedes-Benz؟',
        options: ['Auto Motor Germany', 'الألقاب ديال المهندسين المؤسسين (Aufrecht & Melcher) والمدينة (Großaspach)', 'Advanced Mechanic Gear', 'Aero Motion GT'],
        a: 1,
        wikiTitle: 'Mercedes-AMG',
        imageUrl: '',
        imageCaption: 'فرع الأداء الرياضي العالي Mercedes-AMG',
        imageEmoji: '🏁',
        imageKeyword: 'Mercedes-AMG',
        imageGradient: 'from-zinc-900 via-red-950 to-slate-950'
      },
      {
        q: 'فـ عالم محركات الـ JDM اليابانية، أشمن طوموبيل أسطورية ديال Toyota كان فيها المحرك الشهير "2JZ-GTE"؟',
        options: ['Toyota Supra MK4 (A80)', 'Nissan Skyline GT-R R34', 'Mazda RX-7', 'Honda NSX'],
        a: 0,
        wikiTitle: 'Toyota_Supra',
        imageUrl: '',
        imageCaption: 'أسطورة الـ JDM اليابانية — Toyota Supra MK4',
        imageEmoji: '🔥',
        imageKeyword: 'Toyota Supra',
        imageGradient: 'from-orange-950 via-red-900 to-slate-950'
      }
    ]
  },
  general: {
    title: '🧠 ثقافة عامة وتحدي العباقرة بالدارجة',
    badge: 'ثقافة عامة',
    category: '🌍 عالم وتحديات',
    questions: [
      {
        q: 'شنو هي الدولة الوحيدة فالعالم اللي الراية (العلم) ديالها ماشي مستطيلة وماشي مربعة، بل على شكل جوج مثلثات؟',
        options: ['النيبال (Nepal)', 'بوتان (Bhutan)', 'سويسرا', 'الفاتيكان'],
        a: 0,
        wikiTitle: 'Flag_of_Nepal',
        imageUrl: '',
        imageCaption: 'العلم الفريد ديال دولة النيبال فـ جبال الهيمالايا',
        imageEmoji: '🇳🇵',
        imageKeyword: 'Flag of Nepal',
        imageGradient: 'from-rose-950 via-blue-950 to-slate-950'
      },
      {
        q: 'أشمن عنصر كيميائي هو الوحيد من بين المعادن (Metals) اللي كيكون سائل فـ درجة حرارة الغرفة العادية؟',
        options: ['الزئبق (Mercury - Hg)', 'الرصاص (Lead)', 'التيتانيوم', 'الليثيوم'],
        a: 0,
        wikiTitle: 'Mercury_(element)',
        imageUrl: '',
        imageCaption: 'معدن الزئبق الفضي السائل (Hg)',
        imageEmoji: '🧪',
        imageKeyword: 'Mercury element',
        imageGradient: 'from-slate-800 via-cyan-950 to-slate-950'
      },
      {
        q: 'فـ جسم الإنسان، شنو هو العضو الداخلي الوحيد اللي عندو القدرة يعاود ينبث ويكبر كامل وخا تحيد منو حتى لـ 70%؟',
        options: ['الكبدة (Liver)', 'الكلوة (Kidney)', 'الطحال', 'الرئة'],
        a: 0,
        wikiTitle: 'Liver',
        imageUrl: '',
        imageCaption: 'معجزة تجدد خلايا الكبد فـ جسم الإنسان',
        imageEmoji: '🧬',
        imageKeyword: 'Liver',
        imageGradient: 'from-rose-950 via-purple-950 to-slate-950'
      },
      {
        q: 'أشمن محيط فـ الكرة الأرضية كاينة فيه أعمق نقطة مكتشفة (خندق ماريانا - Mariana Trench) لي كتوصل لـ 11 كيلومتر لتحت؟',
        options: ['المحيط الهادي (Pacific Ocean)', 'المحيط الأطلسي', 'المحيط الهندي', 'المحيط المتجمد الشمالي'],
        a: 0,
        wikiTitle: 'Mariana_Trench',
        imageUrl: '',
        imageCaption: 'أعماق خندق ماريانا فـ المحيط الهادي',
        imageEmoji: '🌊',
        imageKeyword: 'Mariana Trench',
        imageGradient: 'from-blue-950 via-cyan-950 to-slate-950'
      },
      {
        q: 'شحال من قلب عند الأخطبوط العملاق، وشنو هو اللون الحقيقي ديال الدم ديالو؟',
        options: ['3 ديال القلوب ودمو أزرق', 'قلب واحد ودمو أحمر', 'جوج قلوب ودمو أخضر', '4 ديال القلوب ودمو أصفر'],
        a: 0,
        wikiTitle: 'Octopus',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Octopus2.jpg/960px-Octopus2.jpg',
        imageCaption: 'الأخطبوط البحري — 3 قلوب ودم أزرق بسبب النحاس (Hemocyanin)',
        imageEmoji: '🐙',
        imageKeyword: 'Octopus',
        imageGradient: 'from-cyan-950 via-blue-900 to-slate-950'
      },
      {
        q: 'أشمن عالم فيزياء صاوب نظرية "النسبية العامة" ولكن ربح جائزة نوبل فـ 1921 على "التأثير الكهروضوئي" ماشي على النسبية؟',
        options: ['Albert Einstein', 'Nikola Tesla', 'Isaac Newton', 'Max Planck'],
        a: 0,
        wikiTitle: 'Albert_Einstein',
        imageUrl: '',
        imageCaption: 'العالم الفيزيائي ألبرت أينشتاين',
        imageEmoji: '⚛️',
        imageKeyword: 'Albert Einstein',
        imageGradient: 'from-indigo-950 via-purple-950 to-slate-950'
      },
      {
        q: 'أشمن كوكب فـ المجموعة الشمسية النهار الواحد فيه (دورة حول نفسو) أطول من العام ديالو (دورة حول الشمس)؟',
        options: ['كوكب الزهرة (Venus)', 'كوكب المريخ (Mars)', 'كوكب عطارد (Mercury)', 'كوكب نبتون'],
        a: 0,
        wikiTitle: 'Venus',
        imageUrl: '',
        imageCaption: 'كوكب الزهرة (Venus) اللي كيدور بالعكس وببطء شديد',
        imageEmoji: '🪐',
        imageKeyword: 'Venus',
        imageGradient: 'from-amber-950 via-orange-950 to-slate-950'
      },
      {
        q: 'أشمن مدينة تاريخية فـ العالم هي الوحيدة اللي مقسومة جغرافياً بين جوج قارات (أوروبا وآسيا) وكيفرقها مضيق البوسفور؟',
        options: ['إسطنبول (Istanbul)', 'أثينا', 'القاهرة', 'طنجة'],
        a: 0,
        wikiTitle: 'Istanbul',
        imageUrl: '',
        imageCaption: 'مضيق البوسفور فـ مدينة إسطنبول بين أوروبا وآسيا',
        imageEmoji: '🌉',
        imageKeyword: 'Istanbul',
        imageGradient: 'from-sky-950 via-indigo-950 to-slate-950'
      }
    ]
  },
  rap: {
    title: '🎤 روابا د المغرب وتراكات الراب المغربي',
    badge: 'الراب المغربي',
    category: '🇲🇦 تراث ومغربيات',
    questions: [
      {
        q: 'أشمن رابور مغربي خرج الألبوم الشهير "عربي" (Arabi) فـ 2023 ودار بيه أرقام قياسية فـ Spotify العالم العربي؟',
        options: ['ElGrandeToto', 'Draganov', 'Stormy', 'Kouz1'],
        a: 0,
        wikiTitle: 'ElGrandeToto',
        imageUrl: '',
        imageCaption: 'نجم الراب المغربي والعالمي ElGrandeToto',
        imageEmoji: '🎤',
        imageKeyword: 'ElGrandeToto',
        imageGradient: 'from-purple-950 via-indigo-950 to-slate-950'
      },
      {
        q: 'شنو سميت الكروب الأسطوري ديال الراب المراكشي اللي تأسس فـ 1996 وكان فيه Fnaïre ولا الكروب الفاسي H-Kayne؟ شكون صاحب تراك "Issawa Style"؟',
        options: ['H-Kayne (من مكناس)', 'Fnaïre (من مراكش)', 'Zanka Flow (من طنجة)', 'Casa Crew (من كازا)'],
        a: 0,
        wikiTitle: 'H-Kayne',
        imageUrl: '',
        imageCaption: 'رواد الهيب هوب المغربي — مجموعة H-Kayne المكناسية',
        imageEmoji: '🎧',
        imageKeyword: 'H-Kayne',
        imageGradient: 'from-emerald-950 via-teal-900 to-slate-950'
      },
      {
        q: 'أشمن رابور مغربي ولد مدينة وجدة معروف بأنه هو اللي كيدير الـ Prod (الألحان) والغناء فـ نفس الوقت وخرج ألبوم "ألوان" (Alwane)؟',
        options: ['Draganov (عدنان)', 'Small X', 'Madd', 'Shobee'],
        a: 0,
        wikiTitle: 'Moroccan_hip_hop',
        imageUrl: '',
        imageCaption: 'الرابور والمنتج الموسيقي المغربي Draganov',
        imageEmoji: '🎹',
        imageKeyword: 'Hip hop music',
        imageGradient: 'from-rose-950 via-fuchsia-950 to-slate-950'
      },
      {
        q: 'شكون هوما الجوج روابا المغاربة اللي كانو مشكلين الثنائي الشهير "Shayfeen" من مدينة آسفي قبل ما يكمل كل واحد بوحدو؟',
        options: ['Small X و Shobee', 'Ouenza و Guzman', '7liwa و Lferda', 'Khtek و Pause Flow'],
        a: 0,
        wikiTitle: 'Shayfeen',
        imageUrl: '',
        imageCaption: 'الثنائي الشهير Shayfeen (Small X & Shobee)',
        imageEmoji: '🔥',
        imageKeyword: 'Rap music',
        imageGradient: 'from-amber-950 via-red-950 to-slate-950'
      },
      {
        q: 'شكون هو الرابور المغربي الفاسي المعروف بأسلوب الراب الشعري العميق وبالملثم فـ البدايات ديالو ومن أشهر تراكاتو "170 Kg" و"الصولدي"؟',
        options: ['Lmorphine (المورفين)', 'Pause Flow', 'Nessyou', 'Muslim'],
        a: 0,
        wikiTitle: 'Rapping',
        imageUrl: '',
        imageCaption: 'الراب الفلسفي والكتابة العميقة فـ الراب المغربي',
        imageEmoji: '🖋️',
        imageKeyword: 'Microphone',
        imageGradient: 'from-stone-900 via-zinc-900 to-slate-950'
      },
      {
        q: 'أشمن رابور طنجاوي من الجيل الأول ديال الـ Hardcore Rap فـ المغرب خرج التراك الخالد "الرسالة" و"متمرد"؟',
        options: ['Muslim (مسلم)', 'L3arbé', 'Rofix', 'Komy'],
        a: 0,
        wikiTitle: 'Muslim_(rapper)',
        imageUrl: '',
        imageCaption: 'الرابور الطنجاوي مسلم (Muslim)',
        imageEmoji: '🦅',
        imageKeyword: 'Muslim rapper',
        imageGradient: 'from-red-950 via-slate-900 to-slate-950'
      },
      {
        q: 'شنو سميت التراك الشهير ديال Don Bigg اللي خرج فـ ألبوم "مغاربة تال الموت" (2006) ودار ثورة فـ تاريخ الراب المغربي؟',
        options: ['الخوف (Al Khouf) و مغاربة تال الموت', 'بلاتي', 'كازابلانكا', 'تسونامي'],
        a: 0,
        wikiTitle: 'Don_Bigg',
        imageUrl: '',
        imageCaption: 'الرابور المغربي Don Bigg — ألبوم مغاربة تال الموت',
        imageEmoji: '👑',
        imageKeyword: 'Don Bigg',
        imageGradient: 'from-indigo-950 via-slate-900 to-amber-950'
      },
      {
        q: 'شكون هو الرابور المغربي صاحب التراك الضارب "Africain" و "عمرها ما غادي تصفى" واللي تميز بـ ستايل Afro-Trap؟',
        options: ['Stormy', 'Tagne', 'Kouz1', 'Snor'],
        a: 0,
        wikiTitle: 'Trap_music',
        imageUrl: '',
        imageCaption: 'موجة الـ Afro-Trap والراب العصري فـ المغرب',
        imageEmoji: '⚡',
        imageKeyword: 'Concert',
        imageGradient: 'from-violet-950 via-fuchsia-950 to-slate-950'
      }
    ]
  },
  makeup: {
    title: '💄 الماكياج وماركات الـ Makeup العالمية',
    badge: 'Makeup & Beauty',
    category: '🌍 عالم وتحديات',
    questions: [
      {
        q: 'شكون هي المغنية والنجمة العالمية اللي أسست ماركة الماكياج الشهيرة "Fenty Beauty" ودارت ثورة بـ 40 درجة ديال الـ Foundation من أول نهار؟',
        options: ['Rihanna (ريهانا)', 'Selena Gomez', 'Kylie Jenner', 'Ariana Grande'],
        a: 0,
        wikiTitle: 'Fenty_Beauty',
        imageUrl: '',
        imageCaption: 'ماركة Fenty Beauty العالمية ديال النجمة Rihanna',
        imageEmoji: '💄',
        imageKeyword: 'Rihanna',
        imageGradient: 'from-pink-950 via-rose-900 to-slate-950'
      },
      {
        q: 'ماركة "Rare Beauty" اللي معروفة بزاف بـ الـ Liquid Blush (Soft Pinch) اللي كيدوم نهار كامل، شكون هي النجمة المؤسسة ديالها؟',
        options: ['Selena Gomez (سيلينا غوميز)', 'Hailey Bieber', 'Lady Gaga', 'Kim Kardashian'],
        a: 0,
        wikiTitle: 'Rare_Beauty',
        imageUrl: '',
        imageCaption: 'ماركة Rare Beauty ديال Selena Gomez',
        imageEmoji: '🌸',
        imageKeyword: 'Selena Gomez',
        imageGradient: 'from-rose-900 via-pink-950 to-slate-950'
      },
      {
        q: 'فـ ترتيب خطوات الـ Makeup الاحترافي، شنو الفرق بين الـ "Primer" والـ "Setting Spray"؟',
        options: ['الـ Primer كيدار قبل الفوندوتان باش يهيئ البشرة ويسد المسام، والـ Setting Spray كيدار فـ اللخر باش يثبت الماكياج', 'بجوجهم كيدارو قبل غسيل الوجه', 'الـ Primer كيحيد الماكياج والـ Setting Spray هو الماسكارا', 'الـ Setting Spray كيدار للشفاه فقط'],
        a: 0,
        wikiTitle: 'Cosmetics',
        imageUrl: '',
        imageCaption: 'أدوات ومستحضرات التجميل الاحترافية',
        imageEmoji: '✨',
        imageKeyword: 'Cosmetics',
        imageGradient: 'from-fuchsia-950 via-purple-950 to-slate-950'
      },
      {
        q: 'شنو سميت درجة اللون (Shade) الأسطورية ديال الـ Matte Lipstick من ماركة MAC اللي لونو أحمر كلاسيكي وكيجي مع جميع ألوان البشرة؟',
        options: ['Ruby Woo', 'Pillow Talk', 'Black Honey', 'Orgasm'],
        a: 0,
        wikiTitle: 'MAC_Cosmetics',
        imageUrl: '',
        imageCaption: 'أحمر الشفاه الأيقوني Ruby Woo من MAC Cosmetics',
        imageEmoji: '💋',
        imageKeyword: 'Lipstick',
        imageGradient: 'from-red-950 via-rose-950 to-slate-950'
      },
      {
        q: 'أشمن ماركة تجميل عالمية مشهورة بمجموعة "Pillow Talk" وأسستها خبيرة التجميل البريطانية الشهيرة للمشاهير؟',
        options: ['Charlotte Tilbury', 'Huda Beauty', 'Anastasia Beverly Hills', 'NARS'],
        a: 0,
        wikiTitle: 'Charlotte_Tilbury',
        imageUrl: '',
        imageCaption: 'مجموعة Pillow Talk الشهيرة من Charlotte Tilbury',
        imageEmoji: '👑',
        imageKeyword: 'Make-up artist',
        imageGradient: 'from-amber-950 via-rose-950 to-slate-950'
      },
      {
        q: 'شنو هو الترتيب الصحيح باش ما يتكورش الماكياج (Cakey Makeup) مللي كتستعملي منتوجات الكريم (Cream) ومنتوجات البودرة (Powder)؟',
        options: ['ديما السوائل والكريمات هما اللولين (Foundation/Cream Blush) عاد كنتبثو بالبودرة الفوق', 'كنديرو البودرة هي اللولة عاد الفوندوتان السائل فوقها', 'كنخلطو الماسكارا مع البودرة', 'ما كاين حتى فرق فـ الترتيب'],
        a: 0,
        wikiTitle: 'Foundation_(cosmetics)',
        imageUrl: '',
        imageCaption: 'تقنيات دمج الـ Foundation والـ Contour الاحترافية',
        imageEmoji: '🖌️',
        imageKeyword: 'Foundation cosmetics',
        imageGradient: 'from-orange-950 via-pink-950 to-slate-950'
      },
      {
        q: 'شنو هو المستحضر التقليدي المغربي الطبيعي 100% اللي كيتصاوب من أوراق شقائق النعمان (بلعمان) وقشور الرمان فـ فاس وكيعطي لون أحمر طبيعي للشفاه والخدود؟',
        options: ['العكر الفاسي الحر', 'الكحل البلدي بالأثمد', 'الغاسول المسقي', 'الودعة'],
        a: 0,
        wikiTitle: 'Corn_poppy',
        imageUrl: '',
        imageCaption: 'العكر الفاسي المغربي الأصيل المستخلص من زهور بلعمان',
        imageEmoji: '🌺',
        imageKeyword: 'Poppy flower',
        imageGradient: 'from-red-900 via-rose-950 to-slate-950'
      },
      {
        q: 'إلا بغيتي تغطي الهالات السوداء تحت العين (Dark Circles) اللي مائل لونها للأزرق/البنفسجي قبل الـ Concealer، أشمن لون ديال الـ Color Corrector خاصك تستعملي؟',
        options: ['اللون الخوخي أو البرتقالي (Peach / Orange Corrector)', 'اللون الأخضر (Green Corrector)', 'اللون الأزرق', 'اللون الأبيض الثلجي'],
        a: 0,
        wikiTitle: 'Concealer',
        imageUrl: '',
        imageCaption: 'عجلة الألوان لتصحيح عيوب البشرة (Color Correcting)',
        imageEmoji: '🎨',
        imageKeyword: 'Cosmetics brush',
        imageGradient: 'from-amber-900 via-fuchsia-950 to-slate-950'
      }
    ]
  },
  players: {
    title: '🦁 اللعابا د المغرب بالتصاور (تحدي الأسود)',
    badge: 'أسود الأطلس',
    category: '🇲🇦 تراث ومغربيات',
    questions: [
      {
        q: 'شوف الصورة: هاد المايسترو المغربي ربح الكرة الذهبية الإفريقية سنة 1998 وتألق فـ مونديال فرنسا مع المنتخب ومع فريق ديبورتيفو لاكورونيا، شكون هو؟',
        options: ['مصطفى حجي', 'عبد الجليل هدا (كماتشو)', 'نور الدين النيبت', 'يوسف شيبو'],
        a: 0,
        wikiTitle: 'Mustapha_Hadji',
        imageUrl: '',
        imageCaption: 'أسطورة الكرة المغربية صاحب الكرة الذهبية الإفريقية 1998',
        imageEmoji: '🦁',
        imageKeyword: 'Mustapha Hadji',
        imageGradient: 'from-red-900 via-emerald-900 to-slate-950'
      },
      {
        q: 'هاد النجم المغربي سجل هدف تاريخي فـ أولمبياد باريس 2024 وتوج هداف البطولة بـ 8 أهداف مع المنتخب الأولمبي، شكون هو؟',
        options: ['سفيان رحيمي', 'إلياس أخوماش', 'بلال الخنوس', 'عبد الصمد الزلزولي'],
        a: 0,
        wikiTitle: 'Soufiane_Rahimi',
        imageUrl: '',
        imageCaption: 'هداف أولمبياد باريس 2024 ونجم العين الإماراتي والرجاء سابقاً',
        imageEmoji: '🥇',
        imageKeyword: 'Soufiane Rahimi',
        imageGradient: 'from-emerald-900 via-red-950 to-slate-950'
      },
      {
        q: 'شكون هو هاد النجم المغربي ديال ريال مدريد اللي اختار يمثل أسود الأطلس وربح دوري أبطال أوروبا 2024؟',
        options: ['إبراهيم دياز (Brahim Díaz)', 'حكيم زياش', 'أمين عدلي', 'إلياس بن صغير'],
        a: 0,
        wikiTitle: 'Brahim_Díaz',
        imageUrl: '',
        imageCaption: 'نجم ريال مدريد والمنتخب المغربي رقم 10',
        imageEmoji: '👑',
        imageKeyword: 'Brahim Díaz',
        imageGradient: 'from-indigo-950 via-red-950 to-slate-950'
      },
      {
        q: 'هاد المهاجم المغربي التاريخي كان هداف الدوري الإنجليزي (أول هدف ليه مع كريستال بالاس) ومعروف بلقب "الشماخ" فـ أرسنال وبوردو، شكون هو؟',
        options: ['مروان الشماخ', 'يوسف حجي', 'مبارك بوصوفة', 'أسامة السعيدي'],
        a: 0,
        wikiTitle: 'Marouane_Chamakh',
        imageUrl: '',
        imageCaption: 'المهاجم المغربي الشهير فـ بوردو وأرسنال وعرين الأسود 2004',
        imageEmoji: '⚽',
        imageKeyword: 'Marouane Chamakh',
        imageGradient: 'from-rose-950 via-red-900 to-slate-950'
      },
      {
        q: 'شكون هو "الجنرال" وعميد المنتخب المغربي الأسطوري اللي ربح الليغا مع ديبورتيفو لاكورونيا ولعب فـ توتنهام والوداد؟',
        options: ['نور الدين النيبت', 'طلال القرقوري', 'مهدي بنعطية', 'عبد السلام وادو'],
        a: 0,
        wikiTitle: 'Noureddine_Naybet',
        imageUrl: '',
        imageCaption: 'صخرة الدفاع المغربية التاريخية — نور الدين النيبت',
        imageEmoji: '🛡️',
        imageKeyword: 'Noureddine Naybet',
        imageGradient: 'from-red-950 via-emerald-950 to-slate-950'
      },
      {
        q: 'هاد المحارب ديال وسط الميدان المغربي دار مونديال أسطوري فـ قطر 2022 ولعب لـ فيورنتينا ومانشستر يونايتد وفنربخشة، شكون هو؟',
        options: ['سفيان أمرابط', 'عز الدين أوناحي', 'سليم أملاح', 'يحيى جبران'],
        a: 0,
        wikiTitle: 'Sofyan_Amrabat',
        imageUrl: '',
        imageCaption: 'محارب خط الوسط فـ المنتخب المغربي رقم 4',
        imageEmoji: '⚔️',
        imageKeyword: 'Sofyan Amrabat',
        imageGradient: 'from-emerald-950 via-teal-950 to-slate-950'
      },
      {
        q: 'شكون هو الحارس المغربي العملاق صاحب الكرة الذهبية الإفريقية 1986 واللي تألق مع مايوركا الإسباني وفـ مونديال المكسيك 86؟',
        options: ['بادو الزاكي', 'خالد فوهامي', 'نادر المياغري', 'علال بن قصو'],
        a: 0,
        wikiTitle: 'Ezzaki_Badou',
        imageUrl: '',
        imageCaption: 'أسطورة الحراسة المغربية والإفريقية — بادو الزاكي',
        imageEmoji: '🧤',
        imageKeyword: 'Ezzaki Badou',
        imageGradient: 'from-amber-950 via-red-950 to-slate-950'
      },
      {
        q: 'هاد اللعاب المغربي رقم 8 بهر العالم ولويس إنريكي فـ مونديال 2022 بـ المراوغات ديالو ضد إسبانيا والبرتغال، شكون هو؟',
        options: ['عز الدين أوناحي', 'أمين حارث', 'عبد الحميد الصابيري', 'زكرياء أبو خلال'],
        a: 0,
        wikiTitle: 'Azzedine_Ounahi',
        imageUrl: '',
        imageCaption: 'مهندس خط الوسط المغربي صاحب الرقم 8 فـ مونديال قطر',
        imageEmoji: '✨',
        imageKeyword: 'Azzedine Ounahi',
        imageGradient: 'from-red-900 via-emerald-950 to-slate-950'
      }
    ]
  },
  arab_capitals: {
    title: '🕌 عواصم الدول العربية (تحدي الواعرين)',
    badge: 'عواصم عربية',
    category: '🌍 عالم وتحديات',
    questions: [
      {
        q: 'شنو هي العاصمة الرسمية ديال دولة جزر القمر (Comoros) اللي هي دولة عربية فـ المحيط الهندي؟',
        options: ['موروني (Moroni)', 'جيبوتي', 'مقديشو', 'نواكشوط'],
        a: 0,
        wikiTitle: 'Moroni,_Comoros',
        imageUrl: '',
        imageCaption: 'مدينة موروني الساحلية فـ جزر القمر',
        imageEmoji: '🏝️',
        imageKeyword: 'Moroni Comoros',
        imageGradient: 'from-emerald-950 via-cyan-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال سلطنة عُمان اللي معروفة بالعمارة البيضاء والقلعات التاريخية على بحر العرب؟',
        options: ['مسقط (Muscat)', 'صلالة', 'المنامة', 'الدوحة'],
        a: 0,
        wikiTitle: 'Muscat',
        imageUrl: '',
        imageCaption: 'عاصمة سلطنة عُمان الساحرة على الخليج وبحر العرب',
        imageEmoji: '🕌',
        imageKeyword: 'Muscat',
        imageGradient: 'from-amber-950 via-stone-900 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة الرسمية ديال مملكة البحرين؟',
        options: ['المنامة (Manama)', 'المحرق', 'الشارقة', 'الكويت'],
        a: 0,
        wikiTitle: 'Manama',
        imageUrl: '',
        imageCaption: 'أبراج العاصمة البحرينية الحديثة',
        imageEmoji: '🏙️',
        imageKeyword: 'Manama',
        imageGradient: 'from-red-950 via-rose-900 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال الجمهورية الإسلامية الموريتانية (بلد المليون شاعر)؟',
        options: ['نواكشوط (Nouakchott)', 'نواذيبو', 'شنقيط', 'أطار'],
        a: 0,
        wikiTitle: 'Nouakchott',
        imageUrl: '',
        imageCaption: 'العاصمة الموريتانية على ساحل المحيط الأطلسي',
        imageEmoji: '🇲🇷',
        imageKeyword: 'Nouakchott',
        imageGradient: 'from-emerald-950 via-amber-950 to-slate-950'
      },
      {
        q: 'بزاف د الناس كيغلطو وكيصحاب ليهم "دبي" هي العاصمة، شنو هي العاصمة الفيدرالية الرسمية ديال الإمارات العربية المتحدة؟',
        options: ['أبوظبي (Abu Dhabi)', 'دبي', 'الشارقة', 'العين'],
        a: 0,
        wikiTitle: 'Abu_Dhabi',
        imageUrl: '',
        imageCaption: 'جامع الشيخ زايد وأبراج العاصمة الإماراتية',
        imageEmoji: '🇦🇪',
        imageKeyword: 'Abu Dhabi',
        imageGradient: 'from-sky-950 via-indigo-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة التاريخية ديال الصومال واللي كطل مباشرة على المحيط الهندي؟',
        options: ['مقديشو (Mogadishu)', 'هرجيسا', 'أسمرة', 'الخرطوم'],
        a: 0,
        wikiTitle: 'Mogadishu',
        imageUrl: '',
        imageCaption: 'العاصمة الصومالية العريقة على ساحل المحيط الهندي',
        imageEmoji: '🌊',
        imageKeyword: 'Mogadishu',
        imageGradient: 'from-blue-950 via-sky-900 to-slate-950'
      },
      {
        q: 'أشمن عاصمة عربية كيتلاقى فيها "النيل الأبيض" و"النيل الأزرق" فـ بلاصة سميتها "المقرن"؟',
        options: ['الخرطوم (عاصمة السودان)', 'القاهرة (عاصمة مصر)', 'عمان (عاصمة الأردن)', 'بغداد (عاصمة العراق)'],
        a: 0,
        wikiTitle: 'Khartoum',
        imageUrl: '',
        imageCaption: 'ملتقى النيلين الأبيض والأزرق فـ السودان',
        imageEmoji: '🚤',
        imageKeyword: 'Khartoum',
        imageGradient: 'from-cyan-950 via-blue-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال اليمن اللي مبنية فوق الجبال على علو 2200 متر ومصنفة فـ التراث العالمي بـ معمارها الفريد؟',
        options: ['صنعاء (Sanaa)', 'عدن', 'تعز', 'حضرموت'],
        a: 0,
        wikiTitle: 'Sanaa',
        imageUrl: '',
        imageCaption: 'المعمار التاريخي الفريد ديال مدينة صنعاء القديمة',
        imageEmoji: '🏯',
        imageKeyword: 'Sanaa',
        imageGradient: 'from-amber-900 via-orange-950 to-slate-950'
      }
    ]
  },
  euro_capitals: {
    title: '🏰 عواصم الدول الأوروبية (بلا غلط!)',
    badge: 'عواصم أوروبا',
    category: '🌍 عالم وتحديات',
    questions: [
      {
        q: 'بزاف كيصحاب ليهم "جنيف" أو "زيورخ" هي العاصمة، ولكن شنو هي العاصمة الفيدرالية الفعلية ديال سويسرا؟',
        options: ['بيرن (Bern)', 'زيورخ (Zurich)', 'جنيف (Geneva)', 'بازل (Basel)'],
        a: 0,
        wikiTitle: 'Bern',
        imageUrl: '',
        imageCaption: 'المدينة القديمة الساحرة فـ العاصمة السويسرية',
        imageEmoji: '🇨🇭',
        imageKeyword: 'Bern',
        imageGradient: 'from-red-950 via-stone-900 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال سلوفاكيا (Slovakia) اللي هي العاصمة الوحيدة فـ العالم اللي كتشترك فـ الحدود مع جوج دول (النمسا وهنغاريا)؟',
        options: ['براتيسلافا (Bratislava)', 'ليوبليانا (Ljubljana)', 'زغرب (Zagreb)', 'براغ (Prague)'],
        a: 0,
        wikiTitle: 'Bratislava',
        imageUrl: '',
        imageCaption: 'قلعة العاصمة السلوفاكية على نهر الدانوب',
        imageEmoji: '🏰',
        imageKeyword: 'Bratislava',
        imageGradient: 'from-indigo-950 via-blue-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال دولة إستونيا (Estonia) اللي مطلة على بحر البلطيق ومعروفة بأسوار القرون الوسطى؟',
        options: ['تالين (Tallinn)', 'ريغا (Riga)', 'فيلنيوس (Vilnius)', 'هلسنكي (Helsinki)'],
        a: 0,
        wikiTitle: 'Tallinn',
        imageUrl: '',
        imageCaption: 'أسوار وأبراج العاصمة الإستونية التاريخية',
        imageEmoji: '🇪🇪',
        imageKeyword: 'Tallinn',
        imageGradient: 'from-sky-950 via-slate-900 to-indigo-950'
      },
      {
        q: 'شنو هي العاصمة ديال هنغاريا (المجر) اللي مقسومة لنصين بنهر الدانوب (بودا + بيست)؟',
        options: ['بودابست (Budapest)', 'بوخارست (Bucharest)', 'بلغراد (Belgrade)', 'صوفيا (Sofia)'],
        a: 0,
        wikiTitle: 'Budapest',
        imageUrl: '',
        imageCaption: 'مبنى البرلمان الشهير على ضفاف الدانوب فـ المجر',
        imageEmoji: '🏛️',
        imageKeyword: 'Budapest',
        imageGradient: 'from-amber-950 via-red-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال إيرلندا (Republic of Ireland)؟',
        options: ['دبلن (Dublin)', 'بلفاست (Belfast)', 'إدنبرة (Edinburgh)', 'كارديف (Cardiff)'],
        a: 0,
        wikiTitle: 'Dublin',
        imageUrl: '',
        imageCaption: 'نهر ليفي وجسور العاصمة الإيرلندية',
        imageEmoji: '🇮🇪',
        imageKeyword: 'Dublin',
        imageGradient: 'from-emerald-950 via-green-900 to-slate-950'
      },
      {
        q: 'شنو هي أصغر عاصمة فـ الاتحاد الأوروبي من حيث المساحة واللي هي عاصمة جزيرة مالطا (Malta)؟',
        options: ['فاليتا (Valletta)', 'نيقوسيا (Nicosia)', 'لوكسمبورغ', 'موناكو'],
        a: 0,
        wikiTitle: 'Valletta',
        imageUrl: '',
        imageCaption: 'القلعة الذهبية ديال عاصمة مالطا فـ البحر المتوسط',
        imageEmoji: '🇲🇹',
        imageKeyword: 'Valletta',
        imageGradient: 'from-amber-900 via-orange-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال النرويج (Norway) اللي كتسلم فيها كل عام جائزة نوبل للسلام؟',
        options: ['أوسلو (Oslo)', 'ستوكهولم (Stockholm)', 'كوبنهاغن (Copenhagen)', 'ريكيافيك (Reykjavik)'],
        a: 0,
        wikiTitle: 'Oslo',
        imageUrl: '',
        imageCaption: 'دار الأوبرا الشهيرة فـ العاصمة النرويجية',
        imageEmoji: '🇳🇴',
        imageKeyword: 'Oslo',
        imageGradient: 'from-blue-950 via-rose-950 to-slate-950'
      },
      {
        q: 'شنو هي العاصمة ديال كرواتيا (Croatia)؟',
        options: ['زغرب (Zagreb)', 'دوبروفنيك (Dubrovnik)', 'سبليت (Split)', 'سراييفو (Sarajevo)'],
        a: 0,
        wikiTitle: 'Zagreb',
        imageUrl: '',
        imageCaption: 'ساحة وكاتدرائية العاصمة الكرواتية',
        imageEmoji: '🇭🇷',
        imageKeyword: 'Zagreb',
        imageGradient: 'from-red-950 via-blue-950 to-slate-950'
      }
    ]
  },
  fastfood: {
    title: '🍔 ماركات الـ Fast Food والمطاعم فـ المغرب',
    badge: 'Fast Food',
    category: '🇲🇦 تراث ومغربيات',
    questions: [
      {
        q: 'فأشمن عام تفتح أول مطعم ديال McDonald’s فـ المغرب وفـ إفريقيا والعالم العربي كامل، وفين جا بالضبط؟',
        options: ['سنة 1992 فـ كورنيش عين الذئاب بالدار البيضاء', 'سنة 1998 فـ شارع محمد الخامس بالرباط', 'سنة 2001 فـ جيليز بمراكش', 'سنة 1988 فـ طنجة'],
        a: 0,
        wikiTitle: "McDonald's",
        imageUrl: '',
        imageCaption: 'أول ماكدونالدز فـ المغرب على كورنيش عين الذئاب بكازا (1992)',
        imageEmoji: '🍟',
        imageKeyword: "McDonald's",
        imageGradient: 'from-red-950 via-amber-900 to-slate-950'
      },
      {
        q: 'شكون هو الرجل العجوز المرسوم فـ اللوغو ديال مطاعم الدجاج المقلي KFC، وشنو هي قصة الـ 11 عشبة؟',
        options: ['الكولونيل هارلاند ساندرز (Colonel Sanders) صاحب الخلطة السرية ديال 11 عشبة وتابل', 'الشيف غوردون رامزي', 'المستر دونالد ماكدونالد', 'الكابتن جاك دانييل'],
        a: 0,
        wikiTitle: 'KFC',
        imageUrl: '',
        imageCaption: 'الكولونيل ساندرز — مؤسس سلسلة KFC',
        imageEmoji: '🍗',
        imageKeyword: 'KFC',
        imageGradient: 'from-red-900 via-rose-950 to-slate-950'
      },
      {
        q: 'فـ المغرب، أشمن سلسلة مطاعم مشهورة بـ "التاكوس الفرنسي" (French Tacos) والصلصة الفرماجية (Sauce Fromagère) منتشرة فـ كاع المدن الكبرى؟',
        options: ['O’Tacos', 'Taco Bell', 'Chipotle', 'Wendy’s'],
        a: 0,
        wikiTitle: 'French_tacos',
        imageUrl: '',
        imageCaption: 'التاكوس الفرنسي المحمر مع صلصة الفرماج (French Tacos)',
        imageEmoji: '🌯',
        imageKeyword: 'French tacos',
        imageGradient: 'from-orange-950 via-amber-900 to-slate-950'
      },
      {
        q: 'شنو سميت البرغر الأشهر والأكبر عند سلسلة "Burger King" فالمغرب والعالم واللي كيطيب فوق العافية (Flame-Grilled)؟',
        options: ['The Whopper (الوابر)', 'Big Mac', 'Big Tasty', 'Zinger Tower'],
        a: 0,
        wikiTitle: 'Whopper',
        imageUrl: '',
        imageCaption: 'برغر الـ Whopper المشوي على اللهب من Burger King',
        imageEmoji: '🍔',
        imageKeyword: 'Whopper',
        imageGradient: 'from-amber-950 via-orange-900 to-slate-950'
      },
      {
        q: 'فـ سلسلة مطاعم "Pizza Hut" فالمغرب، شنو سميت العجينة الغليظة والمقرمشة بالزيت اللي كطيب فـ مقلة غارقة وشهرت بيها بيتزا هات؟',
        options: ['Pan Pizza (عجينة البان)', 'Thin & Crispy', 'Neapolitan Crust', 'Calzone'],
        a: 0,
        wikiTitle: 'Pizza_Hut',
        imageUrl: '',
        imageCaption: 'بيتزا Pan السميكة والشهيرة ديال Pizza Hut',
        imageEmoji: '🍕',
        imageKeyword: 'Pizza Hut',
        imageGradient: 'from-red-950 via-orange-950 to-slate-950'
      },
      {
        q: 'أشمن براند عالمية ديال القهوة اللي الشعار الأخضر ديالها فيه "حورية البحر بجوج ذيول" (Twin-Tailed Siren) وعندها فروع فـ المولات المغربية؟',
        options: ['Starbucks', 'Costa Coffee', 'Tim Hortons', 'Paul'],
        a: 0,
        wikiTitle: 'Starbucks',
        imageUrl: '',
        imageCaption: 'شعار حورية البحر الخضراء ديال Starbucks',
        imageEmoji: '☕',
        imageKeyword: 'Starbucks',
        imageGradient: 'from-emerald-950 via-green-900 to-slate-950'
      },
      {
        q: 'فـ McDonald’s المغرب، كتخرج مرة فـ العام (خصوصاً فـ رمضان أو الصيف) وجبة خاصة مستوحاة من الطبخ المغربي بـ خبيز بلدي، شنو كتسمى غالباً؟',
        options: ['McArabia أو McBled / البرغر الشرقي', 'McTajine', 'McCouscous', 'McPastilla'],
        a: 0,
        wikiTitle: 'McArabia',
        imageUrl: '',
        imageCaption: 'ساندويتش McArabia الشهير فـ ماكدونالدز المغرب والعالم العربي',
        imageEmoji: '🥙',
        imageKeyword: 'McArabia',
        imageGradient: 'from-amber-900 via-red-950 to-slate-950'
      },
      {
        q: 'أشمن سلسلة مطاعم ساندويتشات عالمية معروفة بأنك نتا لي كتختار نوع الخبز (15 سم أو 30 سم Footlong) والخضرة والصوص قدام عينيك؟',
        options: ['Subway', 'Domino’s Pizza', 'Popeyes', 'Quick'],
        a: 0,
        wikiTitle: 'Subway_(restaurant)',
        imageUrl: '',
        imageCaption: 'ساندويتشات الـ Sub الطويلة ديال Subway',
        imageEmoji: '🥖',
        imageKeyword: 'Subway restaurant',
        imageGradient: 'from-emerald-900 via-yellow-950 to-slate-950'
      }
    ]
  },
  biscuits: {
    title: '🍪 البيسكوي والسقاطة القدام د المغرب (جيل الطيبين)',
    badge: 'سقاطة زمان',
    category: '🇲🇦 تراث ومغربيات',
    questions: [
      {
        q: 'شنو سميت الكيكة المغربية الأسطورية ديال شركة BIMO لي مكسية بالشكلاط وفيها خط متموج الفوق وكنا كنشريوها بـ درهم ولا جوج دراهم؟',
        options: ['Merendina (ميريندينا)', 'Genova (جينوفا)', 'Tonik (طونيك)', 'Tagger (تاغر)'],
        a: 0,
        wikiTitle: 'Snack_cake',
        imageUrl: '',
        imageCaption: 'معشوقة الطفولة المغربية — ميريندينا (Merendina) بالشكلاط',
        imageEmoji: '🍫',
        imageKeyword: 'Chocolate cake',
        imageGradient: 'from-amber-950 via-stone-900 to-slate-950'
      },
      {
        q: 'أشمن بيسكوي مغربي قديم مستطيل ومشرط كان كيتباع فـ غلاف أصفر وأحمر، ولا غمستيه فـ أتاي سخون أكثر من جوج ثواني كيذوب ويطيح فـ الكاس؟',
        options: ['Henry’s (هنريس)', 'Oreo', 'Golden', 'Bimo Sablé'],
        a: 0,
        wikiTitle: 'Marie_biscuit',
        imageUrl: '',
        imageCaption: 'بيسكوي هنريس (Henry’s) الأصفر مع كاس أتاي مشحر',
        imageEmoji: '🍪',
        imageKeyword: 'Biscuit',
        imageGradient: 'from-yellow-900 via-amber-950 to-slate-950'
      },
      {
        q: 'مع ميريندينا ولا طونيك، شنو هو المشروب الوردي الخاتر بالرمان ديال شركة Centrale اللي تربى عليه الشعب المغربي كامل فـ المدرسة؟',
        options: ['Raïbi Jamila (رايبي جميلة)', 'DanUp', 'عصير Miami', 'Poms'],
        a: 0,
        wikiTitle: 'Drinkable_yogurt',
        imageUrl: '',
        imageCaption: 'الحك الوردي الأسطوري ديال رايبي جميلة (Raïbi Jamila)',
        imageEmoji: '🍧',
        imageKeyword: 'Strawberry milk',
        imageGradient: 'from-pink-900 via-rose-950 to-slate-950'
      },
      {
        q: 'شنو سميت الگوفريط (Gaufrette) المغربية القديمة اللي كان الغلاف ديالها أحمر أو أزرق ومقرمشة بزاف وكان تمنها 10 ريال (نص درهم)؟',
        options: ['Tonik (طونيك) أو Tagger (تاغر)', 'KitKat', 'Twix', 'Bounty'],
        a: 0,
        wikiTitle: 'Wafer',
        imageUrl: '',
        imageCaption: 'گوفريط Tonik و Tagger ديال زمان بـ 10 ريال',
        imageEmoji: '🧇',
        imageKeyword: 'Wafer',
        imageGradient: 'from-red-950 via-indigo-950 to-slate-950'
      },
      {
        q: 'أشمن بيسكوي مغربي ديال زمان كان داير بحال الساندويتش مدور ولا مربع بالكريمة البيضاء وسطو ومعروف بسمية إيطالية؟',
        options: ['Rialto (ريالطو)', 'Sablé Coco', 'Momo', 'petit beurre'],
        a: 0,
        wikiTitle: 'Sandwich_cookie',
        imageUrl: '',
        imageCaption: 'بيسكوي Rialto المحشو بالكريمة ديال شركة BIMO',
        imageEmoji: '🍘',
        imageKeyword: 'Sandwich cookie',
        imageGradient: 'from-amber-900 via-orange-950 to-slate-950'
      },
      {
        q: 'فـ الصغر عند مول الحانوت، شنو سميت المسكة (Chewing-gum) اللي كان وسطها وشم كيتلصق بالماء على اليد ولا تصاور الكرة بـ درهم ولا زوج ريال؟',
        options: ['مسكة Bubbaloo أو Malabar أو Flash', 'Clorets', 'Mentos', 'Tic Tac'],
        a: 0,
        wikiTitle: 'Bubble_gum',
        imageUrl: '',
        imageCaption: 'مسكة الطفولة بـ الوشم المائي والنفخات الكبار',
        imageEmoji: '🫧',
        imageKeyword: 'Bubble gum',
        imageGradient: 'from-fuchsia-950 via-pink-900 to-slate-950'
      },
      {
        q: 'شنو سميت ديك الحلوى ولا الغبرة الحامضة اللي كانت فـ خنيشة صغيرة ومعاها مصاصة على شكل رجل ولا يد كنغمسوها فيها وكتطرطق فـ الفم؟',
        options: ['حلوى الرجل الطرطاقة (Pop Rocks / Dip Dab)', 'المارشميلو', 'عرق السوس', 'النبگ'],
        a: 0,
        wikiTitle: 'Pop_Rocks',
        imageUrl: '',
        imageCaption: 'الحلوى اللي كتطرطق فـ الفم ديال سقاطة التسعينات والألفينات',
        imageEmoji: '💥',
        imageKeyword: 'Candy',
        imageGradient: 'from-purple-950 via-rose-900 to-slate-950'
      },
      {
        q: 'شنو سميت الجينواز (الكيكة الرطبة) اللي كانت وسطها الكونفيتير ديال الفريز ولا المشماش ومغطية بالشكلاط من برا؟',
        options: ['Genova (جينوفا)', 'طونيك', 'صالي (Salé)', 'كرواصة'],
        a: 0,
        wikiTitle: 'Jaffa_Cakes',
        imageUrl: '',
        imageCaption: 'كيكة جينوفا (Genova) المحشوة بالمربى والشكلاط',
        imageEmoji: '🍓',
        imageKeyword: 'Sponge cake',
        imageGradient: 'from-rose-950 via-amber-950 to-slate-950'
      }
    ]
  },
  movies: {
    title: '🎬 أفلام ومسلسلات مغربية خالدة',
    badge: 'السينما المغربية',
    category: '🇲🇦 تراث ومغربيات',
    questions: [
      {
        q: 'فـ الفيلم المغربي الأسطوري "كازانيكرا" (Casanegra - 2008) ديال نور الدين الخماري، شنو كانو السميات ديال البطلين اللي لعبو دورهم أنس الباز وعمر لطفي؟',
        options: ['عاديل وكريم (Adil & Karim)', 'علي وكويكا', 'سعيد وحميد', 'الزريرق وبنعيسى'],
        a: 0,
        wikiTitle: 'Casanegra_(film)',
        imageUrl: '',
        imageCaption: 'الفيلم المغربي الشهير Casanegra (2008)',
        imageEmoji: '🎬',
        imageKeyword: 'Casablanca',
        imageGradient: 'from-slate-900 via-zinc-900 to-indigo-950'
      },
      {
        q: 'شكون هو الممثل المغربي القدير اللي لعب دور "الماجدوب" أو "بوغابة" ولا "الحاج عيبود" فـ سلسلة "لالا فاطمة" و"وجع التراب"؟',
        options: ['محمد بنبراهيم أو محمد بسطاوي رحمهما الله', 'رشيد الوالي', 'عزيز الحطاب', 'ربيع القاطي'],
        a: 0,
        wikiTitle: 'Cinema_of_Morocco',
        imageUrl: '',
        imageCaption: 'عمالقة الدراما والسينما المغربية الأصيلة',
        imageEmoji: '🎭',
        imageKeyword: 'Moroccan cinema',
        imageGradient: 'from-amber-950 via-stone-900 to-slate-950'
      },
      {
        q: 'فـ المسلسل التراثي الشهير "حديدان"، شكون هو الممثل اللي جسد شخصية "حديدان" الحيلي والذكي اللي ديما كيغلب القاضي ودواير الزمان؟',
        options: ['كمال كاظيمي', 'محمد خيي', 'طارق البخاري', 'عزيز داداس'],
        a: 0,
        wikiTitle: 'Moroccan_television',
        imageUrl: '',
        imageCaption: 'شخصية حديدان التراثية الشهيرة فـ التلفزة المغربية',
        imageEmoji: '👳‍♂️',
        imageKeyword: 'Marrakesh',
        imageGradient: 'from-orange-950 via-amber-900 to-slate-950'
      },
      {
        q: 'فـ الفيلم المغربي الكوميدي الشهير "الطريق إلى كابول" (Road to Kabul - 2012)، شنو هي المدينة اللي كانو باغين يمشيو ليها الصحاب الأربعة حرّاكة ولقاو راسهم فـ أفغانستان؟',
        options: ['كانو باغين يمشيو لـ أمستردام (هولندا) ولقاو راسهم فـ كابول', 'كانو باغين يمشيو لـ باريس', 'كانو باغين يمشيو لـ نيويورك', 'كانو باغين يمشيو لـ طوكيو'],
        a: 0,
        wikiTitle: 'Road_to_Kabul',
        imageUrl: '',
        imageCaption: 'الفيلم الكوميدي المغربي "الطريق إلى كابول" (أعلى إيرادات فـ القاعات)',
        imageEmoji: '✈️',
        imageKeyword: 'Kabul',
        imageGradient: 'from-amber-900 via-red-950 to-slate-950'
      },
      {
        q: 'شنو سميت الفيلم المغربي ديال نبيل عيوش (2000) اللي كيحكي قصة أطفال الشوارع فـ الدار البيضاء وكان البطل ديالو هو "علي زاوا"؟',
        options: ['علي زاوا: أمير الشارع (Ali Zaoua)', 'يا خيل الله', 'غزية', 'الزين اللي فيك'],
        a: 0,
        wikiTitle: 'Ali_Zaoua',
        imageUrl: '',
        imageCaption: 'فيلم "علي زاوا" الحائز على جوائز عالمية كبيرة',
        imageEmoji: '⛵',
        imageKeyword: 'Ali Zaoua',
        imageGradient: 'from-sky-950 via-blue-950 to-slate-950'
      },
      {
        q: 'فـ الفيلم التلفزيوني الكوميدي الشهير "البرتقالة المرة" اللي بكّى المغاربة كاملين، شكون هي الممثلة اللي لعبت دور "سعدية" مع يوسف الجندي؟',
        options: ['هدى الريحاني', 'السعدية لاديب', 'سامية أقريو', 'نورا الصقلي'],
        a: 0,
        wikiTitle: 'Bitter_Orange',
        imageUrl: '',
        imageCaption: 'الفيلم المغربي الشهير "البرتقالة المرة" (هدى الريحاني ويوسف الجندي)',
        imageEmoji: '🍊',
        imageKeyword: 'Orange fruit',
        imageGradient: 'from-orange-900 via-rose-950 to-slate-950'
      },
      {
        q: 'فـ السيتكوم الرمضاني الخالد "لكوبل" (L’Couple)، شنو كانو سميات الشخصيتين اللي لعبوهم حسن الفد ودنيا بوطازوت؟',
        options: ['كبور والشعيبية', 'الحبيب وزهرة', 'عزيزة وبوجمعة', 'رحيمو وعلال'],
        a: 0,
        wikiTitle: 'Hassan_El_Fad',
        imageUrl: '',
        imageCaption: 'الثنائي الكوميدي الأسطوري كبور والشعيبية (L’Couple)',
        imageEmoji: '😂',
        imageKeyword: 'Comedy',
        imageGradient: 'from-emerald-950 via-amber-950 to-slate-950'
      },
      {
        q: 'شكون هو الممثل المغربي الفكاهي اللي بطل فيلم "فيها الملحة والسكر وما بغاتش تموت" وفيلم "عمي" و"البوز"؟',
        options: ['عبد الإله عاجل أو عزيز داداس / رشيد الوالي', 'سعيد الناصري', 'عبد الله فركوس', 'محمد الجم'],
        a: 0,
        wikiTitle: 'Moroccan_cinema',
        imageUrl: '',
        imageCaption: 'كلاسيكيات الكوميديا والسينما المغربية',
        imageEmoji: '🎥',
        imageKeyword: 'Film projector',
        imageGradient: 'from-indigo-950 via-purple-950 to-slate-950'
      }
    ]
  }
};

const EMOJI_TAUNTS = ['🔥', '⚡', '😎', '🤯', '😂', '👀', '🏆', '💀'];

const wikiImageCache = {};

async function fetchExactSubjectImageFromWikipedia(wikiQuery) {
  if (!wikiQuery) return null;
  const cleanQuery = wikiQuery.trim();
  if (wikiImageCache[cleanQuery]) return wikiImageCache[cleanQuery];

  try {
    const encodedTitle = encodeURIComponent(cleanQuery.replace(/\s+/g, '_'));
    const directRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`
    );
    if (directRes.ok) {
      const data = await directRes.json();
      const imgUrl = data?.originalimage?.source || data?.thumbnail?.source;
      if (imgUrl) {
        wikiImageCache[cleanQuery] = imgUrl;
        return imgUrl;
      }
    }

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      cleanQuery
    )}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = searchData?.query?.pages;
      if (pages) {
        const firstPage = Object.values(pages)[0];
        const thumbUrl = firstPage?.thumbnail?.source;
        if (thumbUrl) {
          wikiImageCache[cleanQuery] = thumbUrl;
          return thumbUrl;
        }
      }
    }
  } catch (e) {}
  return null;
}

function QuestionPictureBanner({ question, roundNumber }) {
  const [resolvedSrc, setResolvedSrc] = useState(question?.imageUrl || '');
  const [imgFailed, setImgFailed] = useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setImgFailed(false);

    const directUrl = question?.imageUrl || '';
    const lookupQuery = question?.wikiTitle || question?.imageKeyword || '';

    if (directUrl) {
      setResolvedSrc(directUrl);
    } else {
      setResolvedSrc('');
    }

    if (lookupQuery) {
      setIsLoadingPhoto(!directUrl);
      fetchExactSubjectImageFromWikipedia(lookupQuery).then((wikiPhoto) => {
        if (!isMounted) return;
        setIsLoadingPhoto(false);
        if (wikiPhoto) {
          setResolvedSrc((prev) => prev || wikiPhoto);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [question?.q, question?.imageUrl, question?.wikiTitle, question?.imageKeyword, roundNumber]);

  const handleImageError = async () => {
    const lookupQuery = question?.wikiTitle || question?.imageKeyword || '';
    if (lookupQuery) {
      const backupWikiUrl = await fetchExactSubjectImageFromWikipedia(lookupQuery);
      if (backupWikiUrl && backupWikiUrl !== resolvedSrc) {
        setResolvedSrc(backupWikiUrl);
        return;
      }
    }
    setImgFailed(true);
  };

  if (!question) return null;

  const emoji = question.imageEmoji || '🎯';
  const caption = question.imageCaption || question.imageKeyword || `سؤال رقم ${roundNumber}`;
  const grad = question.imageGradient || 'from-indigo-900 via-slate-900 to-fuchsia-950';

  return (
    <div
      className={`relative w-full h-48 sm:h-60 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br ${grad} shadow-xl`}
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="zellige" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 0 L40 20 L20 40 L0 20 Z"
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
            <circle cx="20" cy="20" r="4" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zellige)" />
      </svg>

      {!imgFailed && resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={caption}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90 transition-transform duration-700 hover:scale-105"
        />
      )}

      {isLoadingPhoto && !resolvedSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="text-xs font-bold text-indigo-300 animate-pulse">
            📸 كيجبد الصورة الحقيقية ديال السؤال...
          </div>
        </div>
      )}

      {(imgFailed || (!resolvedSrc && !isLoadingPhoto)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-5xl mb-2 drop-shadow-lg">{emoji}</div>
          <div className="text-sm font-extrabold text-white/90" dir="rtl">
            {caption}
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

      <div className="absolute top-3 right-3 w-11 h-11 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-lg">
        {emoji}
      </div>

      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[11px] font-extrabold text-emerald-300">
        📸 صورة حقيقية · السؤال #{roundNumber}
      </div>

      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2" dir="rtl">
        <span className="px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-xs font-bold text-slate-100 truncate">
          {emoji} {caption}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// GEMINI (gemini-3.5-flash-lite) QUIZ GENERATOR IN MOROCCAN DARIJA + WIKIPEDIA PHOTOS
// ============================================================================
async function generateAIQuizWithGemini(
  topic,
  difficulty = 'Medium',
  count = 8,
  geminiApiKey = ''
) {
  const cleanKey = (geminiApiKey || '').trim();
  if (!cleanKey) {
    throw new Error('MISSING_GEMINI_KEY');
  }

  const modelName = 'gemini-3.5-flash-lite';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const systemPrompt = `You are an expert Moroccan trivia host creating a fast-paced 1v1 competitive quiz in authentic Moroccan Darija (الدارجة المغربية).
Write all questions ("q") and all 4 multiple-choice options ("options") in clear, natural Moroccan Darija using Arabic script.
CRITICAL FOR ACCURATE PHOTOS:
For EVERY question, you MUST provide "wikiTitle": the exact English Wikipedia article title of the visual subject of the question (for example: "Chefchaouen", "Yassine_Bounou", "Tajine", "Hassan_II_Mosque", "Lionel_Messi", "Eiffel_Tower", "Mars", "Naruto").
Choose questions about famous people, places, monuments, animals, foods, movies, anime, or objects that definitely have a real photograph on English Wikipedia!
Return ONLY a valid JSON object with a single root key "questions" containing an array of ${count} objects. Each object MUST have:
- "q": string (question in Moroccan Darija)
- "options": array of exactly 4 strings in Moroccan Darija
- "a": integer 0 to 3 indicating the correct option index
- "wikiTitle": string (exact English Wikipedia article title for the photo)
- "imageCaption": short caption in Moroccan Darija describing the visual subject without spoiling the answer
- "imageEmoji": single relevant emoji`;

  const userQuery = `صاوب ليا كويز تنافسي فيه ${count} ديال الأسئلة بالدارجة المغربية على موضوع: "${topic}" بمستوى صعوبة "${difficulty}". اختار أسئلة عندها صور حقيقية معروفة فـ Wikipedia وعطيني wikiTitle دقيق بالإنجليزية لكل سؤال فـ JSON تحت المفتاح "questions".`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userQuery }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          questions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                q: { type: 'STRING' },
                options: {
                  type: 'ARRAY',
                  items: { type: 'STRING' }
                },
                a: { type: ' INTEGER'.trim() },
                wikiTitle: { type: 'STRING' },
                imageCaption: { type: 'STRING' },
                imageEmoji: { type: 'STRING' }
              },
              required: ['q', 'options', 'a', 'wikiTitle', 'imageCaption', 'imageEmoji']
            }
          }
        },
        required: ['questions']
      }
    }
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) errDetail = errJson.error.message;
    } catch (e) {}
    throw new Error(errDetail);
  }

  const data = await res.json();
  const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!contentText) {
    throw new Error('Empty response from Gemini API');
  }

  const cleanedJson = contentText.replace(/```json|```/g, '').trim();
  const parsedObj = JSON.parse(cleanedJson);
  const rawList = Array.isArray(parsedObj)
    ? parsedObj
    : Array.isArray(parsedObj.questions)
    ? parsedObj.questions
    : [];

  if (rawList.length === 0) {
    throw new Error('Invalid questions format returned by Gemini');
  }

  const enriched = await Promise.all(
    rawList.slice(0, count).map(async (item) => {
      const exactPhoto = await fetchExactSubjectImageFromWikipedia(
        item.wikiTitle || topic
      );
      return {
        q: item.q,
        options: Array.isArray(item.options)
          ? item.options.slice(0, 4)
          : ['A', 'B', 'C', 'D'],
        a: typeof item.a === 'number' && item.a >= 0 && item.a <= 3 ? item.a : 0,
        wikiTitle: item.wikiTitle || topic,
        imageKeyword: item.wikiTitle || topic,
        imageCaption: item.imageCaption || topic,
        imageEmoji: item.imageEmoji || '✨',
        imageUrl: exactPhoto || ''
      };
    })
  );

  return enriched;
}

function copyTextToClipboard(text) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (e) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      return true;
    }
    return false;
  }
}

function extractRoomCodeFromInput(rawInput) {
  if (!rawInput) return '';
  const trimmed = rawInput.trim().toUpperCase();
  const explicitMatch = trimmed.match(/(?:CODE[:\s]+|ROOM[=:\s]+)([A-Z0-9-]{4,12})/i);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].toUpperCase();
  }
  if (/^[A-Z0-9-]{4,12}$/.test(trimmed)) {
    return trimmed;
  }
  const tokens = trimmed.split(/[\s,!.?/;:'"()[\]]+/);
  for (const t of tokens) {
    if (/^[A-Z0-9-]{6,12}$/.test(t) && /\d/.test(t)) {
      return t;
    }
  }
  return trimmed.replace(/[^A-Z0-9-]/g, '').slice(0, 10);
}

const PACK_CODE_MAP = {
  makla: 'M',
  cars: 'C',
  general: 'G',
  rap: 'R',
  makeup: 'K',
  players: 'P',
  arab_capitals: 'A',
  euro_capitals: 'E',
  fastfood: 'F',
  biscuits: 'B',
  movies: 'V'
};

const CODE_TO_PACK_MAP = {
  M: 'makla',
  C: 'cars',
  G: 'general',
  R: 'rap',
  K: 'makeup',
  P: 'players',
  A: 'arab_capitals',
  E: 'euro_capitals',
  F: 'fastfood',
  B: 'biscuits',
  V: 'movies'
};

function generateSmartRoomCode(packKey = 'makla', settings = {}) {
  const pChar = PACK_CODE_MAP[packKey] || 'M';
  const durCode =
    settings.roundDurationSec === 8
      ? '1'
      : settings.roundDurationSec === 20
      ? '3'
      : settings.roundDurationSec === 30
      ? '4'
      : '2';
  const countChar = String(settings.questionCount || 8);
  const flagsChar =
    (settings.showPictures !== false ? 2 : 0) + (settings.allowPowerUps !== false ? 1 : 0);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r1 = chars.charAt(Math.floor(Math.random() * chars.length));
  const r2 = chars.charAt(Math.floor(Math.random() * chars.length));
  return `${pChar}${durCode}${countChar}${flagsChar}${r1}${r2}`;
}

function decodeSmartRoomCode(code) {
  const clean = (code || '').trim().toUpperCase();
  const packKey = CODE_TO_PACK_MAP[clean.charAt(0)] || 'makla';
  const durChar = clean.charAt(1);
  const roundDurationSec =
    durChar === '1' ? 8 : durChar === '3' ? 20 : durChar === '4' ? 30 : 12;
  const parsedCount = parseInt(clean.charAt(2), 10);
  const questionCount = [4, 6, 8].includes(parsedCount) ? parsedCount : 8;
  const flags = parseInt(clean.charAt(3), 10);
  const showPictures = isNaN(flags) ? true : (flags & 2) !== 0;
  const allowPowerUps = isNaN(flags) ? true : (flags & 1) !== 0;

  return {
    packKey,
    settings: {
      roundDurationSec,
      questionCount,
      showPictures,
      allowPowerUps
    }
  };
}

async function saveRoomToGlobalCloud(code, stateObj) {
  if (!code || !stateObj) return false;
  inMemoryRooms[code] = stateObj;
  notifyRoomSubscribers();

  // Broadcast across browser tabs
  try {
    if (window.__qbBroadcast) {
      window.__qbBroadcast.postMessage(stateObj);
    }
  } catch (e) {}

  // Broadcast to global MQTT broker for cross-device online play on Vercel
  try {
    if (mqttClientInstance && mqttClientInstance.connected) {
      mqttClientInstance.publish(
        `quizblitz_v4_global/rooms/${code}`,
        JSON.stringify(stateObj),
        { qos: 0, retain: true }
      );
    }
  } catch (e) {}

  return true;
}

async function loadRoomFromGlobalCloud(code) {
  if (!code) return null;
  if (inMemoryRooms[code]) {
    return inMemoryRooms[code];
  }
  return null;
}

function QuizArenaInstance({
  user,
  authReady,
  defaultName = '',
  isSplitChild = false,
  sharedOpenRooms = [],
  externalJoinRoomCode = null,
  publicShareUrl = '',
  setPublicShareUrl = () => {},
  onOpenShareModal = () => {},
  geminiApiKey = '',
  setGeminiApiKey = () => {}
}) {
  const [playerName, setPlayerName] = useState(defaultName);
  const [playerAvatar, setPlayerAvatar] = useState(() =>
    defaultName.includes('2') ? '🦅' : '🦁'
  );
  const [isEditingLobbyProfile, setIsEditingLobbyProfile] = useState(false);
  const [tempLobbyName, setTempLobbyName] = useState('');
  const [nameHighlightError, setNameHighlightError] = useState(false);
  const nameInputRef = useRef(null);

  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedDoublePoints, setUsedDoublePoints] = useState(false);
  const [activeDoublePoints, setActiveDoublePoints] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]);

  const [view, setView] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [isBotMode, setIsBotMode] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [urlInvitedRoom, setUrlInvitedRoom] = useState(null);

  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDirectUrl, setCopiedDirectUrl] = useState(false);

  const [selectedPack, setSelectedPack] = useState('makla');
  const [packCategoryFilter, setPackCategoryFilter] = useState('ALL');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const DEFAULT_SETTINGS = {
    roundDurationSec: 12,
    showPictures: true,
    questionCount: 8,
    allowPowerUps: true
  };
  const [quizSettings, setQuizSettings] = useState(DEFAULT_SETTINGS);

  const activeSettings = sessionData?.settings || quizSettings || DEFAULT_SETTINGS;
  const ROUND_DURATION = (activeSettings.roundDurationSec || 12) * 1000;

  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION);
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundRevealed, setRoundRevealed] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState(null);

  const botTimeoutRef = useRef(null);
  const lastSeenTauntRef = useRef(0);
  const sessionDataRef = useRef(null);
  const lastSyncTimestampRef = useRef(0);
  const [netStatus] = useState('متصل وجاهز للعب المباشر 1v1 ⚡ (gemini-3.5-flash-lite + Vercel Ready)');

  useEffect(() => {
    sessionDataRef.current = sessionData;
  }, [sessionData]);

  const syncRoomStateEverywhere = async (nextSessionState) => {
    if (!nextSessionState) return;
    const stampedState = {
      ...nextSessionState,
      updatedAt: Date.now()
    };
    lastSyncTimestampRef.current = stampedState.updatedAt;
    sessionDataRef.current = stampedState;
    setSessionData(stampedState);
    if (stampedState?.settings) {
      setQuizSettings(stampedState.settings);
    }

    if (stampedState.roomCode) {
      saveRoomToGlobalCloud(stampedState.roomCode, stampedState);
    }
  };

  useEffect(() => {
    initGlobalMultiplayerSync((incomingRoom) => {
      if (
        incomingRoom &&
        sessionDataRef.current &&
        incomingRoom.roomCode === sessionDataRef.current.roomCode
      ) {
        setSessionData(incomingRoom);
        sessionDataRef.current = incomingRoom;
        if (incomingRoom.settings) setQuizSettings(incomingRoom.settings);
        if (incomingRoom.status === 'playing') setView('game');
        else if (incomingRoom.status === 'finished') setView('results');
        else if (incomingRoom.status === 'waiting') setView('lobby');
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isSplitChild) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        const clean = extractRoomCodeFromInput(roomParam);
        if (clean && clean.length >= 4) {
          setUrlInvitedRoom(clean);
          setJoinInput(clean);
        }
      }
    } catch (e) {}
  }, [isSplitChild]);

  useEffect(() => {
    if (externalJoinRoomCode && view === 'home' && authReady) {
      handleJoinRoom(externalJoinRoomCode);
    }
  }, [externalJoinRoomCode, authReady]);

  // Subscribe to room updates for Split-Screen & Global MQTT
  useEffect(() => {
    if (!roomCode) return;
    const handleMemoryUpdate = () => {
      const data = inMemoryRooms[roomCode];
      if (!data) return;
      if (data.updatedAt && data.updatedAt !== sessionDataRef.current?.updatedAt) {
        setSessionData(data);
        sessionDataRef.current = data;
        if (data.settings) setQuizSettings(data.settings);

        if (data.lastTaunt && data.lastTaunt.timestamp > lastSeenTauntRef.current) {
          lastSeenTauntRef.current = data.lastTaunt.timestamp;
          setFloatingEmoji(data.lastTaunt);
          sfx.taunt();
          setTimeout(() => setFloatingEmoji(null), 2400);
        }

        if (data.status === 'playing') setView('game');
        else if (data.status === 'finished') setView('results');
        else if (data.status === 'waiting') setView('lobby');
      }
    };

    roomSubscribers.add(handleMemoryUpdate);
    return () => roomSubscribers.delete(handleMemoryUpdate);
  }, [roomCode]);

  const currentRound = sessionData?.currentRound ?? 0;
  const matchId = sessionData?.matchId ?? 0;

  useEffect(() => {
    setSelectedOption(null);
    setRoundRevealed(false);
    setTimeLeftMs(ROUND_DURATION);
    setHiddenOptions([]);
    setActiveDoublePoints(false);
  }, [currentRound, matchId, ROUND_DURATION]);

  useEffect(() => {
    setUsedFiftyFifty(false);
    setUsedDoublePoints(false);
    setHiddenOptions([]);
    setActiveDoublePoints(false);
  }, [matchId]);

  const handleUpdateQuizSettings = async (partialSettings) => {
    sfx.click();
    const updated = {
      ...activeSettings,
      ...partialSettings
    };
    setQuizSettings(updated);

    if (!sessionDataRef.current) return;

    let updatedQuestions = sessionDataRef.current.questions;
    if (partialSettings.questionCount && CURATED_PACKS[selectedPack]) {
      const fullPack = CURATED_PACKS[selectedPack].questions;
      if (sessionDataRef.current.quizTitle === CURATED_PACKS[selectedPack].title) {
        updatedQuestions = fullPack.slice(0, partialSettings.questionCount);
      }
    }

    const updatedSmartCode = generateSmartRoomCode(selectedPack, updated);
    setRoomCode(updatedSmartCode);

    const nextState = {
      ...sessionDataRef.current,
      roomCode: updatedSmartCode,
      settings: updated,
      questions: updatedQuestions
    };
    await syncRoomStateEverywhere(nextState);
  };

  const getEffectivePlayerName = (fallbackRole = 'لاعب') => {
    const trimmed = playerName.trim();
    if (trimmed) return trimmed;
    return `${fallbackRole} ${playerAvatar}`;
  };

  const handleUpdateProfileInRoom = async (newName, newAvatar) => {
    sfx.click();
    const cleanName = (newName || '').trim() || getEffectivePlayerName('بطل');
    setPlayerName(cleanName);
    setPlayerAvatar(newAvatar);
    setIsEditingLobbyProfile(false);

    if (!sessionDataRef.current) return;
    const myUid = user?.uid || sessionDataRef.current.hostId || 'local-host';
    const existingP = sessionDataRef.current.players?.[myUid];
    if (!existingP) return;

    const updatedPlayers = {
      ...(sessionDataRef.current.players || {}),
      [myUid]: {
        ...existingP,
        name: cleanName,
        avatar: newAvatar,
        updatedAt: Date.now()
      }
    };

    const nextState = {
      ...sessionDataRef.current,
      hostName:
        sessionDataRef.current.hostId === myUid
          ? cleanName
          : sessionDataRef.current.hostName,
      players: updatedPlayers
    };
    await syncRoomStateEverywhere(nextState);
  };

  const handleActivateFiftyFifty = () => {
    if (usedFiftyFifty || roundRevealed) return;
    const qObj = sessionData?.questions?.[currentRound];
    if (!qObj) return;
    sfx.lockIn();
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== qObj.a);
    const shuffledWrong = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(shuffledWrong);
    setUsedFiftyFifty(true);
  };

  const handleActivateDoublePoints = () => {
    if (usedDoublePoints || roundRevealed) return;
    sfx.lockIn();
    setActiveDoublePoints(true);
    setUsedDoublePoints(true);
  };

  useEffect(() => {
    if (view !== 'game' || !sessionData || sessionData.status !== 'playing') return;

    const timer = setInterval(() => {
      const currentS = sessionDataRef.current;
      if (!currentS || currentS.status !== 'playing') return;

      const elapsed = Date.now() - (currentS.roundStartTime || Date.now());
      const rem = Math.max(0, ROUND_DURATION - elapsed);
      setTimeLeftMs(rem);

      const pList = Object.values(currentS.players || {});
      const rIdx = currentS.currentRound || 0;
      const allAnswered =
        pList.length > 0 &&
        pList.every((p) => p.answers && p.answers[rIdx] !== undefined);

      if (allAnswered || rem <= 0) {
        setRoundRevealed((prev) => {
          if (!prev) {
            const myUid = user?.uid || 'local-host';
            const myAns = currentS.players?.[myUid]?.answers?.[rIdx];
            if (myAns?.correct) sfx.correct();
            else sfx.wrong();
          }
          return true;
        });
      }
    }, 80);

    return () => clearInterval(timer);
  }, [view, sessionData?.status, currentRound, ROUND_DURATION, user]);

  useEffect(() => {
    if (view !== 'game' || !sessionData || sessionData.status !== 'playing') return;
    const currentS = sessionDataRef.current;
    if (!currentS) return;

    const rivalId = isBotMode
      ? 'bot-rival'
      : currentS.players?.['friend-synced']
      ? 'friend-synced'
      : null;
    if (!rivalId) return;

    const rivalPlayer = currentS.players?.[rivalId];
    if (!rivalPlayer || rivalPlayer.answers?.[currentRound] !== undefined) return;

    const seedKey = `${currentS.roomCode}-${currentRound}`;
    const rVal1 = seededRandom(seedKey + '-time');
    const rVal2 = seededRandom(seedKey + '-acc');
    const delayMs = 2000 + rVal1 * 3200;

    botTimeoutRef.current = setTimeout(() => {
      const latestS = sessionDataRef.current;
      if (!latestS || latestS.status !== 'playing') return;
      const rIdx = latestS.currentRound || 0;
      const qObj = latestS.questions?.[rIdx];
      if (!qObj) return;

      const isCorrect = rVal2 < 0.75;
      const choice = isCorrect ? qObj.a : (qObj.a + 1) % 4;
      const speedFactor = 1 - Math.min(1, delayMs / ROUND_DURATION) * 0.5;
      const newStreak = isCorrect ? (rivalPlayer.streak || 0) + 1 : 0;
      const pts = isCorrect
        ? Math.round(1000 * speedFactor) + (newStreak >= 3 ? 150 : 0)
        : 0;

      const updatedRival = {
        ...rivalPlayer,
        score: (rivalPlayer.score || 0) + pts,
        streak: newStreak,
        answers: {
          ...(rivalPlayer.answers || {}),
          [rIdx]: {
            choice,
            pts,
            correct: isCorrect,
            timeMs: Math.round(delayMs)
          }
        }
      };

      const nextState = {
        ...latestS,
        players: {
          ...(latestS.players || {}),
          [rivalId]: updatedRival
        }
      };
      setSessionData(nextState);
      sessionDataRef.current = nextState;
    }, delayMs);

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [view, currentRound, matchId, isBotMode, ROUND_DURATION]);

  const handleCreateRoom = () => {
    sfx.click();

    if (!playerName.trim()) {
      setNameHighlightError(true);
      setStatusBanner({
        type: 'error',
        msg: '✍️ عافاك كتب السمية ديالك الفوق أو كليكي على شي لقب واجد قبل ما تكريي الروم!'
      });
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }

    const myUid = user?.uid || 'host-' + Math.random().toString(36).substring(2, 8);
    const newCode = generateSmartRoomCode(selectedPack, quizSettings);
    const cleanName = getEffectivePlayerName('بطل');
    const defaultQuestions = CURATED_PACKS[selectedPack].questions.slice(
      0,
      quizSettings.questionCount || 8
    );

    const roomDoc = {
      roomCode: newCode,
      hostId: myUid,
      hostName: cleanName,
      status: 'waiting',
      quizTitle: CURATED_PACKS[selectedPack].title,
      questions: defaultQuestions,
      questionsJson: JSON.stringify(defaultQuestions),
      settings: quizSettings,
      currentRound: 0,
      roundStartTime: Date.now(),
      matchId: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      players: {
        [myUid]: {
          id: myUid,
          name: cleanName,
          avatar: playerAvatar,
          score: 0,
          streak: 0,
          isHost: true,
          joinedAt: Date.now(),
          updatedAt: Date.now(),
          answers: {}
        }
      }
    };

    setIsBusy(false);
    setIsBotMode(false);
    setRoomCode(newCode);
    setSessionData(roomDoc);
    sessionDataRef.current = roomDoc;
    setTempLobbyName(cleanName);
    setView('lobby');
    setStatusBanner({
      type: 'success',
      msg: `✅ الروم "${newCode}" واجد! صيفط هاد الكود ولا رابط الدعوة لصاحبك باش يدخل معاك مباشرة!`
    });

    saveRoomToGlobalCloud(newCode, roomDoc).catch(() => {});
  };

  const handleJoinRoom = async (rawCodeInput = null) => {
    sfx.click();
    if (!playerName.trim() && !externalJoinRoomCode) {
      setNameHighlightError(true);
      setStatusBanner({
        type: 'error',
        msg: '✍️ كتب السمية ديالك الفوق أو اختار لقب قبل ما تدخل للروم مع صاحبك!'
      });
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }

    const extractedCode = extractRoomCodeFromInput(rawCodeInput || joinInput);
    if (!extractedCode || extractedCode.length < 4) {
      setStatusBanner({
        type: 'error',
        msg: '🔑 عافاك كتب كود الروم الصحيح المكون من 6 حروف/أرقام.'
      });
      return;
    }

    setIsBusy(true);
    const cleanName = getEffectivePlayerName('منافس');
    const myUid = user?.uid || 'guest-' + Math.random().toString(36).substring(2, 8);
    const myPlayerObj = {
      id: myUid,
      name: cleanName,
      avatar: playerAvatar,
      score: 0,
      streak: 0,
      isHost: false,
      joinedAt: Date.now(),
      updatedAt: Date.now(),
      answers: {}
    };

    try {
      const existingRoom = await loadRoomFromGlobalCloud(extractedCode);

      if (existingRoom && existingRoom.roomCode === extractedCode) {
        const updatedPlayers = { ...(existingRoom.players || {}) };
        delete updatedPlayers['friend-synced'];
        updatedPlayers[myUid] = {
          ...myPlayerObj,
          isHost: existingRoom.hostId === myUid
        };

        const updatedRoom = {
          ...existingRoom,
          updatedAt: Date.now(),
          players: updatedPlayers
        };

        setIsBusy(false);
        setIsBotMode(false);
        setRoomCode(extractedCode);
        setSessionData(updatedRoom);
        sessionDataRef.current = updatedRoom;
        setTempLobbyName(cleanName);
        setStatusBanner({
          type: 'success',
          msg: `🎉 دخلتي بنجاح للروم "${extractedCode}" مع ${existingRoom.hostName}!`
        });
        if (updatedRoom.status === 'playing') setView('game');
        else if (updatedRoom.status === 'finished') setView('results');
        else setView('lobby');

        saveRoomToGlobalCloud(extractedCode, updatedRoom).catch(() => {});
        return;
      }

      const decoded = decodeSmartRoomCode(extractedCode);
      const packObj = CURATED_PACKS[decoded.packKey] || CURATED_PACKS.makla;
      const syncedQuestions = packObj.questions.slice(
        0,
        decoded.settings.questionCount || 8
      );

      const syncedRoomDoc = {
        roomCode: extractedCode,
        hostId: myUid,
        hostName: cleanName,
        status: 'waiting',
        quizTitle: packObj.title,
        questions: syncedQuestions,
        settings: decoded.settings,
        currentRound: 0,
        roundStartTime: Date.now(),
        matchId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        players: {
          [myUid]: {
            ...myPlayerObj,
            isHost: true
          },
          'friend-synced': {
            id: 'friend-synced',
            name: 'منافسك المباشر ⚡',
            avatar: '🔥',
            score: 0,
            streak: 0,
            isHost: false,
            joinedAt: Date.now(),
            answers: {}
          }
        }
      };

      setIsBusy(false);
      setIsBotMode(false);
      setSelectedPack(decoded.packKey);
      setQuizSettings(decoded.settings);
      setRoomCode(extractedCode);
      setSessionData(syncedRoomDoc);
      sessionDataRef.current = syncedRoomDoc;
      setTempLobbyName(cleanName);
      setStatusBanner({
        type: 'success',
        msg: `✅ تم فتح الروم المشترك "${extractedCode}" بنفس الأسئلة والإعدادات!`
      });
      setView('lobby');
      saveRoomToGlobalCloud(extractedCode, syncedRoomDoc).catch(() => {});
    } catch (err) {
      setIsBusy(false);
    }
  };

  const handleStartBotMatch = (customCode = null) => {
    sfx.click();
    const code = customCode || generateSmartRoomCode(selectedPack, quizSettings);
    const cleanName = getEffectivePlayerName('بطل');
    if (!playerName.trim()) setPlayerName(cleanName);
    const qList = CURATED_PACKS[selectedPack].questions.slice(
      0,
      quizSettings.questionCount || 8
    );

    const botSession = {
      roomCode: code,
      hostId: user?.uid || 'local-host',
      hostName: cleanName,
      status: 'waiting',
      quizTitle: CURATED_PACKS[selectedPack].title,
      questions: qList,
      settings: quizSettings,
      currentRound: 0,
      roundStartTime: Date.now(),
      matchId: 1,
      players: {
        [user?.uid || 'local-host']: {
          id: user?.uid || 'local-host',
          name: cleanName,
          avatar: playerAvatar,
          score: 0,
          streak: 0,
          isHost: true,
          joinedAt: Date.now(),
          answers: {}
        },
        'bot-rival': {
          id: 'bot-rival',
          name: 'CyberRival (AI)',
          avatar: '🤖',
          score: 0,
          streak: 0,
          isHost: false,
          joinedAt: Date.now() + 10,
          answers: {}
        }
      }
    };

    setIsBotMode(true);
    setRoomCode(code);
    setSessionData(botSession);
    sessionDataRef.current = botSession;
    setTempLobbyName(cleanName);
    setView('lobby');
  };

  const handleSelectPack = async (packKey) => {
    sfx.click();
    setSelectedPack(packKey);
    const pack = CURATED_PACKS[packKey];
    if (!pack || !sessionDataRef.current) return;

    const slicedQuestions = pack.questions.slice(0, activeSettings.questionCount || 8);
    const newSmartCode = generateSmartRoomCode(packKey, activeSettings);
    setRoomCode(newSmartCode);

    const nextState = {
      ...sessionDataRef.current,
      roomCode: newSmartCode,
      quizTitle: pack.title,
      questions: slicedQuestions
    };
    await syncRoomStateEverywhere(nextState);
  };

  const handleGenerateCustomQuiz = async () => {
    const topic = aiTopic.trim();
    if (!topic) {
      setStatusBanner({
        type: 'error',
        msg: 'كتب أي موضوع بغيتي (مثلاً: البطولة المغربية، التاريخ، الأنمي، الأفلام)!'
      });
      return;
    }

    if (!geminiApiKey || !geminiApiKey.trim()) {
      setStatusBanner({
        type: 'error',
        msg: '🔑 عافاك حط الـ Gemini API Key ديالك (AIzaSy...) فـ الخانة ديال المفتاح عاد كليكي صاوب الكويز!'
      });
      return;
    }

    const qCount = activeSettings.questionCount || 8;
    sfx.click();
    setIsGeneratingAI(true);
    setStatusBanner({
      type: 'info',
      msg: `🤖 موديل gemini-3.5-flash-lite كيوجد ليك ${qCount} ديال الأسئلة بالدارجة مع الصور على "${topic}"...`
    });

    try {
      const generated = await generateAIQuizWithGemini(
        topic,
        aiDifficulty,
        qCount,
        geminiApiKey
      );
      const customTitle = `🤖 ${topic} بالدارجة (${aiDifficulty})`;

      if (sessionDataRef.current) {
        const nextState = {
          ...sessionDataRef.current,
          quizTitle: customTitle,
          questions: generated
        };
        await syncRoomStateEverywhere(nextState);
      }

      setStatusBanner({
        type: 'success',
        msg: `✅ واجد بـ gemini-3.5-flash-lite! الكويز "${customTitle}" بالدارجة وبالصور جاهز للعب ومزامن مع صاحبك!`
      });
      sfx.lockIn();
    } catch (err) {
      setStatusBanner({
        type: 'error',
        msg: `❌ خطأ من Gemini API (gemini-3.5-flash-lite): ${err.message || 'تأكد بلي الـ Gemini API Key ديالك صحيحة'}`
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleStartMatch = async () => {
    sfx.lockIn();
    if (!sessionDataRef.current) return;

    const resetPlayers = {};
    Object.keys(sessionDataRef.current.players || {}).forEach((pid) => {
      resetPlayers[pid] = {
        ...sessionDataRef.current.players[pid],
        score: 0,
        streak: 0,
        answers: {}
      };
    });

    const nextMatchId = (sessionDataRef.current.matchId || 1) + 1;
    const nextState = {
      ...sessionDataRef.current,
      status: 'playing',
      currentRound: 0,
      roundStartTime: Date.now(),
      matchId: nextMatchId,
      players: resetPlayers
    };

    await syncRoomStateEverywhere(nextState);
    setView('game');
  };

  const handleLockAnswer = async (choiceIdx) => {
    if (!sessionDataRef.current || !user) return;
    const currentS = sessionDataRef.current;
    const myPlayer = currentS.players?.[user.uid];
    if (!myPlayer) return;
    if (myPlayer.answers && myPlayer.answers[currentRound] !== undefined) return;

    setSelectedOption(choiceIdx);
    if (choiceIdx >= 0) sfx.lockIn();

    const qObj = currentS.questions[currentRound];
    const isCorrect = choiceIdx === qObj.a;
    const elapsed = Math.min(
      ROUND_DURATION,
      Math.max(0, Date.now() - (currentS.roundStartTime || Date.now()))
    );

    const prevStreak = myPlayer.streak || 0;
    const newStreak = isCorrect ? prevStreak + 1 : 0;

    let pts = 0;
    if (isCorrect) {
      const speedFactor = 1 - (elapsed / ROUND_DURATION) * 0.5;
      const streakBonus = newStreak >= 3 ? 150 : 0;
      const basePts = Math.round(1000 * speedFactor) + streakBonus;
      pts = activeDoublePoints ? basePts * 2 : basePts;
    }

    const updatedPlayer = {
      ...myPlayer,
      score: (myPlayer.score || 0) + pts,
      streak: newStreak,
      answers: {
        ...(myPlayer.answers || {}),
        [currentRound]: {
          choice: choiceIdx,
          pts,
          correct: isCorrect,
          timeMs: Math.round(elapsed)
        }
      }
    };

    const nextState = {
      ...currentS,
      players: {
        ...(currentS.players || {}),
        [user.uid]: updatedPlayer
      }
    };

    await syncRoomStateEverywhere(nextState);
  };

  const handleSendTaunt = async (emoji) => {
    const tauntPayload = {
      emoji,
      senderName: playerName.trim() || 'Player',
      timestamp: Date.now()
    };

    setFloatingEmoji(tauntPayload);
    sfx.taunt();
    setTimeout(() => setFloatingEmoji(null), 2200);

    if (sessionDataRef.current) {
      const nextState = {
        ...sessionDataRef.current,
        lastTaunt: tauntPayload
      };
      await syncRoomStateEverywhere(nextState);
    }
  };

  const handleNextRound = async () => {
    sfx.click();
    if (!sessionDataRef.current) return;
    const currentS = sessionDataRef.current;
    const totalQ = currentS.questions?.length || 8;
    const nextIdx = currentRound + 1;

    if (nextIdx >= totalQ) {
      sfx.victory();
      const nextState = { ...currentS, status: 'finished' };
      await syncRoomStateEverywhere(nextState);
      setView('results');
    } else {
      const nextState = {
        ...currentS,
        currentRound: nextIdx,
        roundStartTime: Date.now()
      };
      await syncRoomStateEverywhere(nextState);
    }
  };

  const handleRematch = async () => {
    sfx.click();
    if (!sessionDataRef.current) return;
    const nextState = { ...sessionDataRef.current, status: 'waiting' };
    await syncRoomStateEverywhere(nextState);
    setView('lobby');
  };

  const getShareableUrlWithRoom = () => {
    const base = publicShareUrl.trim();
    if (base) {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}room=${roomCode}`;
    }
    if (typeof window !== 'undefined') {
      const cleanBase = window.location.href.split('?')[0];
      return `${cleanBase}?room=${roomCode}`;
    }
    return `Room Code: ${roomCode}`;
  };

  const handleCopyWhatsAppInvite = () => {
    sfx.click();
    const linkPart = publicShareUrl.trim()
      ? `\n🌐 *Live Game Link:* ${getShareableUrlWithRoom()}\n`
      : `\n🌐 *Direct Link:* ${getShareableUrlWithRoom()}\n`;
    const message =
      `⚡ *QuizBlitz Arena — 1v1 Live Trivia Challenge!* ⚡\n` +
      `👑 Host: *${playerName}*\n` +
      `🎯 Quiz: *${sessionData?.quizTitle || 'General Knowledge'}*\n` +
      `🔑 Room Code: *${roomCode}*` +
      linkPart +
      `\n👉 Click the link or enter code *${roomCode}* to join immediately!`;
    copyTextToClipboard(message);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  const handleCopyDirectInviteUrl = () => {
    sfx.click();
    copyTextToClipboard(getShareableUrlWithRoom());
    setCopiedDirectUrl(true);
    setTimeout(() => setCopiedDirectUrl(false), 2500);
  };

  const handleCopyRoomCodeOnly = () => {
    sfx.click();
    copyTextToClipboard(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const playersList = sessionData?.players
    ? Object.values(sessionData.players).sort((a, b) => (b.score || 0) - (a.score || 0))
    : [];
  const isHost = sessionData?.hostId === user?.uid || isBotMode;
  const currentQuestion = sessionData?.questions?.[currentRound] || null;
  const myAnswerObj = sessionData?.players?.[user?.uid]?.answers?.[currentRound];

  return (
    <div className="w-full relative">
      {floatingEmoji && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="px-5 py-2.5 rounded-full bg-slate-900/95 border-2 border-indigo-400 shadow-2xl flex items-center gap-2.5">
            <span className="text-3xl">{floatingEmoji.emoji}</span>
            <span className="text-xs font-extrabold text-white">
              {floatingEmoji.senderName}
            </span>
          </div>
        </div>
      )}

      {statusBanner && (
        <div
          className={`mb-4 p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
            statusBanner.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : statusBanner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
          }`}
        >
          <div className="text-xs sm:text-sm font-medium">{statusBanner.msg}</div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-0.5 rounded bg-black/20"
          >
            ✕
          </button>
        </div>
      )}

      {view === 'home' && (
        <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-300">
                {netStatus}
              </span>
            </div>
            <button
              onClick={onOpenShareModal}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-xs text-emerald-200 flex items-center gap-1.5 font-bold cursor-pointer transition"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              🚀 Deploy to Vercel Guide (Step-by-Step)
            </button>
          </div>

          {urlInvitedRoom && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/80 border-2 border-emerald-400/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                  🎯 Direct Room Invitation Detected!
                </span>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                  You were invited to join Room{' '}
                  <span className="font-mono font-black text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20">
                    {urlInvitedRoom}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleJoinRoom(urlInvitedRoom)}
                disabled={isBusy || !authReady}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition cursor-pointer shrink-0"
              >
                ⚡ Join Room {urlInvitedRoom} Now →
              </button>
            </div>
          )}

          <div
            className={`p-4 sm:p-5 rounded-2xl bg-slate-950/90 border-2 transition ${
              nameHighlightError
                ? 'border-rose-500 shadow-lg shadow-rose-500/20'
                : 'border-indigo-500/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <span>👤</span> هويتك فـ اللعب (Your Custom Username & Avatar)
              </label>
              <span className="text-[11px] text-emerald-400 font-bold" dir="rtl">
                ✨ اختار سميتك باش تبان لصاحبك فـ بلاصة Player 1 / 2
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/25 border border-indigo-400/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  {playerAvatar}
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  dir="auto"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (nameHighlightError) setNameHighlightError(false);
                  }}
                  placeholder="كتب سميتك هنا (مثلاً: أمين، نادر، أسد الأطلس...)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white font-extrabold text-sm sm:text-base focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  const randomPreset =
                    DARIJA_NICKNAME_PRESETS[
                      Math.floor(Math.random() * DARIJA_NICKNAME_PRESETS.length)
                    ];
                  const randomAv =
                    AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
                  setPlayerName(randomPreset);
                  setPlayerAvatar(randomAv);
                  setNameHighlightError(false);
                }}
                className="px-3.5 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 font-bold text-xs shrink-0 cursor-pointer transition"
              >
                🎲 لقب عشوائي
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0 mr-1">
                الأفاتار:
              </span>
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setPlayerAvatar(av);
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition cursor-pointer shrink-0 ${
                    playerAvatar === av
                      ? 'bg-indigo-600 border-2 border-indigo-300 scale-110 shadow-md'
                      : 'bg-slate-900/90 border border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5" dir="rtl">
              <span className="text-[11px] text-slate-400 font-bold ml-1">
                ألقاب سريعة:
              </span>
              {DARIJA_NICKNAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setPlayerName(preset);
                    setNameHighlightError(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    playerName === preset
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-indigo-400/50 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-fuchsia-950/50 border border-indigo-500/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  🔥 Live Open Lobbies — Click to Join in 1 Click
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {sharedOpenRooms.length} Waiting
              </span>
            </div>

            {sharedOpenRooms.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-white/10 text-center text-xs text-slate-400">
                No waiting rooms right now. Click <strong>"Create Online Room"</strong> below to host one—it will appear here in real time for your friends!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sharedOpenRooms.map((rm) => {
                  const playerCount = Object.keys(rm.players || {}).length;
                  return (
                    <div
                      key={rm.roomCode}
                      className="p-3 rounded-xl bg-slate-950/85 border border-white/15 hover:border-indigo-400 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-500/30">
                            {rm.roomCode}
                          </span>
                          <span className="font-bold text-sm text-white truncate">
                            {rm.hostName || 'Host'}’s Lobby
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          🎯 {rm.quizTitle || 'General Knowledge'} · 👥 {playerCount}/2 Players
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(rm.roomCode)}
                        disabled={isBusy}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 shrink-0 cursor-pointer transition"
                      >
                        Join Room →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Host 1v1 Session
                  </span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-1">
                  Create Online Room
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Generates a 6-character code and broadcasts your room in the Live Open Lobby so friends can join with 1 click.
                </p>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                Create Online Room (فوري ⚡)
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Smart Code / Invite Joiner
                  </span>
                  <MessageSquareShare className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-2">
                  Enter Code or Paste Invite
                </h3>
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinRoom();
                  }}
                  placeholder="e.g. M283K9 or paste WhatsApp invite..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-center font-mono text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-500 mb-3"
                />
              </div>
              <button
                onClick={() => handleJoinRoom()}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                Join Friend’s Session (دخول فوري ⚡)
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Bot className="w-4 h-4 text-fuchsia-400" />
              Want to warm up solo against an AI challenger right now?
            </span>
            <button
              onClick={() => handleStartBotMatch()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition cursor-pointer"
            >
              ⚡ Play vs CyberRival Bot
            </button>
          </div>
        </div>
      )}

      {view === 'lobby' && sessionData && (
        <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-fuchsia-950/80 border border-indigo-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 block mb-1">
                  {isBotMode
                    ? '⚡ Solo Practice Lobby vs AI'
                    : '🟢 Room is Live! Share with Your Friend:'}
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white">
                    {roomCode}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    ● Listed in Live Open Lobby
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopyWhatsAppInvite}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  {copiedWhatsApp ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {copiedWhatsApp
                    ? 'Invite Message Copied!'
                    : 'Copy WhatsApp / Discord Invite'}
                </button>
                <button
                  onClick={handleCopyRoomCodeOnly}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedCode ? 'Code Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>

            {!isBotMode && (
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2">
                  <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <input
                    type="text"
                    value={publicShareUrl}
                    onChange={(e) => setPublicShareUrl(e.target.value)}
                    placeholder="Paste your Vercel URL (e.g. https://quizblitz.vercel.app) to bundle it with your Room Code!"
                    className="w-full bg-transparent text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyDirectInviteUrl}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedDirectUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedDirectUrl ? 'Direct URL Copied!' : 'Copy Direct Room Link'}
                  </button>
                  <button
                    onClick={onOpenShareModal}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-indigo-200 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Vercel Guide
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                اللعابا فـ الروم ({playersList.length}/2)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sfx.click();
                    setTempLobbyName(playerName);
                    setIsEditingLobbyProfile(!isEditingLobbyProfile);
                  }}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 cursor-pointer transition"
                >
                  ✏️ بدل سميتك / الأفاتار هنا
                </button>
                <button
                  onClick={() => {
                    setView('home');
                    setRoomCode('');
                  }}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  خرج من الروم
                </button>
              </div>
            </div>

            {isEditingLobbyProfile && (
              <div className="mb-3 p-3.5 rounded-2xl bg-slate-950/95 border border-indigo-400/50 space-y-2.5">
                <div className="text-xs font-bold text-indigo-300" dir="rtl">
                  ✨ بدل سميتك أو الأفاتار ديالك مباشرة بلا ما تخرج من الروم:
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    dir="auto"
                    maxLength={20}
                    value={tempLobbyName}
                    onChange={(e) => setTempLobbyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateProfileInRoom(tempLobbyName, playerAvatar);
                    }}
                    placeholder="كتب سميتك الجديدة..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-sm font-bold text-white focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => handleUpdateProfileInRoom(tempLobbyName, playerAvatar)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs cursor-pointer transition"
                  >
                    حفظ السمية الجديدة ✓
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => handleUpdateProfileInRoom(tempLobbyName || playerName, av)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer ${
                        playerAvatar === av
                          ? 'bg-indigo-600 border border-white'
                          : 'bg-slate-900 border border-white/10'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playersList.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/15 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/25 border border-indigo-500/40 flex items-center justify-center text-lg font-black text-indigo-300 shrink-0">
                      {p.avatar || p.name?.charAt(0)?.toUpperCase() || '🦁'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white flex items-center gap-1.5 truncate">
                        <span className="truncate">{p.name}</span>
                        {p.id === user?.uid && (
                          <button
                            onClick={() => {
                              setTempLobbyName(playerName);
                              setIsEditingLobbyProfile(true);
                            }}
                            title="بدل سميتك"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 shrink-0 cursor-pointer"
                          >
                            أنت ✏️
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.isHost ? '👑 مول الروم (Host)' : '⚔️ المنافس (Challenger)'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0">
                    واجد
                  </span>
                </div>
              ))}

              {playersList.length < 2 && (
                <div className="p-3.5 rounded-2xl border border-dashed border-white/15 bg-slate-950/30 flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                      <Users className="w-4 h-4 text-slate-500 animate-pulse" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-300">
                        Waiting for Friend to Join...
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Code: <span className="font-mono text-indigo-400 font-bold">{roomCode}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                الباقة المختارة ({sessionData.questions?.length || 8} أسئلة · ⏱️ {activeSettings.roundDurationSec} ثانية · {activeSettings.showPictures ? '📸 بالصور' : '📝 بدون صور'})
              </span>
              <div className="text-sm sm:text-base font-extrabold text-indigo-300" dir="rtl">
                {sessionData.quizTitle}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200">
                ⏱️ {activeSettings.roundDurationSec}s
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200">
                {activeSettings.showPictures ? '📸 الصور: مفعلة' : '🚫 بلا صور'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200">
                {activeSettings.allowPowerUps ? '⚡ المساعدات: مفعلة' : '🚫 بلا مساعدات'}
              </span>
            </div>
          </div>

          {isHost ? (
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div
                className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-3.5"
                dir="rtl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-indigo-300">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <span>⚙️ إعدادات الكويز والماتش (بدلهم كيف بغيتي)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    كتبان مباشرة عند صاحبك
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>⏱️ شحال ديال الوقت لكل سؤال:</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { sec: 8, label: '8 ثواني ⚡' },
                        { sec: 12, label: '12 ثانية' },
                        { sec: 20, label: '20 ثانية' },
                        { sec: 30, label: '30 ثانية 🐢' }
                      ].map((item) => (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() =>
                            handleUpdateQuizSettings({ roundDurationSec: item.sec })
                          }
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                            activeSettings.roundDurationSec === item.sec
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                              : 'bg-slate-950 border-white/10 text-slate-300 hover:border-amber-400/50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>📸 واش بغيتو الكويز بالصور ولا بلاش:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuizSettings({ showPictures: true })}
                        className={`py-1.5 px-3 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                          activeSettings.showPictures
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        📸 بالصور (مفعل)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuizSettings({ showPictures: false })}
                        className={`py-1.5 px-3 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                          !activeSettings.showPictures
                            ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        📝 بلا صور (غير النص)
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
                      <span>🔢 شحال من سؤال فـ الماتش:</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { count: 4, label: '4 أسئلة (سريع)' },
                        { count: 6, label: '6 أسئلة' },
                        { count: 8, label: '8 أسئلة (كامل)' }
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() =>
                            handleUpdateQuizSettings({ questionCount: item.count })
                          }
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                            activeSettings.questionCount === item.count
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                              : 'bg-slate-950 border-white/10 text-slate-300 hover:border-indigo-400/50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>⚡ المساعدات (50/50 و مضاعفة النقاط x2):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuizSettings({ allowPowerUps: true })}
                        className={`py-1.5 px-3 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                          activeSettings.allowPowerUps
                            ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-md'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⚡ مسموح بيهم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuizSettings({ allowPowerUps: false })}
                        className={`py-1.5 px-3 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                          !activeSettings.allowPowerUps
                            ? 'bg-slate-700 text-white border-slate-400 shadow-md'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        🛡️ ممنوعين (لعب حر)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* GEMINI (gemini-3.5-flash-lite) CUSTOM QUIZ GENERATOR BOX */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> 🤖 صاوب كويز بالدارجة والصور بـ Gemini (`gemini-3.5-flash-lite`)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-300">
                      ⚡ gemini-3.5-flash-lite
                    </span>
                    {['Easy', 'Medium', 'Hard'].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setAiDifficulty(diff)}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          aiDifficulty === diff
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-950/70 text-slate-400 hover:text-white'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gemini API Key Input Field */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/90 border border-white/15 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 flex-1">
                    <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type={showApiKeyInput ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="حط الـ Gemini API Key ديالك هنا (AIzaSy...)"
                      className="w-full bg-transparent text-xs font-mono text-emerald-200 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {showApiKeyInput ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> إخفاء
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> إظهار المفتاح
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    dir="auto"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateCustomQuiz();
                    }}
                    placeholder="كتب أي موضوع بغيتي gemini-3.5-flash-lite يصاوب ليك عليه كويز بالدارجة..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={handleGenerateCustomQuiz}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGeneratingAI ? 'كيصاوب الكويز...' : 'صاوب كويز بـ Gemini 3.5 Flash Lite ✨'}
                  </button>
                </div>
              </div>

              {/* GEMINI HANDCRAFTED 11 CREATIVE DARIJA QUIZ PACKS HUB */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-900 to-fuchsia-950/80 border-2 border-indigo-500/50 space-y-3.5 shadow-xl" dir="rtl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black mb-1">
                      ✨ 11 كويز حصري من إبداع Gemini · ترفيه وتحدي بالدارجة
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      🎯 اختار الكويز اللي بغيتي تلعب نتا وصاحبك (أسئلة ذكية وما ساهلاش بزاف!):
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'ALL', label: 'الكل (11)' },
                      { id: '🇲🇦 تراث ومغربيات', label: '🇲🇦 مغربيات (6)' },
                      { id: '🌍 عالم وتحديات', label: '🌍 عالم وتحديات (5)' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          sfx.click();
                          setPackCategoryFilter(tab.id);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                          packCategoryFilter === tab.id
                            ? 'bg-indigo-600 text-white border-indigo-300 shadow-md'
                            : 'bg-slate-950/80 text-slate-300 border-white/10 hover:border-indigo-400/40'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(CURATED_PACKS)
                    .filter(
                      ([, pack]) =>
                        packCategoryFilter === 'ALL' || pack.category === packCategoryFilter
                    )
                    .map(([key, pack], idx) => {
                      const active = sessionData.quizTitle === pack.title;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectPack(key)}
                          className={`p-3.5 rounded-2xl border-2 text-right transition flex items-center justify-between gap-2 cursor-pointer ${
                            active
                              ? 'bg-gradient-to-l from-indigo-600/40 to-fuchsia-600/30 border-amber-400 text-white shadow-lg shadow-indigo-500/20 scale-[1.01]'
                              : 'bg-slate-950/80 border-white/10 text-slate-200 hover:border-indigo-400/60 hover:bg-slate-900'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm truncate">
                              {idx + 1}. {pack.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>📸 {pack.questions.length} أسئلة بالصور</span>
                              <span>·</span>
                              <span className="text-amber-300 font-bold">🔥 تحدي ممتع</span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-xl font-extrabold shrink-0 ${
                              active
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-white/10 text-indigo-200'
                            }`}
                          >
                            {active ? '✓ مختار' : pack.badge}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <button
                onClick={handleStartMatch}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                {playersList.length >= 2
                  ? 'بدا التحدي دابا (Launch 1v1 Match)!'
                  : 'بدا الماتش دابا (أو تسنى صاحبك يدخل)'}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-center text-xs sm:text-sm text-indigo-200 font-semibold">
              ⏳ راك دخلتي للروم! كنتسناو {sessionData.hostName || 'Host'} يطلق الماتش...
            </div>
          )}
        </div>
      )}

      {view === 'game' && sessionData && currentQuestion && (
        <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-center bg-slate-950/85 p-3 rounded-2xl border border-white/10">
            {playersList.slice(0, 2).map((p, idx) => {
              const locked =
                p.answers &&
                p.answers[currentRound] !== undefined &&
                p.answers[currentRound] !== null;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border ${
                    locked ? 'border-emerald-500/40' : 'border-white/5'
                  } ${idx === 1 ? 'sm:col-start-3' : ''}`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          locked ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <span>{p.avatar || '⚡'}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>🔥 {p.streak || 0}</span>
                      {locked && <span className="text-emerald-400 font-bold">جاوب!</span>}
                    </div>
                  </div>
                  <div className="text-lg font-black text-indigo-400 font-mono">
                    {p.score || 0}
                  </div>
                </div>
              );
            })}

            <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 text-center">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                السؤال
              </span>
              <span className="text-base font-black text-white">
                {currentRound + 1} / {sessionData.questions.length}
              </span>
            </div>
          </div>

          {activeSettings.allowPowerUps && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-950/70 border border-white/10" dir="rtl">
              <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-300" /> مساعدات التحدي (مرة فـ الماتش):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={usedFiftyFifty || myAnswerObj !== undefined || roundRevealed}
                  onClick={handleActivateFiftyFifty}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    usedFiftyFifty
                      ? 'bg-slate-900 border-white/10 text-slate-500 line-through'
                      : 'bg-indigo-600/30 hover:bg-indigo-600/50 border-indigo-400 text-indigo-200'
                  }`}
                >
                  ✂️ 50/50 (حيد جوج غالطين)
                </button>
                <button
                  type="button"
                  disabled={usedDoublePoints || myAnswerObj !== undefined || roundRevealed}
                  onClick={handleActivateDoublePoints}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeDoublePoints
                      ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                      : usedDoublePoints
                      ? 'bg-slate-900 border-white/10 text-slate-500 line-through'
                      : 'bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/50 text-amber-200'
                  }`}
                >
                  ⚡ x2 مضاعفة النقاط
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-indigo-300 truncate" dir="rtl">{sessionData.quizTitle}</span>
              <span className="flex items-center gap-1 font-mono text-amber-400">
                <Clock className="w-3.5 h-3.5" /> {(timeLeftMs / 1000).toFixed(1)}s / {activeSettings.roundDurationSec}s
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-75"
                style={{ width: `${(timeLeftMs / ROUND_DURATION) * 100}%` }}
              />
            </div>
          </div>

          {activeSettings.showPictures && (
            <QuestionPictureBanner
              question={currentQuestion}
              roundNumber={currentRound + 1}
            />
          )}

          <div className="py-1" dir="rtl">
            <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-relaxed text-right">
              {currentQuestion.q}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
            {currentQuestion.options.map((optText, idx) => {
              const isHiddenByFifty = hiddenOptions.includes(idx) && !roundRevealed;
              const isMyChoice =
                selectedOption === idx || (myAnswerObj && myAnswerObj.choice === idx);
              const isCorrectOption = idx === currentQuestion.a;

              let btnClass =
                'bg-slate-950/75 border-white/15 hover:border-indigo-500/60 hover:bg-indigo-950/40 text-slate-100';

              if (isHiddenByFifty) {
                btnClass = 'bg-slate-950/20 border-white/5 text-slate-600 opacity-30 pointer-events-none';
              } else if (roundRevealed) {
                if (isCorrectOption) {
                  btnClass =
                    'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-500/15';
                } else if (isMyChoice && !isCorrectOption) {
                  btnClass = 'bg-rose-500/25 border-rose-400 text-rose-100';
                } else {
                  btnClass = 'bg-slate-950/40 border-white/5 text-slate-500 opacity-65';
                }
              } else if (isMyChoice) {
                btnClass =
                  'bg-indigo-600/35 border-indigo-400 text-white shadow-lg shadow-indigo-500/20';
              }

              return (
                <button
                  key={idx}
                  disabled={myAnswerObj !== undefined || roundRevealed || isHiddenByFifty}
                  onClick={() => handleLockAnswer(idx)}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 text-right font-bold text-sm sm:text-base transition flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-extrabold shrink-0">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span className="leading-snug">
                      {isHiddenByFifty ? '— إجابة محذوفة (50/50) —' : optText}
                    </span>
                  </div>
                  {roundRevealed && isCorrectOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {roundRevealed && isMyChoice && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-t-white/10">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-indigo-400" /> صيفط إيموجي لصاحبك:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {EMOJI_TAUNTS.map((em) => (
                <button
                  key={em}
                  onClick={() => handleSendTaunt(em)}
                  className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-indigo-600/30 border border-white/10 flex items-center justify-center text-base hover:scale-110 transition cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            {!roundRevealed ? (
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 text-center text-xs font-semibold text-slate-300" dir="rtl">
                {myAnswerObj
                  ? '⚡ جاوبتي! كنتسناو منافسك يجاوب...'
                  : '⚡ جاوب بالزربة باش تربح حتى لـ 1,000 نقطة + بونيس الستريك!'}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {playersList.map((p) => {
                    const pAns = p.answers?.[currentRound];
                    const pts = pAns?.pts || 0;
                    return (
                      <div
                        key={p.id}
                        className={`px-3 py-1.5 rounded-xl border font-bold ${
                          pts > 0
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        {p.name}: {pts > 0 ? `+${pts} نقطة` : '0 نقطة'}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleNextRound}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer shrink-0"
                >
                  {currentRound + 1 >= sessionData.questions.length
                    ? 'شوف الفائز النهائي 🏆'
                    : 'السؤال الموالي ←'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'results' && sessionData && (
        <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-300 mx-auto">
            <Trophy className="w-12 h-12" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              {playersList[0]?.name} Wins the Match!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Final Standings · {sessionData.quizTitle}
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto text-left">
            {playersList.map((p, idx) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-500/20 to-indigo-600/20 border-amber-400/50'
                    : 'bg-slate-950/70 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm">
                    #{idx + 1}
                  </span>
                  <span className="text-2xl">{p.avatar || '🦁'}</span>
                  <div>
                    <div className="font-extrabold text-white text-sm sm:text-base">
                      {p.name} {idx === 0 && '👑'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Streak: 🔥 {p.streak || 0}
                    </div>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono">
                  {p.score || 0} <span className="text-xs font-normal text-slate-400">pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRematch}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Rematch / Pick New Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user] = useState(() => ({
    uid: 'p1-' + Math.random().toString(36).substring(2, 9)
  }));
  const [authReady] = useState(true);
  const [openRooms, setOpenRooms] = useState([]);
  const [splitScreenMode, setSplitScreenMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState('');

  // Gemini API Key state (supports Vercel VITE_GEMINI_API_KEY or manual input in UI)
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
      }
    } catch (e) {}
    return '';
  });

  const [splitPlayer2User] = useState(() => ({
    uid: 'p2-split-' + Math.random().toString(36).substring(2, 9)
  }));

  useEffect(() => {
    const updateWaitingRooms = (list) => {
      setOpenRooms([...list]);
    };
    roomSubscribers.add(updateWaitingRooms);
    return () => roomSubscribers.delete(updateWaitingRooms);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-900/70 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">
                QuizBlitz Arena
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                v4 · gemini-3.5-flash-lite + Darija Edition
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sfx.click();
                setShowShareModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              🚀 Vercel + Gemini Key Setup
            </button>

            <button
              onClick={() => {
                sfx.click();
                setSplitScreenMode(!splitScreenMode);
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                splitScreenMode
                  ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-lg shadow-fuchsia-600/30'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-white/15 text-slate-200'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden sm:inline">
                {splitScreenMode ? 'Exit Split-Screen' : '2-Player Split-Screen'}
              </span>
            </button>

            <button
              onClick={() => {
                sfx.muted = !muted;
                setMuted(!muted);
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition cursor-pointer"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    🤖 Gemini API Key (`gemini-3.5-flash-lite`) & Vercel
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter your Gemini API key below or configure `VITE_GEMINI_API_KEY` on Vercel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-2.5">
              <label className="text-xs font-extrabold text-emerald-300 flex items-center justify-between">
                <span>🔑 Your Gemini API Key (`AIzaSy...`)</span>
                <span className="text-[11px] font-mono text-emerald-400">Model: gemini-3.5-flash-lite</span>
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                💡 On <strong>Vercel</strong>, you can also add an Environment Variable named <code>VITE_GEMINI_API_KEY</code> with your key so you never have to type it manually!
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200">
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-2">
                <div className="font-extrabold text-indigo-300 flex items-center justify-between">
                  <span>Step 1: Open a Ready React + Tailwind Starter</span>
                  <a
                    href="https://stackblitz.com/fork/vitejs-vite-react"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    Open Vite React Starter ↗
                  </a>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Install <code>lucide-react</code> and ensure Tailwind CDN (<code>https://cdn.tailwindcss.com</code>) is in <code>index.html</code>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-fuchsia-950/50 border border-fuchsia-500/30 space-y-2">
                <div className="font-extrabold text-fuchsia-300">
                  Step 2: Paste This v4 Code into <code>src/App.jsx</code> & Deploy on Vercel
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Copy the code from <code>quizblitz_arena.jsx</code> into <code>src/App.jsx</code>, push to GitHub, and import on <strong>vercel.com/new</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer"
            >
              Save & Back to QuizBlitz v4 Arena
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col justify-center">
        {splitScreenMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold inline-flex items-center gap-2">
                <span>🎮 Player 1 Screen (Host)</span>
              </div>
              <QuizArenaInstance
                user={user}
                authReady={authReady}
                defaultName="أسد الأطلس 🦁"
                isSplitChild={true}
                sharedOpenRooms={openRooms}
                publicShareUrl={publicShareUrl}
                setPublicShareUrl={setPublicShareUrl}
                onOpenShareModal={() => setShowShareModal(true)}
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
              />
            </div>

            <div className="space-y-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold inline-flex items-center gap-2">
                <span>🎮 Player 2 Screen (Challenger)</span>
              </div>
              <QuizArenaInstance
                user={splitPlayer2User}
                authReady={authReady}
                defaultName="صقر المغرب 🦅"
                isSplitChild={true}
                sharedOpenRooms={openRooms}
                publicShareUrl={publicShareUrl}
                setPublicShareUrl={setPublicShareUrl}
                onOpenShareModal={() => setShowShareModal(true)}
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto">
            <QuizArenaInstance
              user={user}
              authReady={authReady}
              defaultName=""
              isSplitChild={false}
              sharedOpenRooms={openRooms}
              publicShareUrl={publicShareUrl}
              setPublicShareUrl={setPublicShareUrl}
              onOpenShareModal={() => setShowShareModal(true)}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
            />
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 py-3 px-4 text-center text-xs text-slate-400">
        QuizBlitz Arena v4 · 🇲🇦 Moroccan Darija Edition · Powered by Gemini (`gemini-3.5-flash-lite`)
      </footer>
    </div>
  );
}
