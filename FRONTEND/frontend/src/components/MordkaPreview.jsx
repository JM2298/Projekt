import { useEffect, useMemo } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import MordeczkiAsset from '../assets/mordeczki4.riv';

const STATE_MACHINE_NAME = 'State Machine 1';

const CONTROL_LIMITS = {
  kolorSkory: 3,
  kolorWlosow: 4,
  usta: 3,
  dodatek: 5,
  twarz: 4,
  wlosy: 9,
};

function normalizeConfig(rawConfig) {
  if (!rawConfig) return {};

  if (typeof rawConfig === 'string') {
    try {
      const normalized = rawConfig.replace(/'/g, '"');
      return JSON.parse(normalized);
    } catch (error) {
      console.error('Nie udało się sparsować konfiguracji Mordki:', error);
      return {};
    }
  }

  if (typeof rawConfig === 'object' && !Array.isArray(rawConfig)) {
    return rawConfig;
  }

  return {};
}

function MordkaPreview({ config, size = 160, className = '' }) {
  const parsedConfig = useMemo(() => normalizeConfig(config), [config]);

  const { rive, RiveComponent } = useRive({
    src: MordeczkiAsset,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
  });

  const inputs = Object.keys(CONTROL_LIMITS).map((key) =>
    useStateMachineInput(rive, STATE_MACHINE_NAME, key, 0),
  );

  useEffect(() => {
    Object.entries(CONTROL_LIMITS).forEach(([key, limit], index) => {
      const input = inputs[index];
      const rawValue = parsedConfig?.[key];

      if (typeof rawValue === 'number' && input) {
        const clamped = Math.min(Math.max(rawValue, 0), limit - 1);
        input.value = clamped;
      }
    });
  }, [inputs, parsedConfig]);

  return (
    <div className={`mordka-preview ${className}`.trim()}>
      <div className="mordka-preview__canvas" role="img" aria-label="Mordka znajomego">
        <RiveComponent style={{ width: size, height: size }} />
      </div>
    </div>
  );
}

export default MordkaPreview;
