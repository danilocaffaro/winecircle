import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ClubList } from './pages/ClubList';
import { ClubForm } from './pages/ClubForm';
import { ClubDetail } from './pages/ClubDetail';
import { EventForm } from './pages/EventForm';
import { EventDetail } from './pages/EventDetail';
import { TastingPage } from './pages/TastingPage';
import { ResultsPage } from './pages/ResultsPage';
import { ExpensePage } from './pages/ExpensePage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { JoinClubPage } from './pages/JoinClubPage';
import { AuthPage } from './pages/AuthPage';
import { PushNotificationPrompt } from './hooks/usePushNotifications';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}

const AppRoutes: React.FC = () => {
  const { authenticated, loading } = useAuth();
  const [skippedAuth, setSkippedAuth] = useState(
    () => localStorage.getItem('wc_skip_auth') === 'true'
  );

  useEffect(() => {
    const handler = () => {
      localStorage.setItem('wc_skip_auth', 'true');
      setSkippedAuth(true);
    };
    window.addEventListener('wc-skip-auth', handler);
    return () => window.removeEventListener('wc-skip-auth', handler);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--md-background)',
      }}>
        <div className="animate-spin" style={{
          width: 32, height: 32, border: '3px solid var(--md-outline-variant)',
          borderTopColor: 'var(--md-primary)', borderRadius: '50%',
        }} />
      </div>
    );
  }

  // Show auth page if not logged in and didn't skip
  if (!authenticated && !skippedAuth) {
    return <AuthPage />;
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clubs" element={<ClubList />} />
          <Route path="/clubs/new" element={<ClubForm />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/clubs/:id/edit" element={<ClubForm />} />
          <Route path="/clubs/:clubId/events/new" element={<EventForm />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/edit" element={<EventForm />} />
          <Route path="/events/:id/tasting" element={<TastingPage />} />
          <Route path="/events/:id/results" element={<ResultsPage />} />
          <Route path="/events/:id/expenses" element={<ExpensePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/join/:id" element={<JoinClubPage />} />
        </Routes>
      </Layout>
      <PushNotificationPrompt />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#722F37',
              color: '#FFF8F0',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '16px',
              padding: '12px 20px',
            },
            duration: 2500,
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
