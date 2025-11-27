import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import BaseLayout from './layouts/BaseLayout.jsx';
import ChatPage from './pages/ChatPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MapPage from './pages/MapPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BaseLayout />}> 
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
