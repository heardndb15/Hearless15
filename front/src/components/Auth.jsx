import React from 'react';
import { User as UserIcon, Lock, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function Auth({
    appState, setAppState,
    authError, setAuthError,
    authSuccess, setAuthSuccess,
    authUsername, setAuthUsername,
    authPassword, setAuthPassword,
    handleAuth,
    isAuthLoading
}) {
    const s = {
        container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative', overflow: 'hidden' },
        blob1: { position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', filter: 'blur(80px)', borderRadius: '50%', opacity: 0.15, zIndex: 0 },
        blob2: { position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', filter: 'blur(80px)', borderRadius: '50%', opacity: 0.1, zIndex: 0 },
        card: { background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)', width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', position: 'relative', zIndex: 1, textAlign: 'center' },
        logoBox: { width: '80px', height: '80px', background: '#fff', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 20px rgba(0,0,0,0.04)', fontSize: '2.5rem' },
        title: { fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', marginBottom: '0.5rem' },
        subtitle: { color: '#64748b', fontSize: '1rem', marginBottom: '2.5rem' },
        form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
        inputGroup: { position: 'relative' },
        inputIcon: { position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
        input: { width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', color: '#0f172a' },
        btnSubmit: { width: '100%', padding: '1.1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.75rem', transition: 'transform 0.2s' },
        btnGhost: { background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', padding: '0.5rem', marginTop: '1.5rem' },
        btnBack: { position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', fontSize: '0.9rem' },
        alert: { padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }
    };

    return (
        <div style={s.container}>
            <div style={s.blob1} />
            <div style={s.blob2} />

            <button style={s.btnBack} onClick={() => { setAppState('landing'); setAuthError(''); setAuthSuccess(''); }}>
                <ArrowLeft size={16} /> На главную
            </button>

            <div style={s.card}>
                <div style={s.logoBox}>👂</div>
                <h1 style={s.title}>Hearless</h1>
                <p style={s.subtitle}>
                    {appState === 'login' ? 'Добро пожаловать обратно' : 'Эффективное обучение для всех'}
                </p>

                {authError && <div style={{ ...s.alert, background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }}>{authError}</div>}
                {authSuccess && <div style={{ ...s.alert, background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }}>{authSuccess}</div>}

                <form onSubmit={handleAuth} style={s.form}>
                    <div style={s.inputGroup}>
                        <UserIcon size={18} style={s.inputIcon} />
                        <input
                            type="text"
                            placeholder="Имя пользователя"
                            style={{ ...s.input, borderColor: authError ? '#fecaca' : '#e2e8f0' }}
                            value={authUsername}
                            onChange={e => setAuthUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div style={s.inputGroup}>
                        <Lock size={18} style={s.inputIcon} />
                        <input
                            type="password"
                            placeholder="Пароль"
                            style={{ ...s.input, borderColor: authError ? '#fecaca' : '#e2e8f0' }}
                            value={authPassword}
                            onChange={e => setAuthPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        style={{ ...s.btnSubmit, opacity: isAuthLoading ? 0.7 : 1, transform: isAuthLoading ? 'none' : 'scale(1)' }}
                        disabled={isAuthLoading}
                    >
                        {isAuthLoading ? (
                            <Loader2 size={20} style={{ animation: 'spin 2s linear infinite' }} />
                        ) : (
                            <>
                                {appState === 'login' ? 'Войти в аккаунт' : 'Зарегистрироваться'}
                                <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                        style={s.btnGhost}
                        onClick={() => { setAppState(appState === 'login' ? 'register' : 'login'); setAuthError(''); setAuthSuccess(''); }}
                    >
                        {appState === 'login' ? 'Ещё нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
                    </button>
                </div>
            </div>
        </div>
    );
}
