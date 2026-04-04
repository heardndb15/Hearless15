import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ear, Bell, Flame, Car, MessageSquare,
  BookOpen, Mic, AlertTriangle, Phone,
  Square, User as UserIcon, LogOut, FileText, Loader2,
  Wifi, WifiOff, Globe, Globe2, ChevronRight, Info
} from 'lucide-react';

import Landing from './src/components/Landing';
import Auth from './src/components/Auth';

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://hearless15.onrender.com';

// ——————————————————————————————————————————————
// Constants & helpers
// ——————————————————————————————————————————————
const SUBTITLE_LANG_OPTIONS = [
  { code: 'ru-RU', label: 'Русский' },
  { code: 'en-US', label: 'English' },
  { code: 'kk-KZ', label: 'Қазақша' },
];

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
  const [currentUser, setCurrentUser] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [appState, setAppState] = useState('landing');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // === Navigation ===
  const [activeTab, setActiveTab] = useState('dashboard');

  // === Subtitles (Browser STT) ===
  const [isListening, setIsListening] = useState(false);
  const [srAvailable, setSrAvailable] = useState(!!SR);
  const [srLang, setSrLang] = useState('ru-RU');
  const [subtitles, setSubtitles] = useState([
    { id: 0, text: "Система готова. Нажмите «Слушать» для старта.", timestamp: '—', isFinal: true }
  ]);
  const [interimText, setInterimText] = useState('');  // live typing text

  // === Alerts ===
  const [alerts, setAlerts] = useState([]);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [sosContact, setSosContact] = useState('');

  // === Study / PDF ===
  const [isRecordingLecture, setIsRecordingLecture] = useState(false);
  const [lectureNotes, setLectureNotes] = useState('');
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

  // === Refs ===
  const subtitlesEndRef = useRef(null);
  const srRef = useRef(null);   // SpeechRecognition instance
  const isListeningRef = useRef(false);
  const isRecordingRef = useRef(false);
  const lectureNotesRef = useRef('');     // mirror for callbacks

  // Keep refs in sync
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isRecordingRef.current = isRecordingLecture; }, [isRecordingLecture]);
  useEffect(() => { lectureNotesRef.current = lectureNotes; }, [lectureNotes]);

  // Auto-scroll
  useEffect(() => { subtitlesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [subtitles, interimText]);

  // Load SOS contact on login
  useEffect(() => {
    if (!currentUser) return;
    const s = localStorage.getItem(`sos_${currentUser}`);
    if (s) setSosContact(s);
    fetch(`${API}/api/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => { });
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => () => stopBrowserSTT(), []);

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
      if (appState === 'register') {
        setAppState('login'); setAuthSuccess('Готово! Теперь войдите.');
        setIsAuthLoading(false);
      } else {
        setCurrentUser(data.username);
        fetch(`${API}/api/user/${data.username}`).then(r => r.json()).then(d => setUserAvatar(d.avatar)).catch(() => { });
        setIsAuthLoading(false);
      }
    } catch { setAuthError('Нет связи с сервером.'); setIsAuthLoading(false); }
  };

  const handleLogout = () => {
    stopBrowserSTT();
    setCurrentUser(null); setAppState('landing');
    setIsListening(false); setIsRecordingLecture(false); setLectureNotes('');
  };

  // ——————————————————————————————————————————————
  // Browser SpeechRecognition — NO AI required
  // ——————————————————————————————————————————————
  const startBrowserSTT = useCallback(() => {
    if (!SR) {
      console.warn('SpeechRecognition not supported');
      setSrAvailable(false);
      return;
    }
    if (srRef.current) return; // already running

    console.log('[STT] Starting browser SpeechRecognition, lang:', srLang);

    const rec = new SR();
    rec.lang = srLang;
    rec.continuous = true;   // never stops on silence
    rec.interimResults = true;   // show partial results in real-time
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      console.log('[STT] Mic open, listening…');
    };

    rec.onresult = (event) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += t;
        } else {
          interim += t;
        }
      }

      // Show live typing
      setInterimText(interim);

      // Commit final sentence
      if (finalChunk.trim()) {
        const newEntry = {
          id: Date.now(),
          text: finalChunk.trim(),
          timestamp: new Date().toLocaleTimeString(),
          isFinal: true,
        };

        setSubtitles(prev => [...prev, newEntry].slice(-30));
        setInterimText('');

        // Mirror to lecture notes if recording
        if (isRecordingRef.current) {
          setLectureNotes(old => old + finalChunk.trim() + ' ');
        }

        // Danger check (async, non-blocking)
        checkDanger(finalChunk.trim());
      }
    };

    rec.onerror = (event) => {
      console.error('[STT] Error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        addSystemSubtitle('⛔ Доступ к микрофону запрещён. Разрешите в настройках браузера.');
        setIsListening(false);
        srRef.current = null;
        return;
      }
      if (event.error === 'no-speech') return; // just silence — ok
      // for any other error, restart automatically
    };

    rec.onend = () => {
      console.log('[STT] onend, isListening:', isListeningRef.current);
      setInterimText('');
      srRef.current = null;
      // Auto-restart if user hasn't pressed Stop
      if (isListeningRef.current) {
        console.log('[STT] Auto-restarting…');
        setTimeout(startBrowserSTT, 200);
      }
    };

    try {
      rec.start();
      srRef.current = rec;
    } catch (err) {
      console.error('[STT] Could not start:', err);
      srRef.current = null;
    }
  }, [srLang]);

  const stopBrowserSTT = useCallback(() => {
    console.log('[STT] Stopping…');
    if (srRef.current) {
      try { srRef.current.stop(); } catch { }
      srRef.current = null;
    }
    setInterimText('');
  }, []);

  // Start/stop when toggle OR language changes
  useEffect(() => {
    if (isListening) {
      stopBrowserSTT();
      startBrowserSTT();
    } else {
      stopBrowserSTT();
    }
    // eslint-disable-next-line
  }, [isListening, srLang]);

  const changeLang = (lang) => {
    setSrLang(lang);
    addSystemSubtitle(`Язык изменён на: ${lang === 'ru-RU' ? 'Русский' : lang === 'en-US' ? 'English' : 'Қазақша'}`);
  };

  // ——————————————————————————————————————————————
  // Helpers
  // ——————————————————————————————————————————————
  const addSystemSubtitle = (text) => {
    setSubtitles(prev => [...prev, {
      id: Date.now(), text, timestamp: new Date().toLocaleTimeString(), isFinal: true, isSystem: true
    }]);
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
  // Study / Lecture
  // ——————————————————————————————————————————————
  const toggleLecture = () => {
    if (!isRecordingLecture) {
      setIsRecordingLecture(true);
      setLectureNotes('');
      setIsListening(true);
    } else {
      setIsRecordingLecture(false);
      setIsListening(false);
      // Save
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
                  {srAvailable ? (
                    <><span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span> Система готова к работе</>
                  ) : (
                    <><AlertTriangle size={14} color="#ef4444" /> Браузер не поддерживает Web Speech</>
                  )}
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

                <button
                  style={{ ...s.listenBtn, padding: '0.85rem 1.75rem', borderRadius: '16px', background: isListening ? '#ef4444' : '#0f172a' }}
                  onClick={() => setIsListening(!isListening)}
                  disabled={!srAvailable}
                >
                  {isListening ? <><Square size={16} /> Остановить</> : <><Mic size={16} /> Слушать сейчас</>}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 800, fontSize: '1.25rem' }}>
                      <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '12px', color: '#ef4444' }}><Mic size={20} /></div>
                      Запись лекции
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {lectureNotes && (
                        <button style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={handleSummarize} disabled={isSummarizing}>
                          {isSummarizing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Саммари лекции'}
                        </button>
                      )}
                      {isRecordingLecture ? (
                        <button style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={toggleLecture}>
                          <Square size={16} /> Остановить
                        </button>
                      ) : (
                        <button style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }} onClick={toggleLecture}>
                          <Mic size={16} /> Начать запись
                        </button>
                      )}
                    </div>
                  </div>
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
                Субтитры работают напрямую через движок вашего браузера (<strong>Web Speech API</strong>), обеспечивая нулевую задержку без сторонних серверов.<br /><br />
                ✅ Полная поддержка: Chrome (ПК/Android), Safari (iOS), Edge, Opera.
              </div>
            </div>

            <button style={{ marginTop: '2.5rem', width: '100%', padding: '1rem', borderRadius: '14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', transition: 'all 0.2s' }} onClick={handleLogout}>
              <LogOut size={18} /> Выйти из аккаунта
            </button>
          </div>
        )}
      </main>

      {/* ===== CSS-in-JS keyframes ===== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; color: #0f172a; -webkit-tap-highlight-color: transparent; }
        @keyframes pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.05);} }
        @keyframes spin  { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        @keyframes wave { from{height: 10%;} to{height: 100%;} }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        /* Mobile Styles */
        @media (max-width: 900px) {
          .hlp-sidebar {
            position: fixed;
            left: -260px;
            top: 60px;
            bottom: 0;
            z-index: 1100;
            transition: left 0.3s ease;
          }
          .hlp-sidebar--open {
            left: 0;
          }
          .hlp-mobile-header {
            display: flex !important;
          }
          .hlp-brand-desktop {
            display: none !important;
          }
          main {
            padding: 5.5rem 1rem 1rem !important;
          }
          .hlp-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 600px) {
          .sos-modal {
            width: 95% !important;
            padding: 2rem 1rem !important;
          }
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
  fadeIn: { animation: 'none' },

  // SOS
  sosOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  sosModal: { background: '#ffffff', padding: '4rem', borderRadius: '40px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 30px 100px rgba(0,0,0,0.15)', maxWidth: '500px', width: '90%' },
  sosTimer: { fontSize: '8rem', fontWeight: 900, lineHeight: 1, margin: '1rem 0', color: '#ef4444', letterSpacing: '-5px' },
  sosCancel: { marginTop: '2.5rem', background: '#f1f5f9', border: 'none', color: '#475569', padding: '1rem 3rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', transition: 'all 0.2s' },
};

export default App;
