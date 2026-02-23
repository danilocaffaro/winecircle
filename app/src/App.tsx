import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { ScanPage } from './pages/ScanPage';
import { MyWinesPage } from './pages/MyWinesPage';
import { ProfilePage } from './pages/ProfilePage';

const App: React.FC = () => {
  return (
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
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/wines" element={<MyWinesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
