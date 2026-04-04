import React, { useState, useEffect, useRef } from 'react';
import {
    Menu, X, Mic, Bell, BookOpen, AlertTriangle,
    LogIn, UserPlus, PlayCircle, Shield,
    Zap, Globe, ChevronRight, CheckCircle2,
    Info, MessageSquare, PhoneCall, Github,
    Layout, Cpu, BellRing, BookMarked
} from 'lucide-react';

const PROBLEMS = [
    { icon: <MessageSquare size={32} />, title: "Барьеры в общении", desc: "Пропуск важных разговоров и повседневных встреч из-за отсутствия визуальной опоры." },
    { icon: <Shield size={32} />, title: "Угроза безопасности", desc: "Неспособность услышать сигналы тревоги, сирены или предупреждающие крики в шумной среде." },
    { icon: <BookOpen size={32} />, title: "Потеря знаний", desc: "Сложность восприятия лекций и образовательного контента в реальном времени." }
];

const FEATURES = [
    {
        icon: <Mic size={28} />,
        title: "Живые субтитры",
        desc: "Мгновенное распознавание речи прямо в браузере. Поддержка множества языков и высокая точность.",
        active: true,
        badge: "Web Speech API"
    },
    {
        icon: <BellRing size={28} />,
        title: "Детектор звуков",
        desc: "Умный ИИ распознаёт сирены, лай собак, звонки в дверь и оповещает вас визуально.",
        active: true,
        badge: "AI Powered"
    },
    {
        icon: <BookMarked size={28} />,
        title: "Режим учёбы",
        desc: "Записывайте лекции и получайте готовые конспекты и тезисы с помощью xAI Grok.",
        active: true,
        badge: "Grok Beta"
    },
    {
        icon: <AlertTriangle size={28} />,
        title: "SOS Система",
        desc: "Экстренная кнопка для мгновенной отправки геолокации и уведомления близким.",
        active: true,
        badge: "Мгновенно"
    }
];

const STEPS = [
    { id: "01", title: "Создайте аккаунт", desc: "Простая регистрация за считанные секунды через email." },
    { id: "02", title: "Разрешите доступ", desc: "Включите микрофон в браузере — установка не требуется." },
    { id: "03", title: "Видьте звуки", desc: "Получайте текст и уведомления в реальном времени." }
];

const TECH_BADGES = [
    { name: "Web Speech API", color: "#3b82f6" },
    { name: "xAI Grok", color: "#0ea5e9" },
    { name: "React", color: "#61dafb" },
    { name: "Python FastAPI", color: "#05998b" },
    { name: "WebSockets", color: "#7c3aed" }
];

