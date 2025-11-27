import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiRequest } from '../api/client.js';
import CharacterMarker from '../components/CharacterMarker.jsx';
import RiveVehiclesWidget from '../components/RiveVehiclesWidget.jsx';

const AVAILABLE_USERS_ENDPOINT = '/joker-login-api/available-users/';
const MAP_ZOOM = 13;
const FRIENDSHIP_ENDPOINT = '/joker-chat-api/joker-chat/friendships/';

const MAP_DEFAULT_CENTER = {
  lat: 52.22977,
  lon: 21.01178,
};

const MARKER_ICON_SIZE = 78;

function useCharacterMapIcon(character, name) {
  const [icon, setIcon] = useState(null);

  useEffect(() => {
    const container = document.createElement('div');
    container.className = 'map-marker';

    const root = createRoot(container);
    root.render(
      <>
        <CharacterMarker character={character} name={name} />
        <p className="map-marker__label">{name}</p>
      </>,
    );

    const divIcon = L.divIcon({
      html: container,
      className: 'map-marker-icon',
      iconSize: [MARKER_ICON_SIZE + 12, MARKER_ICON_SIZE + 40],
      iconAnchor: [MARKER_ICON_SIZE / 2 + 6, MARKER_ICON_SIZE + 18],
      popupAnchor: [0, -(MARKER_ICON_SIZE - 4)],
    });

    setIcon(divIcon);

    return () => {
      root.unmount();
    };
  }, [character, name]);

  return icon;
}

