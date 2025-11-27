import { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import MordeczkiAsset from '../assets/mordeczki4.riv';

const STATE_MACHINE_NAME = 'State Machine 1';

const CONTROL_DEFINITIONS = [
  { name: 'kolorSkory', limit: 3 },
  { name: 'kolorWlosow', limit: 4 },
  { name: 'usta', limit: 3 },
  { name: 'dodatek', limit: 5 },
  { name: 'twarz', limit: 4 },
  { name: 'wlosy', limit: 9 },
];

function CharacterMarker({ character, name }) {
  const { rive, RiveComponent } = useRive({
    src: MordeczkiAsset,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
  });

  const inputs = CONTROL_DEFINITIONS.map(({ name: controlName }) =>
    useStateMachineInput(rive, STATE_MACHINE_NAME, controlName, 0),
  );

  useEffect(() => {
    CONTROL_DEFINITIONS.forEach(({ name: controlName, limit }, index) => {
      const input = inputs[index];
      const nextValue = Number(character?.[controlName]);

      if (!Number.isNaN(nextValue) && input) {
        const boundedValue = Math.min(Math.max(nextValue, 0), limit - 1);
        input.value = boundedValue;
      }
    });
  }, [character, inputs]);

  return (
    <div className="map-marker__icon" title={name} aria-label={name}>
      <RiveComponent style={{ width: 72, height: 72 }} />
    </div>
  );
}

export default CharacterMarker;