export default function Landing({ setAppState, setAuthError, setAuthSuccess }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollRef = useRef([]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        // Intersection Observer for fade-in animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                }
            });
        }, { threshold: 0.1 });

        const elements = document.querySelectorAll('.reveal');
        elements.forEach(el => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            elements.forEach(el => observer.unobserve(el));
        };
    }, []);

    const goLogin = () => { setAppState('login'); window.scrollTo(0, 0); };
    const goRegister = () => { setAppState('register'); window.scrollTo(0, 0); };
    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    return (
        <div className="hlp-wrapper">
            {/* --- HEADER --- */}
            <header className={`hlp-header ${isScrolled ? 'hlp-header--blur' : ''}`}>
                <div className="hlp-container hlp-header__content">
                    <div className="hlp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="hlp-brand__icon">
                            <Mic size={24} color="#3b82f6" />
                        </div>
                        <span className="hlp-brand__name">Hearless</span>
                    </div>

                    <nav className={`hlp-nav-desktop ${isMenuOpen ? 'hlp-nav-mobile--open' : ''}`}>
                        <button onClick={() => scrollTo('features')} className="hlp-nav-link">Возможности</button>
                        <button onClick={() => scrollTo('how')} className="hlp-nav-link">Как это работает</button>
                        <button onClick={() => scrollTo('problem')} className="hlp-nav-link">Проблема</button>
                        <div className="hlp-nav-divider"></div>
                        <button onClick={goLogin} className="hlp-btn-ghost">Войти</button>
                        <button onClick={goRegister} className="hlp-btn-primary">Начать бесплатно</button>
                    </nav>

                    <button className="hlp-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* --- HERO --- */}
            <section className="hlp-hero" style={{ position: 'relative', overflow: 'hidden', padding: '12rem 0 8rem' }}>
                <div className="hlp-hero__bg-effects">
                    <div className="hlp-blob hlp-blob--1" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.2))', filter: 'blur(80px)', width: '600px', height: '600px', position: 'absolute', top: '-100px', right: '-100px', borderRadius: '50%', zIndex: 0 }}></div>
                    <div className="hlp-blob hlp-blob--2" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(6, 182, 212, 0.1))', filter: 'blur(100px)', width: '500px', height: '500px', position: 'absolute', bottom: '-100px', left: '-100px', borderRadius: '50%', zIndex: 0 }}></div>
                </div>

                <div className="hlp-container hlp-hero__content reveal" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div className="hlp-hero__badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.6rem 1.25rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.2)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)' }}>
                        <Zap size={16} className="hlp-pulse-icon" style={{ animation: 'pulse 2s infinite' }} />
                        <span>Новая эра доступности с Грок ИИ</span>
                    </div>

                    <h1 className="hlp-hero__title" style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '1.5rem', color: '#0f172a' }}>
                        Слышать мир<br /><span className="hlp-text-gradient" style={{ background: 'linear-gradient(135deg, #3b82f6, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>через интерфейс</span>
                    </h1>

                    <p className="hlp-hero__desc" style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
                        Hearless превращает окружающие звуки, лекции и видео в визуальный поток информации. Почувствуйте свободу общения без границ.
                    </p>

                    <div className="hlp-hero__actions" style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={goRegister} className="hlp-btn-primary hlp-btn--xl" style={{ padding: '1.1rem 2.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, #0f172a, #334155)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'transform 0.2s' }}>
                            Начать бесплатно <ChevronRight size={20} />
                        </button>
                        <button onClick={() => scrollTo('features')} className="hlp-btn-secondary hlp-btn--xl" style={{ padding: '1.1rem 2.5rem', borderRadius: '16px', background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}>
                            Посмотреть демо
                        </button>
                    </div>

                    <div className="hlp-hero__visual reveal" style={{ marginTop: '5rem', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120%', height: '120%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)', zIndex: -1 }}></div>
                        <div className="hlp-wave-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '120px' }}>
                            {[...Array(30)].map((_, i) => (
                                <div key={i} className="hlp-wave-bar" style={{ width: '6px', background: 'linear-gradient(to top, #3b82f6, #2dd4bf)', borderRadius: '10px', height: `${10 + Math.random() * 90}%`, animation: `wave 1.5s ease-in-out infinite alternate`, animationDelay: `${i * 0.05}s` }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PROBLEM --- */}
            <section id="problem" className="hlp-section hlp-section--light">
                <div className="hlp-container">
                    <div className="hlp-section-header reveal">
                        <h2 className="hlp-section-title">Мир без преград</h2>
                        <p className="hlp-section-subtitle">Мы решаем реальные проблемы, с которыми сталкиваются миллионы людей каждый день.</p>
                    </div>

                    <div className="hlp-problem-grid">
                        {PROBLEMS.map((p, i) => (
                            <div key={i} className="hlp-problem-card reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                                <div className="hlp-problem-card__icon">{p.icon}</div>
                                <h3 className="hlp-problem-card__title">{p.title}</h3>
                                <p className="hlp-problem-card__desc">{p.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="hlp-stats-banner reveal">
                        <div className="hlp-stats-banner__content">
                            <span className="hlp-stats-number">430 000 000+</span>
                            <p className="hlp-stats-label">людей в мире живут с потерей слуха. Мы создаем технологии, чтобы быть рядом.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES --- */}
            <section id="features" className="hlp-section">
                <div className="hlp-container">
                    <div className="hlp-section-header reveal">
                        <h2 className="hlp-section-title">Возможности Hearless</h2>
                        <p className="hlp-section-subtitle">Сочетание передовых браузерных технологий и искусственного интеллекта.</p>
                    </div>

                    <div className="hlp-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} className="hlp-feature-card reveal" style={{ background: '#fff', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', transitionDelay: `${i * 0.1}s` }}>
                                <div className="hlp-feature-card__badge" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', border: '1px solid #e2e8f0' }}>{f.badge}</div>
                                <div className="hlp-feature-card__icon" style={{ width: '56px', height: '56px', background: '#eff6ff', color: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>{f.icon}</div>
                                <h3 className="hlp-feature-card__title" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>{f.title}</h3>
                                <p className="hlp-feature-card__desc" style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>{f.desc}</p>
                                <div className="hlp-feature-card__check" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>
                                    <CheckCircle2 size={16} /> Доступно в бета
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section id="how" className="hlp-section hlp-section--alt">
                <div className="hlp-container">
                    <div className="hlp-section-header reveal">
                        <h2 className="hlp-section-title">Три шага к доступности</h2>
                        <p className="hlp-section-subtitle">Начать использовать Hearless проще, чем кажется.</p>
                    </div>

                    <div className="hlp-steps-container">
                        {STEPS.map((s, i) => (
                            <div key={i} className="hlp-step-item reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
                                <div className="hlp-step-item__number">{s.id}</div>
                                <div className="hlp-step-item__content">
                                    <h3 className="hlp-step-item__title">{s.title}</h3>
                                    <p className="hlp-step-item__desc">{s.desc}</p>
                                </div>
                                {i < STEPS.length - 1 && <div className="hlp-step-connector"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- TECH --- */}
            <section className="hlp-section">
                <div className="hlp-container reveal">
                    <div className="hlp-tech-stack">
                        <span className="hlp-tech-stack__label">Используемые технологии:</span>
                        <div className="hlp-tech-grid">
                            {TECH_BADGES.map((t, i) => (
                                <div key={i} className="hlp-tech-badge" style={{ "--accent-color": t.color }}>
                                    {t.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA --- */}
            <section className="hlp-cta">
                <div className="hlp-container">
                    <div className="hlp-cta__glass reveal">
                        <h2 className="hlp-cta__title">Попробуйте Hearless сегодня</h2>
                        <p className="hlp-cta__desc">Безопасная, быстрая и полностью бесплатная платформа для повседневной жизни.</p>
                        <div className="hlp-cta__group">
                            <button onClick={goRegister} className="hlp-btn-primary hlp-btn--xl">Начать сейчас</button>
                            <button onClick={() => window.open('https://github.com', '_blank')} className="hlp-btn-ghost hlp-btn--xl">
                                <Github size={20} /> GitHub
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="hlp-footer">
                <div className="hlp-container">
                    <div className="hlp-footer__main">
                        <div className="hlp-footer__brand">
                            <div className="hlp-brand">
                                <div className="hlp-brand__icon">
                                    <Mic size={20} color="#3b82f6" />
                                </div>
                                <span className="hlp-brand__name">Hearless</span>
                            </div>
                            <p className="hlp-footer__slogan">Технологии без барьеров для каждого.</p>
                        </div>

                        <div className="hlp-footer__links">
                            <div className="hlp-footer__col">
                                <h4>Продукт</h4>
                                <button onClick={() => scrollTo('features')}>Возможности</button>
                                <button onClick={() => scrollTo('how')}>Инструкция</button>
                                <button onClick={goLogin}>Бета-тест</button>
                            </div>
                            <div className="hlp-footer__col">
                                <h4>Компания</h4>
                                <button>О нас</button>
                                <button>Безопасность</button>
                                <button>Контакты</button>
                            </div>
                        </div>
                    </div>

                    <div className="hlp-footer__bottom">
                        <p>© 2026 Hearless. Все права защищены. Сделано с любовью к инклюзивности.</p>
                        <div className="hlp-footer__social">
                            <Globe size={18} />
                            <Github size={18} />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

