import { Routes, Route } from 'react-router';
import { AppShell } from '../components/AppShell';
import { MonitoringPage } from '../features/monitoring/pages/MonitoringPage';
import { SessionsPage } from '../features/monitoring/pages/SessionsPage';
import { SessionDetailPage } from '../features/monitoring/pages/SessionDetailPage';
import { PrintPreviewPage } from '../features/monitoring/pages/PrintPreviewPage';

export const App = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<MonitoringPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/sessions/:id" element={<SessionDetailPage />} />
      <Route path="/sessions/:id/print" element={<PrintPreviewPage />} />
    </Route>
  </Routes>
);
