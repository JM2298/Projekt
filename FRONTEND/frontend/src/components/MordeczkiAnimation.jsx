import { useEffect, useMemo } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { apiRequest } from '../api/client';
import MordeczkiAsset from '../assets/mordeczki4.riv';

const STATE_MACHINE_NAME = 'State Machine 1';
const PROFILE_ENDPOINT = '/joker-login-api/me/';

function MordeczkiAnimation({ values = {}, onChange, labels = {}, disabled }) {
  const { rive, RiveComponent } = useRive({
    src: MordeczkiAsset,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
  });

  const controls = useMemo(
    () => [
      { name: 'kolorSkory', limit: 3, label: 'Kolor skóry' },
      { name: 'kolorWlosow', limit: 4, label: 'Kolor włosów' },
      { name: 'usta', limit: 3, label: 'Usta' },
      { name: 'dodatek', limit: 5, label: 'Dodatek' },
      { name: 'twarz', limit: 4, label: 'Twarz' },
      { name: 'wlosy', limit: 9, label: 'Włosy' },
    ],
    [],
  );

  const inputs = controls.map(({ name }) =>
    useStateMachineInput(rive, STATE_MACHINE_NAME, name, 0),
  );

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await apiRequest(PROFILE_ENDPOINT);
        if (!response.ok) {
          throw new Error('Nie udało się pobrać danych użytkownika.');
        }

        const data = await response.json();
        const character = data?.charakter;

        controls.forEach(({ name, limit }, index) => {
          const input = inputs[index];
          const nextValue = Number(character?.[name]);

          if (!Number.isNaN(nextValue) && input) {
            const boundedValue = Math.min(Math.max(nextValue, 0), limit - 1);
            input.value = boundedValue;
            onChange?.(name, boundedValue);
          }
        });
      } catch (error) {
        console.error('Błąd pobierania charakteru Mordeczki:', error);
      }
    };

    fetchCharacter();
  }, [controls, inputs, onChange]);

  useEffect(() => {
    controls.forEach(({ name }, index) => {
      const input = inputs[index];
      const nextValue = values[name];

      if (typeof nextValue === 'number' && input && input.value !== nextValue) {
        input.value = nextValue;
      }
    });
  }, [controls, inputs, values]);

  const cycleInput = (index, limit) => {
    const input = inputs[index];
    if (!input) return;

    const current = typeof input.value === 'number' ? input.value : 0;
    const next = (current + 1) % limit;

    input.value = next;
    const name = controls[index].name;
    onChange?.(name, next);
  };

  return (
    <div className="mordeczki-player" data-state={disabled ? 'loading' : 'ready'}>
      <div className="mordeczki-player__canvas" role="img" aria-label="Animacja Mordeczki">
        <RiveComponent style={{ width: 480, height: 360 }} />
      </div>

      <div className="mordeczki-player__controls" aria-label="Sterowanie Mordeczki">
        {controls.map(({ label, limit, name }, index) => (
          <button
            key={label}
            type="button"
            onClick={() => cycleInput(index, limit)}
            disabled={!inputs[index] || disabled}
            className="mordeczki-player__control"
          >
            <span className="control-label">{labels[name] ?? label}</span>
            <span className="control-meta">
              {(typeof values[name] === 'number' ? values[name] : 0) + 1} z {limit}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MordeczkiAnimation;
