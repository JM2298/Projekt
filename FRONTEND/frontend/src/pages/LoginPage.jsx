import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_HOST, apiRequest } from '../api/client.js';
import JokerImg from '../assets/joker_logo.png';
import GrzybnyImg from '../assets/grzybny.png';

const LOGIN_PATH = '/joker-login-api/login/';
const LOGIN_ENDPOINT = `${API_HOST}${LOGIN_PATH}`;

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: 'info', message: 'Wprowadź dane logowania.' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokens, setTokens] = useState({ access: null, refresh: null });
  const navigate = useNavigate();

  const isFormValid = useMemo(
    () => email.trim() !== '' && password.trim() !== '',
    [email, password]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setStatus({ type: 'info', message: 'Trwa logowanie...' });

    try {
      const response = await apiRequest(
        LOGIN_PATH,
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        { useAuth: false }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Nieprawidłowe dane logowania.');
      }

      const { access, refresh } = data;

      if (access && refresh) {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        setTokens({ access, refresh });
        setStatus({ type: 'success', message: 'Zalogowano. Przekierowuję na mapę...' });
        navigate('/map', { replace: true });
      } else {
        setStatus({ type: 'warning', message: 'Brak tokenów w odpowiedzi.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Wystąpił błąd podczas logowania.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout login-layout">
      <div className="login-card card">
        <div className="login-card__header">
          <div className="login-hero">
            <p className="badge">Nowy ekran logowania</p>
            <h1>Zaloguj się</h1>
            <p className="subtitle">Uzyskaj dostęp do panelu Joker, korzystając z dedykowanego API.</p>

            <div className="login-meta">
              <div className="login-meta__item">
                <small>Host API</small>
                <strong>{API_HOST}</strong>
              </div>
              <div className="login-meta__item">
                <small>Ścieżka logowania</small>
                <strong>{LOGIN_PATH}</strong>
              </div>
              <div className="login-meta__item">
                <small>Status formularza</small>
                <strong className="pill pill-outline">{isFormValid ? 'Przyjmie dane' : 'Uzupełnij pola'}</strong>
              </div>
            </div>
          </div>

          <div className="login-graphic">
            <img src={JokerImg} alt="Logo Joker" className="login-graphic__badge" />
          </div>
        </div>

        <div className="login-card__body">
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Wpisz adres e-mail"
                required
              />
              <small className="field__hint">Użyj adresu powiązanego z Twoim kontem.</small>
            </label>

            <label className="field">
              <span>Hasło</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wpisz hasło"
                required
              />
              <small className="field__hint">Hasło nigdy nie jest przechowywane na serwerze w postaci jawnej.</small>
            </label>

            <button type="submit" className="primary" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <div className="status status--inline" data-variant={status.type}>
            <div>
              <p className="status__label">{status.message}</p>
              <small>Połączenie z <strong>{LOGIN_ENDPOINT}</strong></small>
            </div>
            <span className="status__dot" aria-hidden />
          </div>

          {tokens.access && (
            <div className="tokens">
              <div className="token-pill">
                <p className="token-label">Access token</p>
                <p className="token-value">{tokens.access}</p>
              </div>
              <div className="token-pill">
                <p className="token-label">Refresh token</p>
                <p className="token-value">{tokens.refresh}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="info-column">
        <div className="card" style={{ marginBottom: '1rem', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ flex: '1 1 60%' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Nie masz konta?</p>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>Zarejestruj się, aby korzystać z mapy i czatu.</p>

              <button
                style={{ marginTop: '1rem', padding: '0.75rem 1.25rem', fontSize: '1rem' }}
                type="button"
                className="primary-button"
                onClick={() => navigate('/register')}
              >
                Zarejestruj się
              </button>
            </div>

            <div style={{ flex: '0 0 150px', display: 'flex', justifyContent: 'center' }}>
              <img src={GrzybnyImg} alt="Grzybny" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        <aside
          className="info-panel card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          <div>
            <div className="info-panel__title">Szybkie informacje</div>
            <div className="info-grid" style={{ marginTop: '0.5rem' }}>
              <div className="info-chip">
                <p className="info-chip__label">Aktualny host</p>
                <p className="info-chip__value">{API_HOST}</p>
              </div>
              <div className="info-chip">
                <p className="info-chip__label">Ścieżka logowania</p>
                <p className="info-chip__value">{LOGIN_PATH}</p>
              </div>
              <div className="info-chip">
                <p className="info-chip__label">Formularz gotowy</p>
                <p className="info-chip__value">{isFormValid ? 'Tak' : 'Nie'}</p>
              </div>
              <div className="info-chip">
                <p className="info-chip__label">Tokeny w pamięci</p>
                <p className="info-chip__value">{tokens.access ? 'Tak' : 'Nie'}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div className="callout">
              <p className="callout__label">Pełny endpoint</p>
              <a className="callout__link" href={LOGIN_ENDPOINT} target="_blank" rel="noreferrer">
                {LOGIN_ENDPOINT}
              </a>
            </div>

            <ul className="info-list" style={{ marginTop: '0.75rem' }}>
              <li>W trakcie wysyłania: <strong>{isSubmitting ? 'Tak' : 'Nie'}</strong></li>
              <li>Oczekiwane pola odpowiedzi: <strong>access</strong>, <strong>refresh</strong></li>
              <li>Magazyn tokenów: <strong>localStorage</strong></li>
            </ul>
          </div>
        </aside>
      </aside>
    </div>
  );
}

export default LoginPage;
