import { Routes, Route } from 'react-router-dom';
import SlugWrapper from './components/SlugWrapper';
import LoginScreen from './components/LoginScreen';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';
import NotFound from './components/NotFound';
import SuperAdminPanel from './components/SuperAdminPanel';
import CheckAppointment from './components/CheckAppointment';
import MyStamps from './components/MyStamps';
import OAuthCallback from './components/OAuthCallback';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/founders" element={<SuperAdminPanel />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/:slug" element={<SlugWrapper><LoginScreen mode="client" /></SlugWrapper>} />
      <Route path="/:slug/cliente" element={<SlugWrapper><ClientView /></SlugWrapper>} />
      <Route path="/:slug/mi-cita" element={<SlugWrapper><CheckAppointment /></SlugWrapper>} />
      <Route path="/:slug/sellos" element={<SlugWrapper><MyStamps /></SlugWrapper>} />
      <Route path="/:slug/admin" element={<SlugWrapper><LoginScreen mode="admin" /></SlugWrapper>} />
      <Route path="/:slug/admin/panel" element={<SlugWrapper><AdminView /></SlugWrapper>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
