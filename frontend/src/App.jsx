import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './index.jsx';
import Spectate from './Spectate.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/:roomName/:username" element={<Index />} />
        <Route path="/:roomName/spectate/:username" element={<Spectate />} />
        <Route path="/:roomName/spectate" element={<Spectate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
