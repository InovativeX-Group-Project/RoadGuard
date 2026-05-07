import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SignupViewProps {
  onSignup: (name: string, email: string, password: string) => void;
  onGoToLogin: () => void;
}

export default function SignupView({ onSignup, onGoToLogin }: SignupViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    setValidationError('');
    onSignup(name, email, password);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-100 relative overflow-hidden py-12 px-4">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(37,99,235,.08),transparent_45%),linear-gradient(330deg,rgba(14,116,144,.08),transparent_40%)]" />
      <div className="relative container mx-auto max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="uppercase tracking-[0.2em] text-xs text-brand-700 mb-4">Create Account</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">Join RoadGuard SA and start reporting issues.</h1>
          <p className="text-slate-600 text-lg max-w-md">
            Build a safer commute by reporting hazards and tracking repair progress in one place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <Card className="rounded-3xl border-slate-200 shadow-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2 text-slate-900">
                <UserPlus className="text-brand-600" size={22} /> Sign Up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                {validationError && <p className="text-sm text-red-600">{validationError}</p>}
                <Button type="submit" className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-base">
                  Create Account <ArrowRight className="ml-2" size={16} />
                </Button>
              </form>
              <div className="mt-6 text-sm text-slate-600 flex items-center justify-between gap-3">
                <span>Already registered?</span>
                <Button variant="ghost" className="text-brand-700" onClick={onGoToLogin}>
                  Log in instead
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
