import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './index.jsx';
import Spectate from './Spectate.jsx';
import InfoPage from './InfoPage.jsx';
import AdminPage from './AdminPage.jsx';
import CookieNotice from './components/CookieNotice/CookieNotice.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index authMode="login" />} />
        <Route path="/register" element={<Index authMode="register" />} />
        <Route path="/login" element={<Index authMode="login" />} />
        <Route path="/forgot-password" element={<Index authMode="forgot" />} />
        <Route path="/reset-password" element={<Index authMode="reset" />} />
        <Route path="/about" element={<InfoPage type="about" />} />
        <Route path="/tutorial" element={<InfoPage type="tutorial" />} />
        <Route path="/contact" element={<InfoPage type="contact" />} />
        <Route path="/terms" element={<InfoPage type="terms" />} />
        <Route path="/privacy-policy" element={<InfoPage type="privacy" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/:roomName/:roomType/:username" element={<Index />} />
        <Route path="/:roomName/:username" element={<Index />} />
        <Route path="/:roomName/:roomType/spectate/:username" element={<Spectate />} />
        <Route path="/:roomName/:roomType/spectate" element={<Spectate />} />
        <Route path="/:roomName/spectate/:username" element={<Spectate />} />
        <Route path="/:roomName/spectate" element={<Spectate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="screen-credit" aria-label="Titi and Riri">
        © Titi&amp;Riri
      </div>
      <CookieNotice />
    </BrowserRouter>
  );
}

export default App;
