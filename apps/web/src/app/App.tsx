import { Routes, Route } from 'react-router';
import { AppShell } from '../components/AppShell';
import { RequireAuth } from '../features/auth/RequireAuth';
import { SignInPage } from '../features/auth/pages/SignInPage';
import { SignUpPage } from '../features/auth/pages/SignUpPage';
import { MonitoringPage } from '../features/monitoring/pages/MonitoringPage';
import { SessionsPage } from '../features/monitoring/pages/SessionsPage';
import { SessionDetailPage } from '../features/monitoring/pages/SessionDetailPage';
import { PrintPreviewPage } from '../features/monitoring/pages/PrintPreviewPage';
import { PracticePage } from '../features/practice/pages/PracticePage';

export const App = () => (
  <Routes>
    <Route path="/signin" element={<SignInPage />} />
    <Route path="/signup" element={<SignUpPage />} />
    {/* everything else needs a session */}
    <Route
      element={
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      }
    >
      <Route path="/" element={<MonitoringPage />} />
      <Route path="/preparation" element={<PracticePage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/sessions/:id" element={<SessionDetailPage />} />
      <Route path="/sessions/:id/print" element={<PrintPreviewPage />} />
    </Route>
  </Routes>
);
