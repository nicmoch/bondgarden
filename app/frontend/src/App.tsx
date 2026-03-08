import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Journal from './pages/Journal';
import MyGarden from './pages/MyGarden';
import GivenGarden from './pages/GivenGarden';
import SharedGarden from './pages/SharedGarden';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import NotFound from './pages/NotFound';
import BottomNav from './components/BottomNav';

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
  const hideNav = ['/auth/callback', '/auth/error'].includes(location.pathname);

  return (
    <>
      <div className="max-w-lg mx-auto min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/my-garden" element={<MyGarden />} />
          <Route path="/given-garden" element={<GivenGarden />} />
          <Route path="/shared-garden" element={<SharedGarden />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
