
import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Camera, 
  Search, 
  CheckCircle2, 
  TrafficCone, 
  Zap,
  BarChart3,
  HardHat,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import homeImage from '@/images/homeImage.jpg';

interface LandingViewProps {
  onReportClick: () => void;
}

export default function LandingView({ onReportClick }: LandingViewProps) {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-slate-50">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="max-w-3xl">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-[1.02]"
              >
                RoadGuard SA
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold mb-5 border border-brand-200"
              >
                <Zap size={14} /> AI-Powered Civic Reporting
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.06]"
              >
                Building Better Roads
                <br />
                With Smart Technology
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed"
              >
                Report potholes, cracks, and broken traffic lights in seconds. RoadGuard SA uses AI to analyze and prioritize repairs for a safer South Africa.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex flex-col sm:row gap-4"
              >
                <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-lg h-14 px-8 rounded-2xl group shadow-lg" onClick={onReportClick}>
                  Report Road Issue <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-2xl border-2 bg-white">
                  How it Works
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="relative w-full max-w-xl mx-auto"
            >
              <div className="hero-clip-glow" />
              <div className="hero-clip-frame">
                <img
                  src={homeImage}
                  alt="Road maintenance and urban street infrastructure"
                  className="hero-clip-image"
                />
              </div>
              <div className="hero-floating-card top-5 -left-2 md:-left-8">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                AI Scan Ready
              </div>
              <div className="hero-floating-card bottom-4 right-0 md:-right-6">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                Priority Routing Active
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-slate-200/50 blur-[80px] rounded-full pointer-events-none" />
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Simple. Smart. Swift.</h2>
            <p className="text-slate-500">The most efficient way to maintain our infrastructure.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
            {[
              {
                icon: <Camera className="text-brand-600" />,
                title: "Snap & Upload",
                desc: "Take a photo of any road damage and upload it instantly from your mobile or desktop."
              },
              {
                icon: <Zap className="text-amber-500" />,
                title: "AI Detection",
                desc: "Our vision model automatically identifies the issue type and classifies the severity."
              },
              {
                icon: <BarChart3 className="text-emerald-600" />,
                title: "Real-time Tracking",
                desc: "Monitor the status of your report from submission to final resolution by the municipality."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What we detect */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">Advanced Issue <br /> Classification</h2>
              <div className="space-y-6">
                {[
                  { title: "Potholes", icon: <TrafficCone className="text-brand-400" /> },
                  { title: "Surface Cracks", icon: <ArrowRight className="text-brand-400" /> },
                  { title: "Broken Traffic Lights", icon: <Zap className="text-brand-400" /> },
                  { title: "Hazardous Debris", icon: <AlertTriangle className="text-brand-400" /> }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-xl font-semibold">{item.title}</span>
                    <CheckCircle2 className="ml-auto text-emerald-400 opacity-50" />
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-brand-600/20 rounded-[40px] relative overflow-hidden flex items-center justify-center border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <HardHat size={200} className="text-brand-500 opacity-20" />
                <div className="absolute bottom-8 left-8 right-8 p-6 glass-card rounded-2xl text-slate-900">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-bold">AI Active Analysis</span>
                  </div>
                  <p className="text-sm opacity-80 font-medium">Scanning road segment #ZA-PRE-102...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats */}
      <section className="py-24 bg-brand-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-4">
             {[
               { label: "Reports Fixed", value: "1,240+" },
               { label: "Avg Resolution", value: "3.5 Days" },
               { label: "Active Users", value: "50k+" },
               { label: "Municipalities", value: "12" }
             ].map((stat, i) => (
               <div key={i}>
                 <div className="text-4xl md:text-5xl font-black mb-2">{stat.value}</div>
                 <div className="text-brand-100 font-medium">{stat.label}</div>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
}
