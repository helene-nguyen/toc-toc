import { Routes, Route } from 'react-router';
import { AppShell } from '../components/AppShell';
import { MonitoringPage } from '../features/monitoring/pages/MonitoringPage';
import { SessionsPage } from '../features/monitoring/pages/SessionsPage';

export const App = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<MonitoringPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
    </Route>
  </Routes>
);
