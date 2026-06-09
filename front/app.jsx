import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Flame, MessageSquare, Car,
  BookOpen, Mic, AlertTriangle, Phone,
  Square, User as UserIcon, LogOut, FileText, Loader2,
  Wifi, Globe, ChevronRight, Info, GraduationCap,
  Zap, Camera, CheckCircle, Play, X, ThumbsUp
} from 'lucide-react';


import Landing from './src/components/Landing';
import Auth from './src/components/Auth';

// ── API base URL ─────────────────────────────────────────────────────
// Dev  → http://localhost:8000  (uvicorn --reload)
// Prod → https://hearless-backend.onrender.com  (update when deployed)
const API = (() => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  // ⬇️  Change this to your actual Render/Railway backend URL before deploying
  return 'https://hearless15.onrender.com';
})();


// ——————————————————————————————————————————————
// Constants & helpers
// ——————————————————————————————————————————————
const SUBTITLE_LANG_OPTIONS = [
  { code: 'ru-RU', label: 'Русский' },
  { code: 'en-US', label: 'English' },
  { code: 'kk-KZ', label: 'Қазақша' },
];

// ——————————————————————————————————————————————
// Fisher-Yates shuffle
// ——————————————————————————————————————————————
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ——————————————————————————————————————————————
// Sign Language Data
// ——————————————————————————————————————————————
const SIGN_DATA = [
  // --- Alphabet (A–Я) ---
  { id: 1, category: 'alphabet', label: 'А', icon: '🅰️', sub: 'Дактиль', desc: 'Кулак, большой палец сбоку.', video: '', hand: [2,0,0,0,0] },
  { id: 2, category: 'alphabet', label: 'Б', icon: '🅱️', sub: 'Дактиль', desc: 'Ладонь раскрыта, большой палец прижат.', video: '', hand: [1,1,1,1,1] },
  { id: 3, category: 'alphabet', label: 'В', icon: '✌️', sub: 'Дактиль', desc: 'Указательный и средний пальцы вверх, остальные в кулак.', video: '', hand: [0,1,1,0,0] },
  { id: 4, category: 'alphabet', label: 'Г', icon: '🇬', sub: 'Дактиль', desc: 'Указательный палец вверх, остальные в кулак.', video: '', hand: [0,1,0,0,0] },
  { id: 5, category: 'alphabet', label: 'Д', icon: '🇩', sub: 'Дактиль', desc: 'Три пальца вверх: указательный, средний и безымянный.', video: '', hand: [0,1,1,1,0] },
  { id: 6, category: 'alphabet', label: 'Е', icon: '🇪', sub: 'Дактиль', desc: 'Пальцы сжаты, большой палец касается указательного.', video: '', hand: [3,3,0,0,0] },
  { id: 7, category: 'alphabet', label: 'Ё', icon: '🇪', sub: 'Дактиль', desc: 'Пальцы сжаты, большой у указательного, с движением в сторону.', video: '', hand: [3,3,0,0,0] },
  { id: 8, category: 'alphabet', label: 'Ж', icon: '🆖', sub: 'Дактиль', desc: 'Средний и безымянный скрещены, остальные в кулак.', video: '', hand: [0,0,4,4,0] },
  { id: 9, category: 'alphabet', label: 'З', icon: '🇿', sub: 'Дактиль', desc: 'Указательный палец рисует зигзаг.', video: '', hand: [0,1,0,0,0] },
  { id: 10, category: 'alphabet', label: 'И', icon: '🇮', sub: 'Дактиль', desc: 'Мизинец вверх, остальные в кулак.', video: '', hand: [0,0,0,0,1] },
  { id: 11, category: 'alphabet', label: 'К', icon: '🇰', sub: 'Дактиль', desc: 'Указательный и большой вверх, остальные в кулак.', video: '', hand: [1,1,0,0,0] },
  { id: 12, category: 'alphabet', label: 'Л', icon: '🇱', sub: 'Дактиль', desc: 'Ладонь раскрыта (буква L в дактиле).', video: '', hand: [2,1,1,1,1] },
  { id: 13, category: 'alphabet', label: 'М', icon: '🇲', sub: 'Дактиль', desc: 'Большой палец прижат к мизинцу, остальные накрывают.', video: '', hand: [3,0,0,0,3] },
  { id: 14, category: 'alphabet', label: 'Н', icon: '🇳', sub: 'Дактиль', desc: 'Указательный и средний вниз, остальные в кулак.', video: '', hand: [0,1,1,0,0] },
  { id: 15, category: 'alphabet', label: 'О', icon: '🅾️', sub: 'Дактиль', desc: 'Все пальцы в кольцо с большим (жест "ок").', video: '', hand: [3,3,3,3,3] },
  { id: 16, category: 'alphabet', label: 'П', icon: '🇵', sub: 'Дактиль', desc: 'Ладонь раскрыта, пальцы вместе, направлена вперёд.', video: '', hand: [1,1,1,1,1] },
  { id: 17, category: 'alphabet', label: 'Р', icon: '🇷', sub: 'Дактиль', desc: 'Указательный и средний скрещены, остальные в кулак.', video: '', hand: [0,4,4,0,0] },
  { id: 18, category: 'alphabet', label: 'С', icon: '🇨', sub: 'Дактиль', desc: 'Большой палец прикрывает сжатые пальцы сверху.', video: '', hand: [1,0,0,0,0] },
  { id: 19, category: 'alphabet', label: 'Т', icon: '🇹', sub: 'Дактиль', desc: 'Кулак, большой палец зажат внутри.', video: '', hand: [0,0,0,0,0] },
  { id: 20, category: 'alphabet', label: 'У', icon: '🇺', sub: 'Дактиль', desc: 'Указательный и мизинец вверх, остальные в кулак ("коза").', video: '', hand: [0,1,0,0,1] },
  { id: 21, category: 'alphabet', label: 'Ф', icon: '🇫', sub: 'Дактиль', desc: 'Большой палец упирается в указательный (кольцо), остальные раскрыты.', video: '', hand: [3,3,1,1,1] },
  { id: 22, category: 'alphabet', label: 'Х', icon: '🇭', sub: 'Дактиль', desc: 'Указательный и средний параллельно, ладонь вбок.', video: '', hand: [0,1,1,0,0] },
  { id: 23, category: 'alphabet', label: 'Ц', icon: '🇨', sub: 'Дактиль', desc: 'Указательный, средний, безымянный вверх, мизинец отведён.', video: '', hand: [0,1,1,1,2] },
  { id: 24, category: 'alphabet', label: 'Ч', icon: '4️⃣', sub: 'Дактиль', desc: 'Указательный и большой в кольцо, остальные вытянуты.', video: '', hand: [3,3,1,1,1] },
  { id: 25, category: 'alphabet', label: 'Ш', icon: '🇸', sub: 'Дактиль', desc: 'Четыре пальца вверх, большой прижат к ладони.', video: '', hand: [0,1,1,1,1] },
  { id: 26, category: 'alphabet', label: 'Щ', icon: '🇸', sub: 'Дактиль', desc: 'Четыре пальца вверх, большой отставлен.', video: '', hand: [2,1,1,1,1] },
  { id: 27, category: 'alphabet', label: 'Ъ', icon: '🇷', sub: 'Дактиль', desc: 'Сжатый кулак с резким движением вправо.', video: '', hand: [0,0,0,0,0] },
  { id: 28, category: 'alphabet', label: 'Ы', icon: '🇾', sub: 'Дактиль', desc: 'Указательный и мизинец вверх, большой поднят.', video: '', hand: [1,1,0,0,1] },
  { id: 29, category: 'alphabet', label: 'Ь', icon: '🇷', sub: 'Дактиль', desc: 'Кулак с мягким движением вниз.', video: '', hand: [0,0,0,0,0] },
  { id: 30, category: 'alphabet', label: 'Э', icon: '🇪', sub: 'Дактиль', desc: 'Указательный и средний скрещены, ладонь раскрыта.', video: '', hand: [1,4,4,1,1] },
  { id: 31, category: 'alphabet', label: 'Ю', icon: '🇺', sub: 'Дактиль', desc: 'Указательный и большой в кольцо, остальные вверх.', video: '', hand: [3,3,1,1,1] },
  { id: 32, category: 'alphabet', label: 'Я', icon: '🇾', sub: 'Дактиль', desc: 'Мизинец вперёд, остальные в кулак.', video: '', hand: [0,0,0,0,1] },

  // --- Numbers ---
  { id: 33, category: 'numbers', label: 'Один', icon: '1️⃣', sub: 'Цифры', desc: 'Указательный палец вверх, остальные в кулак.', video: '' },
  { id: 34, category: 'numbers', label: 'Два', icon: '2️⃣', sub: 'Цифры', desc: 'Указательный и средний вверх, остальные в кулак.', video: '' },
  { id: 35, category: 'numbers', label: 'Три', icon: '3️⃣', sub: 'Цифры', desc: 'Указательный, средний и безымянный вверх.', video: '' },
  { id: 36, category: 'numbers', label: 'Четыре', icon: '4️⃣', sub: 'Цифры', desc: 'Четыре пальца вверх, большой прижат к ладони.', video: '' },
  { id: 37, category: 'numbers', label: 'Пять', icon: '5️⃣', sub: 'Цифры', desc: 'Ладонь полностью раскрыта.', video: '' },
  { id: 38, category: 'numbers', label: 'Шесть', icon: '6️⃣', sub: 'Цифры', desc: 'Большой и мизинец соединены, остальные согнуты.', video: '' },
  { id: 39, category: 'numbers', label: 'Семь', icon: '7️⃣', sub: 'Цифры', desc: 'Большой, указательный и средний вверх (как птичка).', video: '' },
  { id: 40, category: 'numbers', label: 'Восемь', icon: '8️⃣', sub: 'Цифры', desc: 'Большой и указательный в кольцо, остальные раскрыты.', video: '' },
  { id: 41, category: 'numbers', label: 'Девять', icon: '9️⃣', sub: 'Цифры', desc: 'Большой палец согнут, остальные в кулак.', video: '' },
  { id: 42, category: 'numbers', label: 'Десять', icon: '🔟', sub: 'Цифры', desc: 'Кулак, затем раскрытая ладонь (два движения).', video: '' },

  // --- Greetings ---
  { id: 43, category: 'greetings', label: 'Привет', icon: '👋', sub: 'Приветствие', desc: 'Легкое покачивание раскрытой ладонью.', video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: 44, category: 'greetings', label: 'До свидания', icon: '🖐️', sub: 'Приветствие', desc: 'Покачивание ладонью с разведёнными пальцами.', video: '' },
  { id: 45, category: 'greetings', label: 'Спасибо', icon: '🙏', sub: 'Этикет', desc: 'Касание подбородка кончиками пальцев и движение вперёд.', video: '' },
  { id: 46, category: 'greetings', label: 'Пожалуйста', icon: '🤲', sub: 'Этикет', desc: 'Круговое движение раскрытой ладонью по груди.', video: '' },
  { id: 47, category: 'greetings', label: 'Извините', icon: '😔', sub: 'Этикет', desc: 'Кулак трёт грудь круговыми движениями.', video: '' },
  { id: 48, category: 'greetings', label: 'Как дела?', icon: '🤷', sub: 'Вопросы', desc: 'Обе ладони раскрыты, движение от груди.', video: '' },
  { id: 49, category: 'greetings', label: 'Хорошо', icon: '👍', sub: 'Ответы', desc: 'Большой палец вверх, остальные в кулак.', video: '' },
  { id: 50, category: 'greetings', label: 'Плохо', icon: '👎', sub: 'Ответы', desc: 'Большой палец вниз, остальные в кулак.', video: '' },

  // --- Emergency ---
  { id: 51, category: 'emergency', label: 'Помощь', icon: '🆘', sub: 'Важное', desc: 'Одна рука сжата в кулак, другая ложится сверху.', video: '' },
  { id: 52, category: 'emergency', label: 'Опасно', icon: '⚠️', sub: 'Важное', desc: 'Резкое движение рукой вниз с напряжённым выражением.', video: '' },
  { id: 53, category: 'emergency', label: 'Пожар', icon: '🔥', sub: 'Важное', desc: 'Движение кистью вверх-вниз перед собой (имитация пламени).', video: '' },
  { id: 54, category: 'emergency', label: 'Врач', icon: '🏥', sub: 'Важное', desc: 'Указательный палец рисует крест на лбу.', video: '' },
  { id: 55, category: 'emergency', label: 'Полиция', icon: '👮', sub: 'Важное', desc: 'Жест "пистолета" (указательный и большой вверх).', video: '' },
  { id: 56, category: 'emergency', label: 'Вызов', icon: '📞', sub: 'Важное', desc: 'Жест "телефон" у уха или щеки.', video: '' },

  // --- Common / Phrases ---
  { id: 57, category: 'common', label: 'Я тебя люблю', icon: '🤟', sub: 'Фраза', desc: 'Мизинец, указательный и большой пальцы вытянуты.', video: '' },
  { id: 58, category: 'common', label: 'Дом', icon: '🏠', sub: 'Предмет', desc: 'Сложенные домиком ладони перед собой.', video: '' },
  { id: 59, category: 'common', label: 'Семья', icon: '👨‍👩‍👧', sub: 'Люди', desc: 'Очерчивание круга двумя руками от груди.', video: '' },
  { id: 60, category: 'common', label: 'Мир', icon: '☮️', sub: 'Слово', desc: 'Движение ладонями в разные стороны от центра.', video: '' },
  { id: 61, category: 'common', label: 'Вода', icon: '💧', sub: 'Предмет', desc: 'Рука сложена "ковшиком" у губ, движение вниз.', video: '' },
  { id: 62, category: 'common', label: 'Еда', icon: '🍽️', sub: 'Предмет', desc: 'Сложенная "щепотью" рука подносится ко рту.', video: '' },
  { id: 63, category: 'common', label: 'Друг', icon: '🤝', sub: 'Люди', desc: 'Обе руки сжимаются в рукопожатие перед собой.', video: '' },
  { id: 64, category: 'common', label: 'Учиться', icon: '📚', sub: 'Действие', desc: 'Раскрытая ладонь движется к голове.', video: '' },
  { id: 65, category: 'common', label: 'Слышать', icon: '👂', sub: 'Действие', desc: 'Указательный палец касается уха.', video: '' },
  { id: 66, category: 'common', label: 'Говорить', icon: '🗣️', sub: 'Действие', desc: 'Движение пальцами от губ вперёд.', video: '' },
  { id: 67, category: 'common', label: 'Понимать', icon: '💡', sub: 'Действие', desc: 'Указательный палец касается виска.', video: '' },
  { id: 68, category: 'common', label: 'Ждать', icon: '⏳', sub: 'Действие', desc: 'Рука вытянута вперёд, пальцы перебирают.', video: '' },
  { id: 69, category: 'common', label: 'Идти', icon: '🚶', sub: 'Действие', desc: 'Указательный и средний "шагают" по ладони.', video: '' },
  { id: 70, category: 'common', label: 'Стоп', icon: '🛑', sub: 'Действие', desc: 'Ладонь раскрыта, направлена вперёд.', video: '' },
  { id: 71, category: 'common', label: 'Красивый', icon: '✨', sub: 'Качество', desc: 'Движение пальцами перед лицом (веер).', video: '' },
  { id: 72, category: 'common', label: 'Большой', icon: '📏', sub: 'Качество', desc: 'Руки разводятся в стороны от груди.', video: '' },

  // --- Colors ---
  { id: 73, category: 'colors', label: 'Красный', icon: '🔴', sub: 'Цвет', desc: 'Круговое движение пальца у губ (как помада).', video: '' },
  { id: 74, category: 'colors', label: 'Синий', icon: '🔵', sub: 'Цвет', desc: 'Ладонь сжата, движение вниз от подбородка.', video: '' },
  { id: 75, category: 'colors', label: 'Зелёный', icon: '🟢', sub: 'Цвет', desc: 'Сжатая кисть, движение от груди вперёд.', video: '' },
  { id: 76, category: 'colors', label: 'Жёлтый', icon: '🟡', sub: 'Цвет', desc: 'Указательный палец крутит у виска.', video: '' },
  { id: 77, category: 'colors', label: 'Белый', icon: '⚪', sub: 'Цвет', desc: 'Ладонь от груди вниз, пальцы вместе.', video: '' },
  { id: 78, category: 'colors', label: 'Чёрный', icon: '⚫', sub: 'Цвет', desc: 'Указательный палец проводит по брови.', video: '' },
];

