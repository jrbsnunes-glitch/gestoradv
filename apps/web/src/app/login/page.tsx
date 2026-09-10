'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, Lock, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import './login.css';

const REMEMBER_KEY = 'gadv_login_remember';

type Remembered = { tenantSlug: string; username: string };

function readRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Remembered;
    if (typeof parsed?.tenantSlug === 'string' && typeof parsed?.username === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [tenantSlug, setTenantSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const stored = readRemembered();
    if (!stored) return;
    setTenantSlug(stored.tenantSlug);
    setUsername(stored.username);
    setRemember(true);
  }, []);

  useEffect(() => {
    if (remember) return;
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  }, [remember]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const slug = tenantSlug.trim();
      const user = username.trim().toLowerCase();
      const result = await api.post<{ access_token: string; user: { id: string; email: string; role: string } }>(
        '/auth/login',
        {
          tenantSlug: slug,
          username: user,
          password,
        },
      );
      if (remember) {
        try {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ tenantSlug: slug, username: user }));
        } catch {
          /* ignore */
        }
      }
      localStorage.setItem('tenant_slug', slug);
      login(result.access_token, result.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        setError('Não foi possível conectar à API. Verifique se o servidor está rodando (porta 3001).');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-hero">
          <div className="login-hero-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="login-hero-logo" src="/logo.png" alt="GestorAdv" decoding="async" />
          </div>
          <h1 className="login-hero-title">Gestão inteligente para seu escritório</h1>
          <p className="login-hero-text">
            Processos, prazos, clientes e financeiro em um só lugar — com automação e IA integrada.
          </p>
        </aside>

        <div className="login-card">
          <div className="login-mobile-hero">
            <div className="login-hero-mark login-hero-mark--mobile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="login-mobile-logo" src="/logo.png" alt="GestorAdv" decoding="async" />
            </div>
          </div>

          <div className="login-card-body">
            <div className="login-brand-copy">
              <h2>Bem-vindo ao GestorAdv</h2>
              <p className="login-subtitle">
                Entre com a abreviatura do escritório, usuário e senha.
              </p>
            </div>

            <form onSubmit={submit}>
              <div className="login-field">
                <label htmlFor="tenant">Escritório</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden>
                    <Building2 size={18} />
                  </span>
                  <input
                    id="tenant"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    required
                    autoComplete="organization"
                    placeholder="ex.: gestoradv"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="username">Usuário</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden>
                    <User size={18} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    minLength={2}
                    spellCheck={false}
                    placeholder="ex.: admin"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">Senha</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden>
                    <Lock size={18} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Lembrar-me</span>
              </label>

              {error && <div className="login-alert-error">{error}</div>}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
