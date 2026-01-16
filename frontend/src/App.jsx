import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './index.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/:roomName/:username" element={<Index />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