// ——————————————————————————————————————————————
// Hand Visual — SVG diagram of dactyl hand shapes
// fingers = [thumb, index, middle, ring, pinky]
//   0 = closed (fist), 1 = extended up, 2 = side, 3 = touching thumb, 4 = crossed
// ——————————————————————————————————————————————
function HandVisual({ fingers, size = 100 }) {
  if (!fingers) return null;
  const [t, i, m, r, p] = fingers;
  const skin = '#f5d0b0', stroke = '#d4a574';

  const getF = (state, cx, baseY, w, h, sideA = 0) => {
    if (state === 0) return null;
    const rotCx = state === 3 ? cx - 2 : state === 4 ? cx + 3 : cx;
    const rot = state === 1 ? 0 : state === 2 ? sideA || -35 : state === 3 ? -16 : 10;
    const hMul = state === 2 ? 0.65 : state === 3 ? 0.45 : 1;
    const xOff = state === 3 ? -2 : state === 4 ? 3 : 0;
    return { x: cx - w/2 + xOff, y: baseY - h * hMul, w, h: h * hMul, rot, cx: rotCx, cy: baseY };
  };

  const fd = [
    getF(t, 20, 86, 10, 32, -40),
    getF(i, 33, 76, 8, 40),
    getF(m, 43, 74, 8, 46),
    getF(r, 53, 76, 8, 38),
    getF(p, 62, 80, 7, 28, 25),
  ].filter(Boolean);

  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 80 110" style={{ display: 'block' }}>
      <rect x="31" y="96" width="18" height="14" rx="4" fill={skin} stroke={stroke} strokeWidth="0.8" />
      <rect x="26" y="76" width="28" height="22" rx="7" fill={skin} stroke={stroke} strokeWidth="0.8" />
      {fd.map((f, idx) => (
        <rect key={idx} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.w / 2}
          fill={skin} stroke={stroke} strokeWidth="0.8"
          transform={f.rot ? `rotate(${f.rot}, ${f.cx}, ${f.cy})` : undefined} />
      ))}
    </svg>
  );
}


