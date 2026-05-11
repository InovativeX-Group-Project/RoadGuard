import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LogIn, ShieldCheck } from 'lucide-react';
import LoadingButton from '@/components/LoadingButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Button } from '@/ui/button';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToSignup: () => void;
}

export default function LoginView({ onLogin, onGoToSignup }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-950 text-white relative overflow-hidden py-12 px-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,.16),transparent_35%)]" />
      <div className="relative container mx-auto max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="uppercase tracking-[0.22em] text-xs text-brand-300 mb-4">RoadGuard SA</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">Welcome back, let's fix roads faster.</h1>
          <p className="text-slate-300 text-lg max-w-lg">
            Sign in to track reports, submit new incidents, and follow municipal updates in real time.
          </p>
          <div className="mt-8 p-4 rounded-2xl border border-white/15 bg-white/5 max-w-md">
            <p className="text-sm text-brand-100 font-semibold mb-1">.</p>
            <p className="text-sm text-slate-300">.</p>
            <p className="text-sm text-slate-300">.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="rounded-3xl border-white/10 bg-white/95 text-slate-900 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <LogIn className="text-brand-600" size={22} /> Log In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <LoadingButton 
                  type="submit" 
                  className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-base" 
                  isLoading={isSubmitting}
                  loadingText="Signing in..."
                >
                  Sign In <ArrowRight className="ml-2" size={16} />
                </LoadingButton>
              </form>
              <div className="mt-6 text-sm text-slate-600 flex items-center justify-between gap-3">
                <span>Need an account?</span>
                <Button variant="ghost" className="text-brand-700" onClick={onGoToSignup}>
                  Create one <ShieldCheck className="ml-1" size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
