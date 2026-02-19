import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './index.jsx';
import Spectate from './Spectate.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/:roomName/:username" element={<Index />} />
        <Route path="/:roomName/spectate" element={<Spectate />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
