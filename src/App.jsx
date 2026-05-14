import { Routes, Route } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/cliente" element={<ClientView />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="*" element={<LoginScreen />} />
    </Routes>
  );
}
