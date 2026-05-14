import { Routes, Route } from 'react-router-dom';
import SlugWrapper from './components/SlugWrapper';
import LoginScreen from './components/LoginScreen';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';
import NotFound from './components/NotFound';

export default function App() {
  return (
    <Routes>
      {/* Pantalla de inicio global */}
      <Route path="/" element={<LoginScreen />} />

      {/* Pantalla de inicio de una barbería */}
      <Route path="/:slug" element={
        <SlugWrapper>
          <LoginScreen />
        </SlugWrapper>
      } />

      {/* Vista cliente */}
      <Route path="/:slug/cliente" element={
        <SlugWrapper>
          <ClientView />
        </SlugWrapper>
      } />

      {/* Vista admin */}
      <Route path="/:slug/admin" element={
        <SlugWrapper>
          <AdminView />
        </SlugWrapper>
      } />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
