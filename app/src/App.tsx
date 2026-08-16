import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { ProfilePage } from './pages/ProfilePage';
import { JoinClubPage } from './pages/JoinClubPage';
import { AuthPage } from './pages/AuthPage';
import { PushNotificationPrompt } from './hooks/usePushNotifications';

/**
 * O service worker é registrado com uma versão na query string.
 *
 * O arquivo fica atrás do Cloudflare, que já serviu uma cópia velha por horas
 * depois de um deploy — nesse caso, uma versão de meses antes, que sequer
 * parseava. A query muda a URL sem mudar o escopo (que vem do caminho), então
 * a borda é obrigada a buscar o arquivo novo. **Suba o número ao mexer em
 * sw.js.**
 */
const SW_VERSION = '3';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`).catch((err) => {
      console.error('Falha ao registrar o service worker:', err);
    });
  });
}

const Spinner: React.FC = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--md-background)',
  }}>
    <div className="animate-spin" role="status" aria-label="Carregando" style={{
      width: 32, height: 32, border: '3px solid var(--md-outline-variant)',
      borderTopColor: 'var(--md-primary)', borderRadius: '50%',
    }} />
  </div>
);

/**
 * Rota que exige sessão, lembrando para onde a pessoa queria ir (A-18).
 *
 * O botão "Browse without account" gravava uma flag e liberava todas as
 * rotas — mas desde a migração para o backend toda tela depende de sessão,
 * então o visitante recebia listas vazias e erros silenciosos. Agora quem não
 * entrou vê a apresentação e o convite; o resto pede login e devolve a pessoa
 * ao destino original depois.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated } = useAuth();
  const location = useLocation();
  if (!authenticated) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { authenticated, loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <>
      <Routes>
        <Route path="/entrar" element={
          authenticated ? <Navigate to="/" replace /> : <AuthPage />
        } />

        <Route path="/*" element={
          <Layout>
            <Routes>
              {/* Abertas: a apresentação e o convite precisam funcionar deslogado */}
              <Route path="/" element={<Home />} />
              <Route path="/join/:id" element={<JoinClubPage />} />

              <Route path="/clubs" element={<RequireAuth><ClubList /></RequireAuth>} />
              <Route path="/clubs/new" element={<RequireAuth><ClubForm /></RequireAuth>} />
              <Route path="/clubs/:id" element={<RequireAuth><ClubDetail /></RequireAuth>} />
              <Route path="/clubs/:id/edit" element={<RequireAuth><ClubForm /></RequireAuth>} />
              <Route path="/clubs/:clubId/events/new" element={<RequireAuth><EventForm /></RequireAuth>} />
              <Route path="/events/:id" element={<RequireAuth><EventDetail /></RequireAuth>} />
              <Route path="/events/:id/edit" element={<RequireAuth><EventForm /></RequireAuth>} />
              <Route path="/events/:id/tasting" element={<RequireAuth><TastingPage /></RequireAuth>} />
              <Route path="/events/:id/results" element={<RequireAuth><ResultsPage /></RequireAuth>} />
              <Route path="/events/:id/expenses" element={<RequireAuth><ExpensePage /></RequireAuth>} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      {authenticated && <PushNotificationPrompt />}
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#3C0C11', color: '#FFF8F0',
            fontFamily: 'Inter, sans-serif', borderRadius: '16px', padding: '12px 20px',
          },
          duration: 3000,
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
