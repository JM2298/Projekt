export const API_HOST = 'http://localhost';

const REFRESH_PATH = '/joker-login-api/refresh/';

const getStoredAccessToken = () => localStorage.getItem('accessToken');
const getStoredRefreshToken = () => localStorage.getItem('refreshToken');

const buildHeaders = (headers = {}, useAuth = true) => {
  const builtHeaders = new Headers(headers);
  builtHeaders.set('Content-Type', 'application/json');

  if (useAuth) {
    const accessToken = getStoredAccessToken();
    if (accessToken) {
      builtHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  return builtHeaders;
};

const refreshAccessToken = async () => {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    throw new Error('Brak tokenu odświeżania.');
  }

  const response = await fetch(`${API_HOST}${REFRESH_PATH}`, {
    method: 'POST',
    headers: buildHeaders({}, false),
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Nie udało się odświeżyć tokenu dostępowego.');
  }

  const data = await response.json();

  if (!data?.access) {
    throw new Error('Brak nowego tokenu w odpowiedzi odświeżania.');
  }

  localStorage.setItem('accessToken', data.access);
  return data.access;
};

export const apiRequest = async (
  path,
  options = {},
  { useAuth = true, retryOnAuthFail = true } = {}
) => {
  const headers = buildHeaders(options.headers, useAuth);
  const response = await fetch(`${API_HOST}${path}`, { ...options, headers });

  const shouldRetry = useAuth && retryOnAuthFail && response.status === 401;

  if (!shouldRetry) {
    return response;
  }

  try {
    const refreshedToken = await refreshAccessToken();
    const retryHeaders = buildHeaders(options.headers, true);

    if (refreshedToken) {
      retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
    }

    return await fetch(`${API_HOST}${path}`, { ...options, headers: retryHeaders });
  } catch (refreshError) {
    console.error('Odświeżanie tokenu nie powiodło się:', refreshError);
    return response;
  }
};
