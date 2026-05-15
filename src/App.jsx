import { Routes, Route } from 'react-router-dom';
import SlugWrapper from './components/SlugWrapper';
import LoginScreen from './components/LoginScreen';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';
import NotFound from './components/NotFound';
import SuperAdminPanel from './components/SuperAdminPanel';

export default function App() {
  return (
    <Routes>
      {/* Ruta raíz: panel exclusivo para fundadores */}
      <Route path="/" element={<SuperAdminPanel />} />

      {/* Rutas de cada barbería por slug */}
      <Route path="/:slug" element={<SlugWrapper><LoginScreen /></SlugWrapper>} />
      <Route path="/:slug/cliente" element={<SlugWrapper><ClientView /></SlugWrapper>} />
      <Route path="/:slug/admin" element={<SlugWrapper><AdminView /></SlugWrapper>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
