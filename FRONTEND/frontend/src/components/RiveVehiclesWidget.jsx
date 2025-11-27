import Rive from '@rive-app/react-canvas';

function RiveVehiclesWidget() {
  return (
    <div className="rive-widget">
      <div className="rive-widget__header">
        <p className="badge">Rive runtime</p>
        <div>
          <h3>Podgląd animacji pojazdów</h3>
          <p className="muted">Stan maszyny "bumpy" steruje animacją w czasie rzeczywistym.</p>
        </div>
      </div>

      <div className="rive-widget__player" role="img" aria-label="Animacja pojazdów w Rive">
        <Rive src="https://cdn.rive.app/animations/vehicles.riv" stateMachines="bumpy" />
      </div>

      <div className="rive-widget__footer">
        <p className="muted">
          Rive React Canvas korzysta z silnika renderującego na bazie <strong>canvas</strong> i wspiera interaktywne
          state machine z plików <code>.riv</code>.
        </p>
        <a
          className="ghost-button"
          href="https://cdn.rive.app/animations/vehicles.riv"
          target="_blank"
          rel="noreferrer"
        >
          Podgląd pliku
        </a>
      </div>
    </div>
  );
}

export default RiveVehiclesWidget;
