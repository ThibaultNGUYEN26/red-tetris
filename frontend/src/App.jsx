import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Index from './index.jsx';
import Spectate from './Spectate.jsx';
import InfoPage from './InfoPage.jsx';
import AdminPage from './AdminPage.jsx';
import CookieNotice from './components/CookieNotice/CookieNotice.jsx';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n/playerStats';

const LANGUAGE_STORAGE_KEY = 'red-tetris-language';
const LANGUAGE_CHANGE_EVENT = 'red-tetris-language-change';

const FOOTER_LINK_TRANSLATIONS = {
  en: {
    siteInformation: 'Site information',
    about: 'About',
    contact: 'Contact',
    terms: 'Terms',
    privacy: 'Privacy',
  },
  fr: {
    siteInformation: 'Informations du site',
    about: 'A propos',
    contact: 'Contact',
    terms: 'Conditions',
    privacy: 'Confidentialite',
  },
};

const getSavedLanguage = () => {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE;
};

function App() {
  const [language, setLanguage] = useState(getSavedLanguage);
  const footerText = FOOTER_LINK_TRANSLATIONS[language];

  useEffect(() => {
    const syncSavedLanguage = () => {
      setLanguage(getSavedLanguage());
    };

    window.addEventListener('storage', syncSavedLanguage);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncSavedLanguage);

    return () => {
      window.removeEventListener('storage', syncSavedLanguage);
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncSavedLanguage);
    };
  }, []);

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
        <Route path="/:roomName/:roomType/spectate/:username" element={<Spectate />} />
        <Route path="/:roomName/:roomType/spectate" element={<Spectate />} />
        <Route path="/:roomName/spectate/:username" element={<Spectate />} />
        <Route path="/:roomName/spectate" element={<Spectate />} />
        <Route path="/:roomName/:roomType/:username" element={<Index />} />
        <Route path="/:roomName/:username" element={<Index />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="screen-credit" aria-label="Titi and Riri">
        © Titi&amp;Riri
      </div>
      <nav className="screen-info-links" aria-label={footerText.siteInformation}>
        <Link to="/about">{footerText.about}</Link>
        <Link to="/contact">{footerText.contact}</Link>
        <Link to="/terms">{footerText.terms}</Link>
        <Link to="/privacy-policy">{footerText.privacy}</Link>
      </nav>
      <CookieNotice />
    </BrowserRouter>
  );
}

export default App;