const alertIcons = {
  emergency: <Flame size={20} color="#ff4d4d" />,
  warning: <Car size={20} color="#ffaa00" />,
  info: <Bell size={20} color="#4d94ff" />,
  danger: <AlertTriangle size={20} color="#ff4d4d" />,
};

// Is SpeechRecognition available in this browser?
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

// ——————————————————————————————————————————————
// App
// ——————————————————————————————————————————————
function App() {

  // === Auth ===
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('hearless_user') || null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [appState, setAppState] = useState(localStorage.getItem('hearless_user') ? 'dashboard' : 'landing');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Load avatar if user is already in localStorage
  useEffect(() => {
    if (currentUser) {
      fetch(`${API}/api/user/${currentUser}`)
        .then(r => r.json())
        .then(d => setUserAvatar(d.avatar))
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    setSrAvailable(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // === Navigation ===
  const [activeTab, setActiveTab] = useState('dashboard');

  // === Subtitles (Browser STT) ===
  const [isListening, setIsListening] = useState(false);
  const [srAvailable, setSrAvailable] = useState(true);
  const [srLang, setSrLang] = useState('ru-RU');
  const [subtitles, setSubtitles] = useState([
    { id: 0, text: "Система готова. Нажмите «Слушать» для старта.", timestamp: '—', isFinal: true }
  ]);
  const [interimText, setInterimText] = useState('');  // live typing text
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEntries, setSessionEntries] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // === Alerts ===
  const [alerts, setAlerts] = useState([]);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [sosContact, setSosContact] = useState('');

  // === Study / PDF ===
  const [isRecordingLecture, setIsRecordingLecture] = useState(false);
  const [lectureNotes, setLectureNotes] = useState('');
  const [lectureSubtitles, setLectureSubtitles] = useState([]);
  const [lectureLang, setLectureLang] = useState('ru-RU');
  const lectureLangRef = useRef('ru-RU');
  useEffect(() => { lectureLangRef.current = lectureLang; }, [lectureLang]);
  const [lectureDuration, setLectureDuration] = useState(0);
  const lectureDurationTimer = useRef(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [pdfNotes, setPdfNotes] = useState('');
  const [pdfSummary, setPdfSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [lectureSummary, setLectureSummary] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [academyCategory, setAcademyCategory] = useState('all');
  const [academySearch, setAcademySearch] = useState('');
  const [signProgress, setSignProgress] = useState({});
  const [signStats, setSignStats] = useState(null);
  
  // Load sign progress from backend
  useEffect(() => {
    if (!currentUser) return;
    fetch(`${API}/api/signs/progress/${currentUser}`)
      .then(r => r.json())
      .then(d => {
        if (d.progress) {
          const map = {};
          d.progress.forEach(p => { map[p.sign_id] = p; });
          setSignProgress(map);
        }
      })
      .catch(() => {});
    fetch(`${API}/api/signs/stats/${currentUser}`)
      .then(r => r.json())
      .then(d => setSignStats(d))
      .catch(() => {});
  }, [currentUser]);

  // === Diagnostics ===
  const [diagResult, setDiagResult] = useState(null);
  const [isDiagLoading, setIsDiagLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsDiagLoading(true);
    setDiagResult(null);
    try {
      const [rootRes, diagRes] = await Promise.all([
        fetch(`${API}/`).then(r => r.json()).catch(() => ({ status: 'error', message: 'Backend недоступен' })),
        fetch(`${API}/api/diagnose`).then(r => r.json()).catch(() => ({ status: 'error', message: 'Backend недоступен' })),
      ]);
      setDiagResult({ root: rootRes, diagnose: diagRes });
    } catch (err) {
      setDiagResult({ error: err.message });
    } finally {
      setIsDiagLoading(false);
    }
  };

  // === Academy Quiz ===
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isLearningMode, setIsLearningMode] = useState(false);
  const [currentSign, setCurrentSign] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currQIdx, setCurrQIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null); // null, true, false


  // === Camera / MediaPipe ===
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    if (!showCamera) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        cameraStreamRef.current = stream;
        const video = document.getElementById('sign-camera');
        if (video) video.srcObject = stream;

        // Load MediaPipe Hands from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js';
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });

        const hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

        const canvas = document.getElementById('sign-canvas');
        const ctx = canvas?.getContext('2d');

        hands.onResults((results) => {
          if (!ctx || !canvas || cancelled) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
              drawHand(ctx, landmarks, canvas.width, canvas.height);
            }
          }
        });

        const sendToHands = async () => {
          if (!cancelled && video && video.readyState >= 2) {
            await hands.send({ image: video });
            requestAnimationFrame(sendToHands);
          }
        };
        requestAnimationFrame(sendToHands);
      } catch (err) {
        console.error('[Camera] Error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [showCamera]);

  function drawHand(ctx, landmarks, w, h) {
    const connections = [
      [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20], [0,17]
    ];
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    for (const [i,j] of connections) {
      ctx.beginPath();
      ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
      ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
      ctx.stroke();
    }
    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }
  }

  // ── Refs ──
  const subtitlesEndRef = useRef(null);
  const isListeningRef = useRef(false);
  const isRecordingRef = useRef(false);
  const lectureNotesRef = useRef('');

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isRecordingRef.current = isRecordingLecture; }, [isRecordingLecture]);
  useEffect(() => { lectureNotesRef.current = lectureNotes; }, [lectureNotes]);

  const sessionIdRef = useRef(null);
  const pendingSubtitlesRef = useRef([]);

  useEffect(() => { subtitlesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [subtitles, interimText]);

  useEffect(() => {
    if (!currentUser) return;
    const s = localStorage.getItem(`sos_${currentUser}`);
    if (s) setSosContact(s);
    fetch(`${API}/api/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => { });
  }, [currentUser]);

  useEffect(() => () => { stopDashSTT(); stopLectureRecog(); }, []);

  // ——————————————————————————————————————————————
  // Auth
  // ——————————————————————————————————————————————
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    setIsAuthLoading(true);
    try {
      const ep = appState === 'login' ? `${API}/api/login` : `${API}/api/register`;
      const res = await fetch(ep, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.detail || 'Ошибка'); setIsAuthLoading(false); return; }
      
      const loggedInUser = appState === 'register' ? authUsername : data.username;
      setCurrentUser(loggedInUser);
      localStorage.setItem('hearless_user', loggedInUser);
      fetch(`${API}/api/user/${loggedInUser}`).then(r => r.json()).then(d => setUserAvatar(d.avatar)).catch(() => { });
      setIsAuthLoading(false);
      setAppState('dashboard');
    } catch { setAuthError('Нет связи с сервером. Попробуйте обновить страницу.'); setIsAuthLoading(false); }
  };

  const handleLogout = () => {
    stopDashSTT();
    stopLectureRecog();
    setCurrentUser(null); 
    localStorage.removeItem('hearless_user');
    setAppState('landing');
    setAuthUsername('');
    setAuthPassword('');
    setIsListening(false); setIsRecordingLecture(false); setLectureNotes('');
  };

  // ——————————————————————————————————————————————
  // Dashboard STT — Browser SpeechRecognition
  // ——————————————————————————————————————————————
  const srLangRef = useRef(srLang);
  useEffect(() => { srLangRef.current = srLang; }, [srLang]);
  const dashRecogRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const stopDashSTT = useCallback(() => {
    if (dashRecogRef.current) {
      try { dashRecogRef.current.abort(); } catch {}
      dashRecogRef.current = null;
    }
    setInterimText('');
    const sid = sessionIdRef.current;
    const entries = pendingSubtitlesRef.current;
    if (sid && entries.length > 0 && currentUser) {
      fetch(`${API}/api/subtitles/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, session_id: sid, entries })
      }).catch(() => {});
      pendingSubtitlesRef.current = [];
    }
  }, [currentUser]);

  const startDashSTT = useCallback(() => {
    stopDashSTT();
    sessionIdRef.current = crypto.randomUUID();
    pendingSubtitlesRef.current = [];
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSrAvailable(false);
      addSystemSubtitle('⚠ Браузер не поддерживает распознавание речи');
      return;
    }
    const recog = new Recognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = srLangRef.current;
    dashRecogRef.current = recog;

    recog.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) continue;
          const now = Date.now();
          setSubtitles(prev => {
            const last = prev[prev.length - 1];
            if (last && !last.isSystem && (now - last.id < 6000)) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, text: last.text + ' ' + text, id: now };
              return updated;
            }
            return [...prev, { id: now, text, timestamp: new Date().toLocaleTimeString(), isFinal: true }].slice(-30);
          });
          pendingSubtitlesRef.current.push(text);
          checkDanger(text);
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recog.onend = () => {
      if (isListeningRef.current && dashRecogRef.current) {
        try { dashRecogRef.current.start(); } catch {}
      }
    };

    recog.onerror = (event) => {
      console.error('[STT] onerror:', event.error);
      if (event.error === 'not-allowed') {
        addSystemSubtitle('⛔ Микрофон заблокирован. Разрешите доступ в настройках браузера.');
        setIsListening(false);
      } else if (event.error === 'language-not-supported') {
        addSystemSubtitle('⚠ Язык не поддерживается распознаванием речи в этом браузере.');
        setIsListening(false);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        addSystemSubtitle(`⚠ Ошибка STT: ${event.error}`);
      }
    };

    try { recog.start(); } catch (err) {
      console.error('[STT] Error:', err);
      addSystemSubtitle('⛔ Ошибка запуска распознавания речи');
    }
    addSystemSubtitle('🟢 Субтитры запущены');
  }, []);

  // ——————————————————————————————————————————————
  // Whisper STT — AI fallback (replaces ElevenLabs)
  // ——————————————————————————————————————————————
  const startWhisperSTT = async () => {
    if (isTranscribing) return;
    setIsTranscribing(true);
    addSystemSubtitle('🎤 Запись для AI транскрибации...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType });
        const fd = new FormData();
        fd.append('file', blob, `recording.${mr.mimeType.includes('mp4') ? 'mp4' : 'webm'}`);

        try {
          addSystemSubtitle('⏳ AI обрабатывает речь...');
          const res = await fetch(`${API}/api/transcribe`, { method: 'POST', body: fd });
          const data = await res.json();
          if (data.text) {
            const now = Date.now();
            setSubtitles(prev => [...prev, { id: now, text: data.text, timestamp: new Date().toLocaleTimeString(), isFinal: true }].slice(-30));
            checkDanger(data.text);
          } else {
            addSystemSubtitle('⚠ AI не распознал речь');
          }
        } catch (err) {
          addSystemSubtitle('⛔ Ошибка AI транскрибации. Убедитесь, что OPENAI_API_KEY настроен.');
          console.error('[Whisper] Error:', err);
        }
        setIsTranscribing(false);
      };

      mr.start(5000);
      setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); }, 7000);
    } catch (err) {
      addSystemSubtitle('⛔ Нет доступа к микрофону для AI транскрибации');
      setIsTranscribing(false);
    }
  };

  const changeLang = (lang) => {
    setSrLang(lang);
    addSystemSubtitle(`Язык: ${lang === 'ru-RU' ? 'Русский' : lang === 'kk-KZ' ? 'Қазақша' : 'English'}`);
  };

  // Start/stop listening
  useEffect(() => {
    if (isListening) {
      stopDashSTT();
      startDashSTT();
    } else {
      stopDashSTT();
    }
  }, [isListening, srLang, startDashSTT, stopDashSTT]);

  // ——————————————————————————————————————————————
  // Helpers
  // ——————————————————————————————————————————————
  const addSystemSubtitle = (text) => {
    setSubtitles(prev => [...prev, {
      id: Date.now(), text, timestamp: new Date().toLocaleTimeString(), isFinal: true, isSystem: true
    }]);
  };

  // Subtitles history
  const loadHistory = async () => {
    if (!currentUser) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API}/api/subtitles/sessions?username=${currentUser}`);
      const data = await res.json();
      setHistorySessions(data.sessions || []);
      setShowHistory(true);
      setSelectedSession(null);
      setSessionEntries([]);
    } catch {} finally { setIsLoadingHistory(false); }
  };

  const loadSession = async (sessionId) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API}/api/subtitles/session/${sessionId}`);
      const data = await res.json();
      setSelectedSession(sessionId);
      setSessionEntries(data.entries || []);
    } catch {} finally { setIsLoadingHistory(false); }
  };

  const closeHistory = () => {
    setShowHistory(false);
    setSelectedSession(null);
    setSessionEntries([]);
  };

  // Danger detection — calls backend (AI) in background
  const dangerCooldown = useRef({});
  const checkDanger = async (text) => {
    // Bilingual trigger words
    const triggerWords = [
      'сирена', 'пожар', 'помогите', 'взрыв', 'выстрел', 'тревога',
      'siren', 'fire', 'help', 'explosion', 'shot', 'alarm', 'danger', 'emergency'
    ];
    if (!triggerWords.some(w => text.toLowerCase().includes(w))) return;

    // Local debounce: same word once per 15 sec
    const now = Date.now();
    for (const w of triggerWords) {
      if (text.toLowerCase().includes(w)) {
        if (now - (dangerCooldown.current[w] || 0) < 15000) return;
        dangerCooldown.current[w] = now;
      }
    }

    try {
      const res = await fetch(`${API}/api/detect-danger`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.is_dangerous) {
        const alert = data.alert || { id: Date.now(), type: 'emergency', title: 'Опасность!', desc: text, time: 'Только что' };
        setAlerts(prev => [alert, ...prev]);
        if (navigator.vibrate) navigator.vibrate([400, 150, 400]);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Hearless: Опасность!', { body: text });
        }
      }
    } catch { /* silent — danger detection shouldn't crash the app */ }
  };

  // ——————————————————————————————————————————————
  // SOS
  // ——————————————————————————————————————————————
  const handleSOS = () => {
    setSosActive(true); setSosCountdown(3);
    let lat = null, lng = null;
    let cnt = 3;

    const sendSOS = (la, lo) => {
      fetch(`${API}/api/sos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: la, longitude: lo, user_id: currentUser })
      }).catch(() => { });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { lat = pos.coords.latitude; lng = pos.coords.longitude; sendSOS(lat, lng); },
        () => sendSOS(null, null)
      );
    } else sendSOS(null, null);

    const iv = setInterval(() => {
      cnt -= 1; setSosCountdown(cnt);
      if (cnt <= 0) {
        clearInterval(iv);
        setTimeout(() => setSosActive(false), 2500);
        if (sosContact) {
          const phone = sosContact.replace(/\D/g, '');
          const msg = `СРОЧНО! Мне нужна помощь! SOS от Hearless.${lat ? ` Локация: https://maps.google.com?q=${lat},${lng}` : ''}`;
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    }, 1000);
  };

  // ——————————————————————————————————————————————
  // Study / Lecture — Browser SpeechRecognition
  // ——————————————————————————————————————————————
  const lectureRecogRef = useRef(null);

  const stopLectureRecog = useCallback(() => {
    if (lectureRecogRef.current) {
      try { lectureRecogRef.current.abort(); } catch { }
      lectureRecogRef.current = null;
    }
  }, []);

  const startLectureRecog = useCallback(() => {
    stopLectureRecog();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recog = new Recognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = lectureLangRef.current;
    lectureRecogRef.current = recog;
    recog.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (!text) continue;
          const now = Date.now();
          setLectureSubtitles(prev => [...prev.slice(-20), { id: now, text }]);
          setLectureNotes(old => old + text + ' ');
        }
      }
    };
    recog.onend = () => {
      if (isRecordingRef.current && lectureRecogRef.current) {
        try { lectureRecogRef.current.start(); } catch { }
      }
    };
    recog.onerror = (event) => {
      console.error('[Lecture] STT error:', event.error);
    };
    try { recog.start(); } catch (err) { console.error('[Lecture] STT error:', err); }
  }, [stopLectureRecog]);

  const toggleLecture = () => {
    if (!isRecordingLecture) {
      setIsRecordingLecture(true);
      setLectureNotes('');
      setLectureSubtitles([]);
      setLectureDuration(0);
      startLectureRecog();
      lectureDurationTimer.current = setInterval(() => setLectureDuration(d => d + 1), 1000);
    } else {
      setIsRecordingLecture(false);
      stopLectureRecog();
      if (lectureDurationTimer.current) { clearInterval(lectureDurationTimer.current); lectureDurationTimer.current = null; }
      const notes = lectureNotesRef.current;
      if (notes.trim()) {
        fetch(`${API}/api/lectures`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Лекция ${new Date().toLocaleString()}`, notes, summary: '' })
        }).catch(() => { });
      }
    }
  };

  const generatePdfNotes = async () => {
    if (!pdfFile) return;
    setIsProcessingPdf(true);
    setPdfProgress('📄 Отправляем PDF на сервер…');
    setPdfNotes(''); setPdfSummary('');
    const fd = new FormData();
    fd.append('file', pdfFile);
    try {
      const res = await fetch(`${API}/api/pdf-notes`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка сервера');
      setPdfNotes(data.notes || ''); setPdfSummary(data.summary || '');
      setPdfProgress('');
    } catch (err) {
      setPdfProgress(`❌ ${err.message}`);
    } finally { setIsProcessingPdf(false); }
  };

  const handleSummarize = async () => {
    if (!lectureNotes.trim()) return;
    setIsSummarizing(true);
    try {
      const res = await fetch(`${API}/api/summarize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lectureNotes })
      });
      const data = await res.json();
      setLectureSummary(data.summary || '');
    } catch { } finally { setIsSummarizing(false); }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    const sourceText = lectureNotes.trim() || pdfNotes.trim();
    if (!chatMessage.trim() || !sourceText) return;
    setIsChatting(true);
    setChatResponse('Думаю...');
    try {
      const res = await fetch(`${API}/api/chat-lecture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, message: chatMessage })
      });
      const data = await res.json();
      setChatResponse(data.response || '');
    } catch { setChatResponse('Ошибка связи с ИИ.'); } finally { setIsChatting(false); }
  };

  // ——————————————————————————————————————————————
  // Sign Quiz Logic
  // ——————————————————————————————————————————————
  const startQuiz = (filterCategory) => {
    let pool = SIGN_DATA;
    if (filterCategory && filterCategory !== 'all') {
      pool = SIGN_DATA.filter(s => s.category === filterCategory);
    }
    // Spaced repetition: weight unlearned / low-accuracy signs higher
    const weighted = pool.map(s => {
      const prog = signProgress[s.id];
      if (!prog) return { sign: s, weight: 5 };        // never practiced → high weight
      if (!prog.learned) return { sign: s, weight: 4 }; // not learned
      const total = (prog.correct_count || 0) + (prog.wrong_count || 0);
      const acc = total > 0 ? (prog.correct_count / total) : 0;
      if (acc < 0.5) return { sign: s, weight: 3 };     // poor accuracy
      if (acc < 0.8) return { sign: s, weight: 2 };     // OK accuracy
      return { sign: s, weight: 1 };                     // mastered → low weight
    });
    // Weighted selection (higher weight = more likely to be chosen)
    const count = Math.min(5, pool.length);
    const expanded = [];
    for (const {sign, weight} of weighted) {
      for (let i = 0; i < weight; i++) expanded.push(sign);
    }
    const selected = shuffle(expanded).slice(0, count);
    const questions = shuffle(selected).map(correct => {
      const others = shuffle(pool.filter(s => s.id !== correct.id)).slice(0, 3);
      const options = shuffle([correct, ...others]);
      return { correct, options };
    });
    setQuizQuestions(questions);
    setCurrQIdx(0);
    setQuizScore(0);
    setIsQuizMode(true);
    setQuizFinished(false);
    setLastAnswerCorrect(null);
  };

  const startWeakPractice = async () => {
    if (!currentUser) return;
    const res = await fetch(`${API}/api/signs/progress/${currentUser}`).then(r => r.json());
    const weakIds = (res.progress || [])
      .filter(p => {
        const total = (p.correct_count || 0) + (p.wrong_count || 0);
        const acc = total > 0 ? p.correct_count / total : 0;
        return !p.learned || acc < 0.7;
      })
      .map(p => p.sign_id);
    const weakSigns = SIGN_DATA.filter(s => weakIds.includes(s.id));
    const pool = weakSigns.length >= 3 ? weakSigns : SIGN_DATA;
    const questions = shuffle(pool).slice(0, 5).map(correct => {
      const others = shuffle(SIGN_DATA.filter(s => s.id !== correct.id)).slice(0, 3);
      return { correct, options: shuffle([correct, ...others]) };
    });
    setQuizQuestions(questions);
    setCurrQIdx(0);
    setQuizScore(0);
    setIsQuizMode(true);
    setQuizFinished(false);
    setLastAnswerCorrect(null);
  };

  const [answerLocked, setAnswerLocked] = useState(false);

  const handleQuizAnswer = (selectedId) => {
    if (answerLocked) return;
    setAnswerLocked(true);
    const isCorrect = selectedId === quizQuestions[currQIdx].correct.id;
    setLastAnswerCorrect(isCorrect);
    if (isCorrect) setQuizScore(s => s + 1);

    setTimeout(() => {
      setAnswerLocked(false);
      setLastAnswerCorrect(null);
      if (currQIdx < quizQuestions.length - 1) {
        setCurrQIdx(idx => idx + 1);
      } else {
        setQuizFinished(true);
      }
    }, 1000);
  };

  const startLearning = (sign) => {
    setCurrentSign(sign);
    setIsLearningMode(true);
    setIsQuizMode(false);
  };

  const resetQuiz = () => {
    setIsQuizMode(false);
    setIsLearningMode(false);
    setQuizFinished(false);
    setCurrentSign(null);
    setShowCamera(false);
  };


  // ——————————————————————————————————————————————
  // Render gates
  // ——————————————————————————————————————————————
  if (!currentUser && appState === 'landing') {
    return <Landing setAppState={setAppState} setAuthError={setAuthError} setAuthSuccess={setAuthSuccess} />;
  }
  if (!currentUser) {
    return (
      <Auth
        appState={appState} setAppState={setAppState}
        authError={authError} setAuthError={setAuthError}
        authSuccess={authSuccess} setAuthSuccess={setAuthSuccess}
        authUsername={authUsername} setAuthUsername={setAuthUsername}
        authPassword={authPassword} setAuthPassword={setAuthPassword}
        handleAuth={handleAuth}
        isAuthLoading={isAuthLoading}
      />
    );
  }

  // ——————————————————————————————————————————————
  // Main UI
  // ——————————————————————————————————————————————
  return (
    <div style={s.root}>

      {/* ===== SOS Overlay ===== */}
      {sosActive && (
        <div style={s.sosOverlay}>
          <div style={s.sosModal}>
            <div style={{ background: '#fef2f2', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <Phone size={60} color="#ef4444" fill="#ef4444" style={{ animation: 'pulse 1s infinite' }} />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>ВЫЗОВ SOS</h2>
            <div style={s.sosTimer}>{sosCountdown}</div>
            <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem' }}>Оповещение через {sosCountdown} сек…</p>
            <button style={s.sosCancel} onClick={() => setSosActive(false)}>ОТМЕНА</button>
          </div>
        </div>
      )}

      {/* ===== Mobile Burger Toggle ===== */}
      <div className="hlp-mobile-header" style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '60px',
        background: '#fff',
        zIndex: 1000,
        padding: '0 1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ ...s.brand, marginBottom: 0, fontSize: '1.25rem' }}><Mic size={22} color="#3b82f6" /> Hearless</div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? <Square size={26} /> : <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ width: '25px', height: '2px', background: '#3b82f6' }} />
            <div style={{ width: '25px', height: '2px', background: '#3b82f6' }} />
            <div style={{ width: '25px', height: '2px', background: '#3b82f6' }} />
          </div>}
        </button>
      </div>

      {/* ===== Sidebar ===== */}
      <aside className={`hlp-sidebar ${isMobileMenuOpen ? 'hlp-sidebar--open' : ''}`} style={s.sidebar}>
        <div className="hlp-brand-desktop" style={s.brand}><Mic size={28} color="#3b82f6" /> Hearless</div>

        <nav style={s.nav}>
          {[
            { tab: 'dashboard', icon: <MessageSquare size={18} />, label: 'Субтитры' },
            { tab: 'study', icon: <BookOpen size={18} />, label: 'Учёба' },
            { tab: 'academy', icon: <GraduationCap size={18} />, label: 'Жестовый язык' },
            { tab: 'profile', icon: <UserIcon size={18} />, label: 'Профиль' },
          ].map(({ tab, icon, label }) => (
            <button key={tab}
              style={{ ...s.navBtn, ...(activeTab === tab ? s.navBtnActive : {}) }}
              onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
            >{icon} {label}</button>
          ))}

          {/* Test alert */}
          <button style={{ ...s.navBtn, marginTop: 'auto', color: '#ffaa00' }}
            onClick={() => setAlerts(p => [{ id: Date.now(), type: 'warning', title: 'Тест оповещения', desc: 'Проверка визуальных сигналов', time: 'Сейчас' }, ...p])}
          >
            <AlertTriangle size={18} /> Тест ALERT
          </button>
        </nav>

        {/* SOS button */}
        <button style={s.sosSidebar} onClick={handleSOS}>
          <Phone size={20} fill="white" /> SOS
        </button>
      </aside>

      {/* ===== Main content ===== */}
      <main style={s.main}>

        {/* ───── DASHBOARD ───── */}
        {activeTab === 'dashboard' && (
          <div style={{ ...s.fadeIn, position: 'relative' }}>
            {/* Decorative background blobs only for this tab */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'rgba(59, 130, 246, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>

            <header style={{ ...s.pageHeader, background: '#ffffff', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginBottom: '2.5rem' }}>
              <div>
                <h1 style={{ ...s.h1, fontSize: '1.75rem', marginBottom: '0.25rem' }}>Живые субтитры</h1>
                <p style={{ ...s.sub, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                  Браузерное распознавание речи — русский / қазақша / English
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '8px' }}>
                  <Globe size={16} color="#64748b" />
                  <select
                    value={srLang}
                    onChange={e => changeLang(e.target.value)}
                    style={{ background: 'none', border: 'none', color: '#0f172a', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                  >
                    {SUBTITLE_LANG_OPTIONS.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
                  {!srAvailable ? (
                    <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, maxWidth: '200px', textAlign: 'center' }}>
                      ⚠ Распознавание речи недоступно в этом браузере
                    </span>
                  ) : (
                  <button
                    style={{ ...s.listenBtn, padding: '0.85rem 1.75rem', borderRadius: '16px', background: isListening ? '#ef4444' : '#0f172a' }}
                    onClick={() => setIsListening(!isListening)}
                  >
                  {isListening ? <><Square size={16} /> Остановить</> : <><Mic size={16} /> Слушать сейчас</>}
                  </button>
                  )}
                  <button
                    onClick={startWhisperSTT}
                    disabled={isTranscribing}
                    style={{ ...s.listenBtn, padding: '0.85rem 1.5rem', borderRadius: '16px', background: isTranscribing ? '#94a3b8' : '#7c3aed', opacity: isTranscribing ? 0.7 : 1 }}
                  >
                    {isTranscribing ? <><Loader2 size={16} style={{ animation: 'spin 2s linear infinite' }} /> AI...</> : <>🎤 AI транскрибация</>}
                  </button>
              </div>
            </header>

            <div className="hlp-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
              {/* Subtitles panel */}
              <div className="hlp-feat-card" style={{ background: '#ffffff', borderRadius: '28px', border: '1px solid #e2e8f0', padding: '2.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', height: '650px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: '#eff6ff', borderRadius: '10px', color: '#3b82f6' }}><MessageSquare size={20} /></div>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>Поток речи</span>
                  </div>
                  {isListening ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#059669', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span> Микрофон ВКЛ
                    </div>
                  ) : (
                    <div style={{ background: '#f1f5f9', color: '#64748b', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700 }}>Ожидание</div>
                  )}
                </div>

                <div style={{ ...s.subScroll, flex: 1, maxHeight: 'none', paddingRight: '1rem' }}>
                  {subtitles.map(entry => (
                    <div key={entry.id} style={{
                      ... (entry.isSystem ? s.subSystem : s.subEntry),
                      background: entry.isSystem ? '#f8fafc' : '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '1.25rem',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      borderLeft: entry.isSystem ? '4px solid #cbd5e1' : '4px solid #3b82f6'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{entry.isSystem ? 'Система' : 'Голос'}</span>
                        <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>{entry.timestamp}</small>
                      </div>
                      <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.6, color: '#0f172a', fontWeight: 500 }}>{entry.text}</p>
                    </div>
                  ))}

                  {interimText && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px dashed #3b82f6', borderRadius: '18px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Loader2 size={14} style={{ animation: 'spin 2s linear infinite' }} color="#3b82f6" />
                        <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 800 }}>Распознавание...</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.7, color: '#0f172a', fontStyle: 'italic' }}>{interimText}</p>
                    </div>
                  )}
                  <div ref={subtitlesEndRef} />
                </div>
              </div>

              {/* Alerts panel */}
              <div className="hlp-feat-card" style={{ background: '#ffffff', borderRadius: '28px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', height: 'fit-content' }}>
                <h3 style={{ marginBottom: '2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.1rem' }}>
                  <div style={{ padding: '0.5rem', background: '#fff7ed', borderRadius: '10px', color: '#f97316' }}><Bell size={20} /></div>
                  Умные оповещения
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '500px', paddingRight: '4px' }}>
                  {alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                      <div style={{ background: '#f8fafc', display: 'inline-flex', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}><Wifi size={32} color="#cbd5e1" /></div>
                      <p style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 500 }}>Опасных звуков не<br />обнаружено</p>
                    </div>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} style={{
                        ...s.alertItem,
                        background: (a.type === 'emergency' || a.type === 'danger') ? '#fff1f2' : '#ffffff',
                        border: (a.type === 'emergency' || a.type === 'danger') ? '1px solid #fecade' : '1px solid #e2e8f0',
                        borderRadius: '18px',
                        padding: '1.25rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ padding: '0.65rem', background: (a.type === 'emergency' || a.type === 'danger') ? '#fb7185' : '#eff6ff', borderRadius: '12px', color: '#fff' }}>
                          {alertIcons[a.type] || <Bell size={18} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{a.title}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{a.time}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{a.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ─── Subtitle history ─── */}
            {showHistory ? (
              <div className="hlp-feat-card" style={{ marginTop: '1rem', background: '#ffffff', borderRadius: '28px', border: '1px solid #e2e8f0', padding: '2.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MessageSquare size={20} color="#3b82f6" /> История субтитров
                  </h3>
                  <button onClick={closeHistory} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem 1rem', borderRadius: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                    <X size={16} /> Закрыть
                  </button>
                </div>

                {selectedSession ? (
                  <div>
                    <button onClick={() => { setSelectedSession(null); setSessionEntries([]); }}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Назад к сессиям
                    </button>
                    {isLoadingHistory ? (
                      <p style={{ color: '#94a3b8', textAlign: 'center' }}>Загрузка...</p>
                    ) : (
                      <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {sessionEntries.map((e, i) => (
                          <div key={i} style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{e.text}</p>
                            <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{e.timestamp}</small>
                          </div>
                        ))}
                        {sessionEntries.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Нет записей</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {isLoadingHistory ? (
                      <p style={{ color: '#94a3b8', textAlign: 'center' }}>Загрузка...</p>
                    ) : historySessions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                        <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>История пуста</p>
                      </div>
                    ) : (
                      historySessions.map(s => (
                        <div key={s.session_id} onClick={() => loadSession(s.session_id)}
                          style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', flex: 1 }}>{s.first_text}</p>
                            <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {s.count} зап.
                            </span>
                          </div>
                          <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.timestamp}</small>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : currentUser && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button onClick={loadHistory} style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <MessageSquare size={16} /> История субтитров
                </button>
              </div>
            )}
          </div>
        )}

        {/* ───── STUDY ───── */}
        {activeTab === 'study' && (
          <div style={s.fadeIn}>
            <header style={s.pageHeader}>
              <div>
                <h1 style={s.h1}>Режим учёбы</h1>
                <p style={s.sub}>Превращайте лекции в знания с помощью ИИ</p>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* PDF section */}
                <div className="hlp-feat-card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 800, fontSize: '1.25rem' }}>
                    <div style={{ padding: '0.5rem', background: '#eff6ff', borderRadius: '12px', color: '#3b82f6' }}><FileText size={20} /></div>
                    Конспект из PDF
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ ...s.fileLabel, background: '#f8fafc', border: '2px dashed #cbd5e1', color: '#64748b' }}>
                      {pdfFile ? pdfFile.name : 'Перетащите или выберите PDF...'}
                      <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setPdfFile(e.target.files[0])} />
                    </label>
                    <button className="hlp-btn-primary" style={{ padding: '0.85rem 1.5rem', borderRadius: '14px', border: 'none', color: '#fff', background: '#3b82f6', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={generatePdfNotes} disabled={!pdfFile || isProcessingPdf}>
                      {isProcessingPdf ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Обработать'}
                    </button>
                  </div>
                  {pdfProgress && <p style={{ color: '#3b82f6', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>{pdfProgress}</p>}

                  {pdfNotes && (
                    <div style={{ ...s.notesBox, marginTop: '2rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '16px' }}>
                      <h4 style={{ color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', fontSize: '1.1rem' }}>📄 Извлеченные заметки</h4>
                      <pre style={s.preText}>{pdfNotes}</pre>
                      {pdfSummary && (
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#ffffff', borderRadius: '16px', borderLeft: '4px solid #3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <h4 style={{ color: '#0f172a', marginBottom: '0.75rem', fontSize: '1.05rem' }}>✨ Краткое содержание</h4>
                          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6 }}>{pdfSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Lecture recording */}
                <div className="hlp-feat-card" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 800, fontSize: '1.25rem' }}>
                      <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '12px', color: '#ef4444' }}><Mic size={20} /></div>
                      Запись лекции
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <select
                        value={lectureLang}
                        onChange={e => setLectureLang(e.target.value)}
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                      >
                        {SUBTITLE_LANG_OPTIONS.map(l => (<option key={l.code} value={l.code}>{l.label}</option>))}
                      </select>
                      {lectureNotes && (
                        <button style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={handleSummarize} disabled={isSummarizing}>
                          {isSummarizing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Саммари'}
                        </button>
                      )}
                      {isRecordingLecture ? (
                        <button style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={toggleLecture}>
                          <Square size={16} /> Остановить
                        </button>
                      ) : (
                        <button style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={toggleLecture}>
                          <Mic size={16} /> Запись
                        </button>
                      )}
                    </div>
                  </div>

                  {isRecordingLecture && (
                    <div style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#fef2f2', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                      Запись... {Math.floor(lectureDuration / 60)}:{String(lectureDuration % 60).padStart(2, '0')}
                      <span style={{ color: '#64748b', fontWeight: 400 }}>|</span>
                      <span style={{ color: '#64748b', fontWeight: 400 }}>{lectureNotes.split(/\s+/).filter(Boolean).length} слов</span>
                    </div>
                  )}

                  {/* Live subtitles during recording */}
                  {isRecordingLecture && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '14px', maxHeight: '100px', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Распознаётся...</div>
                      {lectureSubtitles.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Ожидание речи...</p>
                      ) : (
                        lectureSubtitles.slice(-3).map(s => (
                          <p key={s.id} style={{ margin: '0.15rem 0', fontSize: '0.9rem', color: '#0f172a' }}>{s.text}</p>
                        ))
                      )}
                    </div>
                  )}

                  <textarea
                    value={lectureNotes}
                    onChange={e => setLectureNotes(e.target.value)}
                    placeholder="Жду начала транскрипции..."
                    style={{ width: '100%', minHeight: '160px', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '1.05rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
                  />

                  {lectureSummary && (
                    <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#ffffff', borderRadius: '16px', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ marginBottom: '0.75rem', fontSize: '1.05rem', color: '#0f172a' }}>✨ Краткий итог лекции</h4>
                      <div style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>{lectureSummary}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="hlp-feat-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 800, fontSize: '1.25rem' }}>
                    <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '12px', color: '#16a34a' }}><MessageSquare size={20} /></div>
                    ИИ-Ассистент
                  </h3>

                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: '18px', padding: '1.5rem', marginBottom: '1.25rem', overflowY: 'auto', minHeight: '400px', border: '1px solid #e2e8f0' }}>
                    {!(lectureNotes.trim() || pdfNotes.trim()) ? (
                      <div style={{ textAlign: 'center', marginTop: '6rem' }}>
                        <div style={{ background: '#f1f5f9', display: 'inline-flex', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}><MessageSquare size={32} color="#94a3b8" /></div>
                        <p style={{ color: '#64748b', fontSize: '1.05rem' }}>
                          Вставьте PDF или запишите лекцию, <br />чтобы обсуждать её с ИИ.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ alignSelf: 'center', background: '#e0f2fe', color: '#0369a1', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Материал загружен! Что вы хотите узнать?
                        </div>
                        {chatResponse && (
                          <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '1.25rem', borderRadius: '18px', border: '1px solid #e2e8f0', maxWidth: '90%', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', color: '#0f172a', lineHeight: 1.6 }}>
                            {chatResponse}
                          </div>
                        )}
                        {isChatting && <div style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 500, alignSelf: 'flex-start', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '18px' }}>ИИ генерирует ответ...</div>}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleChat} style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Спросите что-нибудь по материалу..."
                      style={{ flex: 1, padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', outline: 'none', fontFamily: 'inherit' }}
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      disabled={!(lectureNotes.trim() || pdfNotes.trim()) || isChatting}
                    />
                    <button style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '0 1.5rem', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', opacity: (!(lectureNotes.trim() || pdfNotes.trim()) || isChatting) ? 0.5 : 1 }} disabled={!(lectureNotes.trim() || pdfNotes.trim()) || isChatting}>
                      <ChevronRight size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── ACADEMY ───── */}
        {activeTab === 'academy' && (
          <div style={s.fadeIn}>
            {!isQuizMode && !isLearningMode ? (
              <>
                <header style={s.pageHeader}>
                  <div>
                    <h1 style={s.h1}>Академия жестов</h1>
                    <p style={s.sub}>Визуальный словарь для общения без границ</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="Найти жест..." 
                      value={academySearch}
                      onChange={e => setAcademySearch(e.target.value)}
                      style={{ ...s.input, width: '180px', padding: '0.65rem 1rem' }}
                    />
                    <button 
                      onClick={() => startQuiz(academyCategory)}
                      style={{ ...s.btnPrimary, background: 'linear-gradient(135deg, #3b82f6, #2dd4bf)', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '14px', fontSize: '0.9rem' }}>
                      <Zap size={16} /> Тренажёр
                    </button>
                    {currentUser && (
                      <button 
                        onClick={startWeakPractice}
                        style={{ ...s.btnPrimary, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '14px', fontSize: '0.9rem' }}>
                        <AlertTriangle size={16} /> Сложные
                      </button>
                    )}
                  </div>
                </header>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'alphabet', label: 'Алфавит' },
                    { id: 'numbers', label: 'Цифры' },
                    { id: 'greetings', label: 'Приветствия' },
                    { id: 'emergency', label: 'Экстренные' },
                    { id: 'common', label: 'Общие' },
                    { id: 'colors', label: 'Цвета' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setAcademyCategory(cat.id)}
                      style={{
                        padding: '0.65rem 1.25rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: academyCategory === cat.id ? '#3b82f6' : '#fff',
                        color: academyCategory === cat.id ? '#fff' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                
                {signStats && (
                  <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>{signStats.learned || 0}<span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>/{signStats.total || SIGN_DATA.length}</span></div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Изучено жестов</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>{signStats.practiced || 0}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Всего практик</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: signStats.accuracy >= 80 ? '#10b981' : (signStats.accuracy >= 50 ? '#f59e0b' : '#ef4444') }}>
                        {signStats.accuracy != null ? `${Math.round(signStats.accuracy)}%` : '—'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Точность</div>
                    </div>
                  </div>
                  {/* Per-category progress */}
                  {currentUser && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                      {[['alphabet','Алфавит'], ['numbers','Цифры'], ['greetings','Приветствия'], ['emergency','Экстренные'], ['common','Общие'], ['colors','Цвета']].map(([catId, catLabel]) => {
                        const total = SIGN_DATA.filter(s => s.category === catId).length;
                        const learned = Object.entries(signProgress).filter(([sid, p]) => {
                          const sign = SIGN_DATA.find(s => s.id === sid);
                          return sign && sign.category === catId && p.learned;
                        }).length;
                        return (
                          <div key={catId} style={{ width: 'calc(16.66% - 0.85rem)', minWidth: '100px', background: '#fff', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: learned === total ? '#10b981' : '#0f172a' }}>{learned}/{total}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>{catLabel}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '2rem' }}>
                  {SIGN_DATA
                    .filter(s => academyCategory === 'all' || s.category === academyCategory)
                    .filter(s => s.label.toLowerCase().includes(academySearch.toLowerCase()))
                    .map((item) => (
                    <div key={item.id} className="hlp-feat-card" 
                      onClick={() => startLearning(item)}
                      style={{ 
                        background: '#fff', 
                        borderRadius: '28px', 
                        padding: '2.5rem 2rem', 
                        textAlign: 'center',
                        border: signProgress[item.id]?.learned ? '1px solid #86efac' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: signProgress[item.id]?.learned ? '0 4px 20px rgba(34, 197, 94, 0.1)' : '0 10px 40px rgba(0,0,0,0.03)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                      {signProgress[item.id]?.learned ? (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#22c55e', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '50px' }}>✓</div>
                      ) : null}
                      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80px' }}>
                        {item.hand ? <HandVisual fingers={item.hand} size={72} /> : <span style={{ fontSize: '4rem' }}>{item.icon}</span>}
                      </div>
                      <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.label}</h3>
                      <span style={{ color: '#3b82f6', background: '#eff6ff', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>{item.sub}</span>
                      
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <button style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Изучить →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : isLearningMode ? (
              <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
                <button onClick={resetQuiz} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', marginBottom: '2rem' }}>
                  <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Назад в библиотеку
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                  {/* Left: Sign Info */}
                  <div className="hlp-feat-card" style={{ background: '#fff', padding: '3rem', borderRadius: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                      {currentSign?.hand ? <HandVisual fingers={currentSign.hand} size={180} /> : <span style={{ fontSize: '8rem' }}>{currentSign?.icon}</span>}
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem' }}>{currentSign?.label}</h2>
                    <div style={{ display: 'inline-block', background: '#eff6ff', color: '#3b82f6', padding: '0.5rem 1.5rem', borderRadius: '50px', fontWeight: 700, marginBottom: '2rem' }}>{currentSign?.sub}</div>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.6, textAlign: 'left', background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', borderLeft: '4px solid #3b82f6' }}>
                      {currentSign?.desc}
                    </p>
                    
                    {currentSign?.video && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                        <a href={currentSign.video} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                          <Play size={16} /> Смотреть видео-пример
                        </a>
                      </div>
                    )}
                    {signProgress[currentSign?.id]?.learned ? (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', textAlign: 'center' }}>
                        <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Жест изучен
                      </div>
                    ) : null}
                    
                    <button 
                      onClick={() => setShowCamera(!showCamera)}
                      style={{ ...s.btnPrimary, width: '100%', marginTop: '2.5rem', padding: '1rem', borderRadius: '16px', justifyContent: 'center' }}>
                      {showCamera ? <><X size={20} /> Закрыть камеру</> : <><Camera size={20} /> Практиковать с камерой</>}
                    </button>
                  </div>

                  {/* Right: Camera/Practice */}
                  <div className="hlp-feat-card" style={{ background: '#0f172a', padding: '2rem', borderRadius: '32px', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '500px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', zIndex: 10 }}>
                      <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></div> Практика
                      </h3>
                      <div style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem' }}>AI Vision</div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', borderRadius: '20px', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {showCamera ? (
                        <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <video id="sign-camera" autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <canvas id="sign-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <p style={{ color: '#fff', fontSize: '0.9rem', margin: 0 }}>Покажите жест <strong>{currentSign?.label}</strong> в объектив</p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                          <Camera size={48} color="#64748b" style={{ marginBottom: '1.5rem' }} />
                          <p style={{ color: '#94a3b8' }}>Нажмите кнопку слева, чтобы<br />включить камеру и начать проверку</p>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button 
                        onClick={async () => {
                          if (!currentSign || !currentUser) return;
                          await fetch(`${API}/api/signs/progress`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: currentUser, sign_id: currentSign.id, correct: true })
                          });
                          const res = await fetch(`${API}/api/signs/progress/${currentUser}`).then(r => r.json());
                          if (res.progress) {
                            const map = {};
                            res.progress.forEach(p => { map[p.sign_id] = p; });
                            setSignProgress(map);
                          }
                          alert(`✅ Отлично! Жест "${currentSign.label}" отмечен как изученный!`);
                        }}
                        style={{ background: '#10b981', border: 'none', color: '#fff', padding: '1rem', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>
                        <ThumbsUp size={18} /> Я знаю этот жест
                      </button>
                      <button 
                        onClick={() => {
                          setShowCamera(true);
                        }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '1rem', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>
                        <Camera size={18} /> Камера
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
                {!quizFinished ? (
                  <div className="hlp-feat-card" style={{ background: '#fff', padding: '3rem', borderRadius: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>Вопрос {currQIdx + 1} из {quizQuestions.length}</span>
                      <button onClick={resetQuiz} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Square size={20} /></button>
                    </div>
                    
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '3rem', overflow: 'hidden' }}>
                      <div style={{ width: `${((currQIdx + 1) / quizQuestions.length) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
                    </div>

                    <div style={{ 
                      fontSize: '8rem', 
                      margin: '2rem 0',
                      animation: lastAnswerCorrect === true ? 'pulse 0.5s' : 'none',
                      color: lastAnswerCorrect === true ? '#10b981' : (lastAnswerCorrect === false ? '#ef4444' : '#0f172a')
                    }}>
                      {quizQuestions[currQIdx].correct.icon}
                    </div>
                    
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '2.5rem', color: '#64748b' }}>Что означает этот жест?</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {quizQuestions[currQIdx].options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleQuizAnswer(opt.id)}
                          style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: '#0f172a'
                          }}
                          className="hlp-quiz-opt"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="hlp-feat-card" style={{ background: '#fff', padding: '4rem 2rem', borderRadius: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🏆</div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem' }}>Отличный результат!</h2>
                    <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2.5rem' }}>Ваш счёт: {quizScore} из {quizQuestions.length}</p>
                    <button 
                      onClick={resetQuiz}
                      style={{ ...s.btnPrimary, margin: '0 auto', padding: '1rem 3rem', borderRadius: '50px' }}>
                      Вернуться в библиотеку
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* ───── PROFILE ───── */}
        {activeTab === 'profile' && (
          <div className="hlp-feat-card" style={{ ...s.fadeIn, maxWidth: '520px', margin: '0 auto', padding: '2.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <h2 style={{ marginBottom: '2rem', color: '#0f172a', fontWeight: 800, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <UserIcon size={24} color="#3b82f6" /> Профиль и Настройки
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              {userAvatar ? <img src={userAvatar} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} /> : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700 }}>
                  {currentUser?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a', display: 'block' }}>{currentUser}</strong>
                <span style={{ color: '#64748b', fontSize: '0.95rem' }}>Пользователь</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.65rem', color: '#0f172a', fontWeight: 600, fontSize: '1rem' }}>SOS контакт (WhatsApp номер)</label>
              <input
                type="text"
                value={sosContact}
                onChange={e => { setSosContact(e.target.value); localStorage.setItem(`sos_${currentUser}`, e.target.value); }}
                placeholder="+7 000 000 00 00"
                style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#eff6ff', borderRadius: '18px', fontSize: '0.95rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.05rem' }}><Info size={18} /> О субтитрах</strong>
              <div style={{ opacity: 0.9, lineHeight: 1.6 }}>
                Субтитры работают через <strong>браузерное распознавание речи</strong> (Web Speech API) — русский, казахский и английский языки.<br /><br />
                ✅ Микрофон: Chrome, Safari, Edge, Firefox, Opera.
              </div>
            </div>

            {/* Diagnostics */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fff7ed', borderRadius: '18px', border: '1px solid #fed7aa' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.05rem', color: '#9a3412' }}>
                <Zap size={18} /> Диагностика STT
              </strong>
              <button
                onClick={runDiagnostics}
                disabled={isDiagLoading}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {isDiagLoading ? 'Проверка...' : 'Проверить сервер'}
              </button>
              {diagResult && (
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  {diagResult.root?.status === 'error' ? (
                    <div style={{ color: '#dc2626' }}>❌ Бэкенд не отвечает ({diagResult.root.message})</div>
                  ) : (
                    <>
                      <div style={{ color: '#16a34a' }}>✅ Бэкенд: {diagResult.root?.message || 'OK'}</div>
                      {diagResult.diagnose && (
                        <>
                          <div style={{ color: diagResult.diagnose.db ? '#16a34a' : '#dc2626' }}>📦 БД: {diagResult.diagnose.db ? 'OK' : 'Ошибка'}</div>
                          <div style={{ color: diagResult.diagnose.xai_configured ? '#16a34a' : '#ca8a04' }}>🤖 xAI: {diagResult.diagnose.xai_configured ? 'Готов' : 'Не настроен'}</div>
                        </>
                      )}
                    </>
                  )}
                  {diagResult.error && (
                    <div style={{ color: '#dc2626' }}>❌ Ошибка: {diagResult.error}</div>
                  )}
                </div>
              )}
            </div>

            <button style={{ marginTop: '2.5rem', width: '100%', padding: '1rem', borderRadius: '14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', transition: 'all 0.2s' }} onClick={handleLogout}>
              <LogOut size={18} /> Выйти из аккаунта
            </button>
          </div>
        )}
      </main>

      {/* Keyframe animations not covered by styles.css */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wave  { from { height: 10%; } to { height: 100%; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        @media (max-width: 900px) {
          .hlp-main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .sos-modal { width: 95% !important; padding: 2rem 1rem !important; }
          h1 { font-size: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}

// ——————————————————————————————————————————————
// Styles (JS object — no CSS file needed)
// ——————————————————————————————————————————————
const s = {
  root: { display: 'flex', height: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' },
  sidebar: { width: '260px', minWidth: '260px', background: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '4px 0 20px rgba(0,0,0,0.02)' },
  brand: { display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3b82f6', fontWeight: 800, fontSize: '1.5rem', marginBottom: '2.5rem', letterSpacing: '-0.5px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  navBtn: { display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'none', border: 'none', color: '#64748b', padding: '0.85rem 1rem', borderRadius: '14px', cursor: 'pointer', fontSize: '1rem', textAlign: 'left', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', fontWeight: 500 },
  navBtnActive: { background: '#eff6ff', color: '#3b82f6', fontWeight: 600, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)' },
  sosSidebar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '16px', padding: '1rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.25)', marginTop: '1rem', transition: 'transform 0.2s' },
  main: { flex: 1, overflow: 'auto', padding: '2.5rem', scrollbarWidth: 'thin', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' },
  h1: { fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.5px' },
  sub: { color: '#64748b', fontSize: '1rem', fontWeight: 400 },
  dashGrid: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' },
  glass: { background: 'rgba(255, 255, 255, 0.8)', border: '1px solid #e2e8f0', borderRadius: '24px', backdropFilter: 'blur(16px)', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' },
  subScroll: { maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '8px' },
  subEntry: { background: '#ffffff', padding: '1.25rem', borderRadius: '18px', borderLeft: '4px solid #3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s' },
  subSystem: { background: '#f1f5f9', padding: '1rem 1.25rem', borderRadius: '16px', borderLeft: '4px solid #94a3b8', opacity: 0.8, color: '#475569' },
  subInterim: { background: 'rgba(59, 130, 246, 0.05)', padding: '1.25rem', borderRadius: '18px', borderLeft: '4px dashed #3b82f6', color: '#3b82f6' },
  statusOn: { display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.95rem', fontWeight: 600, background: '#ecfdf5', padding: '0.5rem 1rem', borderRadius: '50px' },
  statusOff: { color: '#64748b', fontSize: '0.95rem', fontWeight: 500, background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '50px' },
  dot: { width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: 'blink 1.5s infinite' },
  alertItem: { display: 'flex', alignItems: 'flex-start', gap: '1rem', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '18px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' },
  alertDanger: { background: '#fef2f2', border: '1px solid #fecaca', animation: 'pulse 2s infinite' },
  listenBtn: { display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 700, fontSize: '1rem', padding: '0.85rem 2rem', borderRadius: '50px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' },
  listenBtnActive: { background: '#ef4444', color: '#fff', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.2)' },
  langSelect: { background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', padding: '0.75rem 1.25rem', borderRadius: '14px', fontSize: '1rem', cursor: 'pointer', fontWeight: 500, outline: 'none', transition: 'border-color 0.2s' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 600, padding: '0.85rem 1.5rem', borderRadius: '14px', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 6px 15px rgba(59, 130, 246, 0.15)' },
  btnDanger: { background: '#ef4444', color: '#fff', boxShadow: '0 6px 15px rgba(239, 68, 68, 0.15)' },
  fileLabel: { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', color: '#64748b', transition: 'all 0.2s' },
  notesBox: { marginTop: '1.5rem', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '20px', maxHeight: '400px', overflowY: 'auto' },
  preText: { whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: 1.8, color: '#334155' },
  textarea: { width: '100%', minHeight: '250px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', padding: '1.5rem', borderRadius: '20px', fontSize: '1.1rem', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' },
  profileAvatar: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' },
  avatarFallback: { width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' },
  settingLabel: { display: 'block', color: '#64748b', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.65rem' },
  input: { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', padding: '1rem 1.25rem', borderRadius: '14px', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' },
  fadeIn: { animation: 'fadeIn 0.5s ease-out' },

  // SOS
  sosOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  sosModal: { background: '#ffffff', padding: '4rem', borderRadius: '40px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 30px 100px rgba(0,0,0,0.15)', maxWidth: '500px', width: '90%' },
  sosTimer: { fontSize: '8rem', fontWeight: 900, lineHeight: 1, margin: '1rem 0', color: '#ef4444', letterSpacing: '-5px' },
  sosCancel: { marginTop: '2.5rem', background: '#f1f5f9', border: 'none', color: '#475569', padding: '1rem 3rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', transition: 'all 0.2s' },
};

export default App;
