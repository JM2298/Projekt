import { useMemo, useState } from 'react';

function RegisterPage() {
  const [formData, setFormData] = useState({ email: '', password: '', confirm: '', name: '' });
  const [status, setStatus] = useState({ type: 'info', message: 'Uzupełnij dane, aby utworzyć konto.' });

  const isFormValid = useMemo(() => {
    return (
      formData.email.trim() !== '' &&
      formData.password.trim() !== '' &&
      formData.confirm.trim() !== '' &&
      formData.password === formData.confirm
    );
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isFormValid) {
      setStatus({ type: 'error', message: 'Hasła muszą być zgodne, a pola wypełnione.' });
      return;
    }
    setStatus({ type: 'success', message: 'Formularz wygląda dobrze. Tutaj podłącz API rejestracji.' });
  };

  return (
    <div className="form-shell">
      <div className="card">
        <p className="badge">Nowa rejestracja</p>
        <h1>Utwórz konto</h1>
        <p className="subtitle">Przygotowana sekcja do integracji z API rejestracji użytkowników.</p>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Imię lub nazwa</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Twoje imię"
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="podaj email"
              required
            />
          </label>

          <div className="grid-two">
            <label className="field">
              <span>Hasło</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="wpisz hasło"
                required
              />
            </label>
            <label className="field">
              <span>Powtórz hasło</span>
              <input
                type="password"
                name="confirm"
                value={formData.confirm}
                onChange={handleChange}
                placeholder="powtórz hasło"
                required
              />
            </label>
          </div>

          <button type="submit" className="primary" disabled={!isFormValid}>
            Utwórz konto
          </button>
        </form>

        <div className="status" data-variant={status.type}>
          <span>{status.message}</span>
          {formData.password !== formData.confirm && (
            <small>Hasła nie są takie same.</small>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
