import { Routes, Route } from 'react-router-dom';
import SlugWrapper from './components/SlugWrapper';
import LoginScreen from './components/LoginScreen';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';
import NotFound from './components/NotFound';
import SuperAdminPanel from './components/SuperAdminPanel';
import CheckAppointment from './components/CheckAppointment';
import MyStamps from './components/MyStamps';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/founders" element={<SuperAdminPanel />} />

      {/* Rutas de cliente — se bloquean si la barbería está suspendida */}
      <Route path="/:slug" element={<SlugWrapper><LoginScreen mode="client" /></SlugWrapper>} />
      <Route path="/:slug/cliente" element={<SlugWrapper><ClientView /></SlugWrapper>} />
      <Route path="/:slug/mi-cita" element={<SlugWrapper><CheckAppointment /></SlugWrapper>} />
      <Route path="/:slug/sellos" element={<SlugWrapper><MyStamps /></SlugWrapper>} />

      {/* Rutas de admin — siguen accesibles aunque esté suspendida */}
      <Route path="/:slug/admin" element={<SlugWrapper isAdmin={true}><LoginScreen mode="admin" /></SlugWrapper>} />
      <Route path="/:slug/admin/panel" element={<SlugWrapper isAdmin={true}><AdminView /></SlugWrapper>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
