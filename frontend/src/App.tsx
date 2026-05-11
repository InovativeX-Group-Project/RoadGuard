
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Toaster } from '@/ui/sonner';
import { toast } from 'sonner';
import { clearCurrentUser, getCurrentUser, loginUser, signupUser } from '@/store';
import { User } from '@/types';

// Views
import LandingView from '@/views/LandingView';
import DashboardView from '@/views/DashboardView';
import ReportFormView from '@/views/ReportFormView';
import ReportDetailView from '@/views/ReportDetailView';
import AdminDashboardView from '@/views/AdminDashboardView';
import LoginView from '@/views/LoginView';
import SignupView from '@/views/SignupView';

type ViewState = 'landing' | 'login' | 'signup' | 'dashboard' | 'report-form' | 'report-detail' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const loadedUser = getCurrentUser();
    setUser(loadedUser);
    if (loadedUser) {
      setCurrentView(loadedUser.role === 'admin' ? 'admin' : 'dashboard');
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const loggedIn = await loginUser({ email, password });
      setUser(loggedIn);
      setCurrentView(loggedIn.role === 'admin' ? 'admin' : 'dashboard');
      toast.success(`Login successful. Welcome back, ${loggedIn.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to log in.');
    }
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    try {
      const createdUser = await signupUser({ name, email, password });
      setUser(createdUser);
      setCurrentView('dashboard');
      toast.success('Account created successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create account.');
    }
  };

  const handleLogout = () => {
    clearCurrentUser();
    setUser(null);
    setCurrentView('landing');
    toast.info("Logged out successfully");
  };

  const navigateToDetail = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView('report-detail');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Toaster />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setCurrentView(user ? (user.role === 'admin' ? 'admin' : 'dashboard') : 'landing')}
          >
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              RoadGuard <span className="text-brand-600">SA</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  className={currentView === 'dashboard' || currentView === 'admin' ? 'text-brand-600' : ''}
                  onClick={() => setCurrentView(user.role === 'admin' ? 'admin' : 'dashboard')}
                >
                  Dashboard
                </Button>
                {user.role === 'citizen' && (
                  <Button 
                    variant="ghost"
                    className={currentView === 'report-form' ? 'text-brand-600' : ''}
                    onClick={() => setCurrentView('report-form')}
                  >
                    New Report
                  </Button>
                )}
                <div className="h-6 w-px bg-slate-200 mx-2" />
                <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full">
                  <UserIcon size={16} className="text-slate-500" />
                  <span className="text-sm font-medium">{user.role === 'admin' ? 'Admin' : 'User'}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleLogout}>
                    <LogOut size={14} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setCurrentView('login')}>Log In</Button>
                <Button variant="outline" onClick={() => setCurrentView('signup')}>Sign Up</Button>
                <Button className="bg-brand-600 hover:bg-brand-700" onClick={() => setCurrentView('signup')}>Get Started</Button>
              </>
            )}
          </nav>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-16 bg-white border-b z-40 p-4 shadow-xl"
          >
            <div className="flex flex-col gap-4">
               {user ? (
                <>
                  <Button variant="ghost" onClick={() => { setCurrentView(user.role === 'admin' ? 'admin' : 'dashboard'); setIsMenuOpen(false); }}>Dashboard</Button>
                  {user.role === 'citizen' && (
                    <Button variant="ghost" onClick={() => { setCurrentView('report-form'); setIsMenuOpen(false); }}>Report Issue</Button>
                  )}
                  <Button variant="destructive" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>Log Out</Button>
                </>
               ) : (
                <>
                  <Button variant="ghost" onClick={() => { setCurrentView('login'); setIsMenuOpen(false); }}>Log In</Button>
                  <Button variant="ghost" onClick={() => { setCurrentView('signup'); setIsMenuOpen(false); }}>Sign Up</Button>
                  <Button className="bg-brand-600" onClick={() => { setCurrentView('signup'); setIsMenuOpen(false); }}>Get Started</Button>
                </>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {currentView === 'landing' && <LandingView onReportClick={() => setCurrentView('signup')} />}
            {currentView === 'login' && (
              <LoginView
                onLogin={handleLogin}
                onGoToSignup={() => setCurrentView('signup')}
              />
            )}
            {currentView === 'signup' && (
              <SignupView
                onSignup={handleSignup}
                onGoToLogin={() => setCurrentView('login')}
              />
            )}
            {currentView === 'dashboard' && user && (
              <DashboardView 
                onNewReport={() => setCurrentView('report-form')} 
                onViewReport={navigateToDetail}
              />
            )}
            {currentView === 'report-form' && user && (
              <ReportFormView 
                onCancel={() => setCurrentView('dashboard')}
                onSuccess={() => setCurrentView('dashboard')}
              />
            )}
            {currentView === 'report-detail' && selectedReportId && (
              <ReportDetailView 
                reportId={selectedReportId} 
                onBack={() => setCurrentView(user?.role === 'admin' ? 'admin' : 'dashboard')}
              />
            )}
            {currentView === 'admin' && user?.role === 'admin' && (
              <AdminDashboardView 
                onViewReport={navigateToDetail}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4 text-white">
                <ShieldCheck />
                <span className="text-xl font-bold">RoadGuard SA</span>
              </div>
              <p className="max-w-sm mb-6">
                Protecting our roads, empowering our citizens. Using AI to build a safer infrastructure for all South Africans.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setCurrentView('landing')} className="hover:text-white transition-colors">Home</button></li>
                <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button className="hover:text-white transition-colors">Contact Us</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Partners</h4>
              <ul className="space-y-2 text-sm">
                <li>Municipal Association</li>
                <li>IT Infrastructure SA</li>
                <li>Department of Roads</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:row justify-between items-center text-sm">
            <p>© 2026 RoadGuard SA. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <span className="flex items-center gap-1"><MapPin size={14}/> Pretoria, ZA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
