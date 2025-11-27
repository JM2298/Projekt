import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import MordeczkiAnimation from '../components/MordeczkiAnimation';

const PROFILE_ENDPOINT = '/joker-login-api/me/';

const defaultCharacter = {
  kolorSkory: 0,
  kolorWlosow: 0,
  usta: 0,
  dodatek: 0,
  twarz: 0,
  wlosy: 0,
};

function SettingsPage() {
  const [character, setCharacter] = useState(defaultCharacter);
  const [nickname, setNickname] = useState('');
  const [opis, setOpis] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('dostępny');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const getCurrentCoordinates = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 5,
        },
      );
    });

  const optionLimits = {
    kolorSkory: 3,
    kolorWlosow: 4,
    usta: 3,
    dodatek: 5,
    twarz: 4,
    wlosy: 9,
  };

  const controlLabels = {
    kolorSkory: 'Kolor skóry',
    kolorWlosow: 'Kolor włosów',
    usta: 'Usta',
    dodatek: 'Dodatek',
    twarz: 'Twarz',
    wlosy: 'Włosy',
  };

  useEffect(() => {
    const fetchUserAvatar = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest(PROFILE_ENDPOINT);

        if (!response.ok) {
          throw new Error('Nie udało się pobrać danych użytkownika.');
        }

        const data = await response.json();
        const storedCooldown = Number(localStorage.getItem('nicknameCooldownUntil') ?? 0);
        const infoMessages = [];

        if (!data.character) {
          setCharacter(defaultCharacter);
          infoMessages.push('Brak zapisanej Mordeczki – uzupełnij wygląd i zapisz ustawienia.');
        } else {
          setCharacter(data.character);
        }

        if (!data.display_name) {
          setNickname('');
          infoMessages.push('Brak ustawionej nazwy użytkownika – dodaj ją, aby zapisać profil.');
        } else {
          setNickname(data.display_name);
        }

        setAvailabilityStatus(data.status || 'dostępny');
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
        setOpis(data.opis ?? '');
        setNotificationsEnabled(Boolean(data.notifications ?? true));
        localStorage.setItem('nicknameCooldownUntil', `${data.cooldownUntil ?? storedCooldown}`);
        setInfo(infoMessages.join(' ') || 'Pobrano ustawienia Mordeczki z API.');
      } catch (error) {
        setInfo(error.message || 'Wystąpił błąd podczas pobierania ustawień.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAvatar();
  }, []);

  const handleAnimationChange = (name, value) => {
    setCharacter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveNotificationPreference = (value) => {
    setNotificationsEnabled(value);
    localStorage.setItem('notificationsEnabled', value ? 'true' : 'false');
  };

  const handleNicknameHistory = (nextNickname) => {
    const now = Date.now();
    const cooldownUntil = Number(localStorage.getItem('nicknameCooldownUntil') ?? 0);

    if (cooldownUntil > now && nextNickname !== nickname) {
      const minutesLeft = Math.ceil((cooldownUntil - now) / 60000);
      return `Możesz zmienić nick za ${minutesLeft} min.`;
    }

    const newCooldown = now + 10 * 60 * 1000; // 10 minut na kolejną zmianę.
    localStorage.setItem('nicknameCooldownUntil', `${newCooldown}`);
    return 'Zapisano zmiany nazwy użytkownika.';
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      setInfo('Wpisz nazwę użytkownika, aby zapisać zmiany.');
      return;
    }

    if (!opis.trim()) {
      setInfo('Dodaj opis, aby inni wiedzieli kim jesteś.');
      return;
    }

    const nicknameStatus = handleNicknameHistory(nickname.trim());
    setIsLoading(true);

    try {
      const coords = await getCurrentCoordinates();

      if (coords) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
      }

      const latitudeToSave = coords?.latitude ?? latitude;
      const longitudeToSave = coords?.longitude ?? longitude;


      // debug: print coordinates before sending to API
      console.log('Saving coordinates:', { latitude: latitudeToSave, longitude: longitudeToSave });


      const payload = {
        display_name: nickname.trim(),
        opis: opis.trim(),
        status: availabilityStatus,
        //notifications: notificationsEnabled,
        latitude: latitudeToSave,
        longitude: longitudeToSave,
        character: {
          kolorSkory: character.kolorSkory,
          kolorWlosow: character.kolorWlosow,
          usta: character.usta,
          dodatek: character.dodatek,
          twarz: character.twarz,
          wlosy: character.wlosy,
        },
      };

      const response = await apiRequest(PROFILE_ENDPOINT, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Nie udało się zapisać ustawień. Spróbuj ponownie.');
      }

      const data = await response.json();
      setCharacter(data.character ?? payload.character);
      setLatitude(data.latitude ?? latitudeToSave);
      setLongitude(data.longitude ?? longitudeToSave);
      setInfo(nicknameStatus || 'Zapisano ustawienia Mordeczki.');
      localStorage.setItem('mordeczkaDraft', JSON.stringify(payload));
    } catch (error) {
      setInfo(error.message || 'Wystąpił błąd podczas zapisywania ustawień.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <p className="badge">Ustawienia</p>
      <h1>Panel kreatora Mordeczki</h1>
      <p className="subtitle">
        Odwzoruj logikę znaną z aplikacji Flutter: edytuj avatar, opis oraz opcje dodatkowe.
      </p>

      <div className="settings-grid">
        <section className="setting-block">
          <div className="setting-header">
            <h3>Profil</h3>
            <p>Uzupełnij nazwę i opis widoczny dla innych użytkowników.</p>
          </div>
          <div className="stack">
            <label className="field">
              <span>Nazwa (nickname)</span>
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Wpisz swoją nazwę"
              />
            </label>
            <label className="field">
              <span>Opis profilu</span>
              <input
                type="text"
                value={opis}
                onChange={(event) => setOpis(event.target.value)}
                placeholder="Wpisz swój opis"
              />
            </label>
            <div className="status" data-variant="warning">
              <strong>Dodatkowe ustawienia</strong>
              <p>
                Powiadomienia i usuwanie konta dostępne są w sekcji dialogu inspirowanej przyciskiem
                "inne ustawienia" z Fluttera.
              </p>
              <div className="actions-row">
                <button className="ghost-button" type="button" onClick={() => setShowDialog(true)}>
                  Otwórz ustawienia
                </button>
              </div>
            </div>

            <div className="status status--inline" data-variant="info">
              <div className="setting-header">
                <h4>Status dostępności</h4>
                <p>Określ, czy Twoja Mordeczka jest widoczna jako dostępna na mapie.</p>
              </div>
              <div className="status-toggle" role="group" aria-label="Status dostępności">
                {[
                  { value: 'dostępny', label: 'Dostępny' },
                  { value: 'niedostępny', label: 'Niedostępny' },
                ].map((option) => {
                  const isActive = availabilityStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`pill ${isActive ? '' : 'pill-outline'}`}
                      aria-pressed={isActive}
                      onClick={() => setAvailabilityStatus(option.value)}
                      disabled={isLoading}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="setting-block">
          <div className="setting-header">
            <h3>Mordeczka</h3>
            <p>
              Od teraz możesz sterować Mordeczką bezpośrednio z podglądem Rive. Przyciski pod animacją
              zachowują nazewnictwo i limity znane z aplikacji Flutter.
            </p>
          </div>

          <div className="mordeczki-wrapper">
            <MordeczkiAnimation
              values={character}
              onChange={handleAnimationChange}
              labels={controlLabels}
              disabled={isLoading}
            />

            <div className="status" data-variant="info">
              <div className="setting-header">
                <h4>Podsumowanie wyboru</h4>
                <p>Aktualne wartości zostaną zapisane razem z profilem.</p>
              </div>
              <ul className="mordeczki-summary">
                {Object.entries(optionLimits).map(([key, limit]) => (
                  <li key={key}>
                    <span>{controlLabels[key]}</span>
                    <strong>
                      {character[key] + 1} / {limit}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <div className="status" data-variant={info.includes('Możesz') ? 'warning' : 'success'}>
          <strong>Informacja</strong>
          <p>{info || 'Zmiany nie zostały jeszcze zapisane.'}</p>
        </div>
        <button className="primary" type="button" onClick={handleSave} disabled={isLoading}>
          Zapisz ustawienia
        </button>
      </div>

      {showDialog && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <div className="dialog-card">
            <div className="dialog-header">
              <h3>Dodatkowe ustawienia</h3>
              <button type="button" className="ghost-button" onClick={() => setShowDialog(false)}>
                Zamknij
              </button>
            </div>
            <div className="dialog-body">
              <label className="toggle-row">
                <span>
                  Powiadomienia (po zmianie zaloguj się ponownie)
                  <br />
                  <small>Stan synchronizowany lokalnie tak jak w Flutterze.</small>
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(event) => saveNotificationPreference(event.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </label>

              <div className="danger-zone">
                <div>
                  <strong>Usuwanie konta</strong>
                  <p>
                    Symulacja dialogu potwierdzenia. W prawdziwej aplikacji tutaj następuje wywołanie
                    FirebaseAuth oraz API usuwania.
                  </p>
                </div>
                <button className="danger-button" type="button" onClick={() => setConfirmDelete(true)}>
                  Usuń konto
                </button>
              </div>

              {confirmDelete && (
                <div className="confirm-card">
                  <p>Czy na pewno chcesz usunąć konto?</p>
                  <div className="actions-row">
                    <button className="ghost-button" type="button" onClick={() => setConfirmDelete(false)}>
                      Anuluj
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => setInfo('Konto zostałoby usunięte po stronie serwera.')}
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
