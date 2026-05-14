import { Routes, Route } from 'react-router-dom';
import SlugWrapper from './components/SlugWrapper';
import LoginScreen from './components/LoginScreen';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';
import NotFound from './components/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/:slug" element={<SlugWrapper><LoginScreen /></SlugWrapper>} />
      <Route path="/:slug/cliente" element={<SlugWrapper><ClientView /></SlugWrapper>} />
      <Route path="/:slug/admin" element={<SlugWrapper><AdminView /></SlugWrapper>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