function CharacterMapMarker({ marker }) {
  const { id, name, username, lat, lon, character, opis, distance } = marker;
  const markerIcon = useCharacterMapIcon(character, name);
  const [friendRequestState, setFriendRequestState] = useState({ status: 'idle', message: '' });
  const [friendMessage, setFriendMessage] = useState('');

  if (!markerIcon) return null;

  const handleSendFriendRequest = async () => {
    if (!username) return;

    setFriendRequestState({ status: 'loading', message: '' });

    try {
      const response = await apiRequest(FRIENDSHIP_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          friend_username: username,
          friend_message: friendMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Nie udało się wysłać zaproszenia.');
      }

      setFriendRequestState({ status: 'success', message: 'Zaproszenie wysłane.' });
      setFriendMessage('');
    } catch (apiError) {
      setFriendRequestState({ status: 'error', message: apiError.message });
    }
  };

  return (
    <Marker key={id} position={[lat, lon]} icon={markerIcon} draggable>
      <Popup>
        <div className="map-popup">
          <CharacterMarker character={character} name={name} />
          <div className="map-popup__details">
            <strong>{name}</strong>
            <p className="muted">{opis || 'Brak opisu.'}</p>
            {Number.isFinite(distance) && <p className="muted">{`Dystans: ${distance.toFixed(1)} km`}</p>}
            <p className="muted">{`Pozycja: ${lat.toFixed(4)}, ${lon.toFixed(4)}`}</p>
            <label className="muted" htmlFor={`friend-message-${id}`}>
              Wiadomość do zaproszenia
            </label>
            <textarea
              id={`friend-message-${id}`}
              value={friendMessage}
              onChange={(event) => setFriendMessage(event.target.value)}
              placeholder="Napisz wiadomość do Mordeczki"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <button
              type="button"
              className="primary-button"
              onClick={handleSendFriendRequest}
              disabled={friendRequestState.status === 'loading'}
            >
              Wyślij zaproszenie
            </button>
            {friendRequestState.message && (
              <p
                className="muted"
                style={{ color: friendRequestState.status === 'error' ? 'var(--error)' : 'inherit' }}
              >
                {friendRequestState.message}
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function adjustOverlappingMarkers(markers) {
  const markersByPosition = markers.reduce((groups, marker) => {
    const key = `${marker.lat.toFixed(6)}-${marker.lon.toFixed(6)}`;
    groups[key] = groups[key] || [];
    groups[key].push(marker);
    return groups;
  }, {});

  const SPREAD_RADIUS_METERS = 35;
  const METERS_PER_DEGREE = 111_111;

  return markers.flatMap((marker) => {
    const key = `${marker.lat.toFixed(6)}-${marker.lon.toFixed(6)}`;
    const group = markersByPosition[key];

    if (group.length === 1) return marker;

    const markerIndex = group.findIndex((groupMarker) => groupMarker.id === marker.id);
    const angle = (2 * Math.PI * markerIndex) / group.length;
    const latOffset = (SPREAD_RADIUS_METERS * Math.cos(angle)) / METERS_PER_DEGREE;
    const lonOffset =
      (SPREAD_RADIUS_METERS * Math.sin(angle)) /
      (METERS_PER_DEGREE * Math.cos((marker.lat * Math.PI) / 180));

    return {
      ...marker,
      lat: marker.lat + latOffset,
      lon: marker.lon + lonOffset,
    };
  });
}

function MapBoundsUpdater({ markers, fallbackCenter }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (markers.length === 0) {
      map.setView([fallbackCenter.lat, fallbackCenter.lon], MAP_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lon]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [fallbackCenter.lat, fallbackCenter.lon, map, markers]);

  return null;
}

function MapPage() {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapLoadError, setMapLoadError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await apiRequest(AVAILABLE_USERS_ENDPOINT);

        if (!response.ok) {
          throw new Error('Nie udało się pobrać listy Mordeczek.');
        }

        const data = await response.json();
        setAvailableUsers(data);
        setLastUpdated(new Date());
      } catch (apiError) {
        setError(apiError.message || 'Wystąpił błąd podczas ładowania mapy.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableUsers();
  }, []);

  const availableMarkers = useMemo(() => {
    const markers = availableUsers
      .map((user) => ({
        id: user.id ?? user.username,
        lat: Number(user.latitude),
        lon: Number(user.longitude),
        name: user.display_name || user.username,
        username: user.username,
        opis: user.opis,
        distance: Number.isFinite(Number(user.distance)) ? Number(user.distance) : null,
        character: user.character ?? user.charakter,
      }))
      .filter(
        (marker) =>
          Number.isFinite(marker.lat) && Number.isFinite(marker.lon) && Boolean(marker.character),
      );

    return adjustOverlappingMarkers(markers);
  }, [availableUsers]);

  const mapCenter = useMemo(() => availableMarkers[0] ?? MAP_DEFAULT_CENTER, [availableMarkers]);

  const bannerMessage =
    error ||
    (mapLoadError
      ? 'Nie udało się pobrać kafelków mapy z OpenStreetMap. Spróbuj ponownie za chwilę.'
      : 'Sprawdź połączenie i spróbuj ponownie.');

  return (
    <div className="map-page">
      <div className="map-hero">
        <p className="badge">Mapa</p>
        <h1>Podgląd lokalizacji</h1>
        <p className="subtitle">
          Zobacz wszystkie Mordeczki ze statusem „dostępny”. Dane są pobierane bezpośrednio z API i nanoszone na mapę
          OpenStreetMap.
        </p>
      </div>

      <div className="map-workspace">
        <div className="map-frame">
          <MapContainer
            center={[mapCenter.lat, mapCenter.lon]}
            zoom={MAP_ZOOM}
            className="leaflet-map"
            scrollWheelZoom
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: () => setMapLoadError(true),
                load: () => setMapLoadError(false),
              }}
            />

            <MapBoundsUpdater markers={availableMarkers} fallbackCenter={MAP_DEFAULT_CENTER} />

            {availableMarkers.map((marker) => (
              <CharacterMapMarker key={marker.id} marker={marker} />
            ))}
          </MapContainer>

          <div className="map-overlay">
            <div>
              <p className="muted">Aktualizacja danych</p>
              <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Oczekiwanie...'}</strong>
            </div>
            <div className="pill pill-outline">{isLoading ? 'Ładowanie...' : `${availableMarkers.length} na mapie`}</div>
          </div>

          {(error || mapLoadError) && (
            <div className="map-banner" role="status">
              <strong>Nie udało się załadować mapy</strong>
              <p className="muted">{bannerMessage}</p>
            </div>
          )}
        </div>

        <div className="map-sidebar">
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-dot success" />
              <div>
                <strong>Aktywne urządzenia</strong>
                <p>Elementy przesyłające dane w czasie rzeczywistym.</p>
              </div>
            </div>
            <div className="legend-item">
              <span className="legend-dot warning" />
              <div>
                <strong>Wymaga uwagi</strong>
                <p>Punkty wymagające weryfikacji operatora.</p>
              </div>
            </div>
          </div>

          <div className="map-list">
            <div className="map-list__header">
              <div>
                <p className="muted">Dostępne Mordeczki</p>
                <strong>{availableUsers.length} lokalizacje</strong>
              </div>
              <span className="badge">Live</span>
            </div>

            <ul>
              {isLoading && <li className="muted">Ładowanie dostępnych lokalizacji...</li>}
              {!isLoading && availableUsers.length === 0 && (
                <li className="muted">Brak Mordeczek ze statusem „dostępny”.</li>
              )}

              {availableUsers.map((user) => {
                const displayName = user.display_name || user.username;
                const hasCoordinates = user.latitude !== null && user.longitude !== null;

                return (
                  <li key={user.id ?? user.username}>
                    <div className="location-top">
                      <strong>{displayName}</strong>
                      <span className="pill pill-outline">{user.status}</span>
                    </div>
                    <p className="muted">{user.opis || 'Brak opisu.'}</p>
                    <p className="muted">
                      {hasCoordinates
                        ? `Pozycja: ${Number(user.latitude).toFixed(4)}, ${Number(user.longitude).toFixed(4)}`
                        : 'Brak aktualnej lokalizacji.'}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <RiveVehiclesWidget />
        </div>
      </div>
    </div>
  );
}

export default MapPage;
