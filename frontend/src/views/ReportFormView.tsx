
import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  X,
  MapPin,
  Info,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Banknote,
  ShieldAlert,
  Zap,
  Wrench,
  AlertTriangle,
  LocateFixed,
  Loader2
} from 'lucide-react';
import LoadingButton from '@/components/LoadingButton';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import { toast } from 'sonner';
import { detectRoadDamage, AIAnalysisResult } from '@/aiService';
import { saveReport, getCurrentUser } from '@/store';
import { Report, IssueType } from '@/types';

interface ReportFormViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ReportFormView({ onCancel, onSuccess }: ReportFormViewProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedIssue, setDetectedIssue] = useState<AIAnalysisResult | null>(null);
  const [location, setLocation] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !mediaStreamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = mediaStreamRef.current;

    const handleCanPlay = () => setIsCameraReady(true);
    video.addEventListener('canplay', handleCanPlay);

    video.play().catch(() => {
      toast.error('Unable to start camera preview. Please check permissions.');
    });

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [cameraOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    toast.info("AI is analyzing the image for road damage...");
    const result = await detectRoadDamage(base64);
    setDetectedIssue(result);
    setManualDescription(result.fullDescription || result.description);
    setShowAnalysisResult(true);
    setIsAnalyzing(false);
    toast.success("AI Analysis complete!");
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraReady(false);
    setCameraOpen(false);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setIsCameraReady(false);
      setCameraOpen(true);
    } catch (error) {
      console.error('Unable to access camera:', error);
      toast.error('Unable to open camera. Please allow camera access or upload a photo.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      toast.error('Camera is not ready yet. Please try again.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Failed to capture photo. Please try again.');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setImage(base64);
    stopCamera();
    analyzeImage(base64);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      toast.error("Please upload an image of the damage.");
      return;
    }

    setIsSubmitting(true);
    const user = getCurrentUser();
    if (!user) {
      setIsSubmitting(false);
      toast.error('Please log in before submitting a report.');
      return;
    }

    try {
      const newReport: Omit<Report, 'id' | 'timestamp' | 'status' | 'history' | 'comments'> = {
        userId: user.id,
        image: image,
        issueType: detectedIssue?.issueType || 'Other',
        description: manualDescription,
        location: location || 'Unknown Location',
      };

      await saveReport(newReport as Report);

      toast.success("Report submitted successfully! The municipality has been notified.");
      onSuccess();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    toast.info('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const parts = [
            addr.road || addr.pedestrian || addr.footway,
            addr.suburb || addr.neighbourhood || addr.quarter,
            addr.city || addr.town || addr.village || addr.county,
            addr.postcode,
          ].filter(Boolean);
          setLocation(parts.length > 0 ? parts.join(', ') : data.display_name);
          toast.success('Location detected!');
        } catch {
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success('Location set using GPS coordinates.');
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location access denied. Please allow location access in your browser settings.');
        } else {
          toast.error('Unable to detect your location. Please enter it manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const removeImage = () => {
    stopCamera();
    setImage(null);
    setDetectedIssue(null);
    setManualDescription('');
    setShowAnalysisResult(false);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={onCancel}>
          <ChevronLeft />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Report Road Damage</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="rounded-[32px] border-slate-100 bg-white overflow-hidden shadow-sm">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Image Upload Area */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">1. Upload Image</Label>
                {!image ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl h-[300px] flex flex-col items-center justify-center gap-4 hover:border-brand-400 hover:bg-brand-50/30 transition-all group">
                    {cameraOpen ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full max-w-md h-48 object-cover rounded-2xl bg-black"
                          autoPlay
                          playsInline
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button type="button" className="rounded-xl bg-brand-600 hover:bg-brand-700" onClick={capturePhoto} disabled={!isCameraReady}>
                            <Camera className="mr-2 h-4 w-4" /> Capture Photo
                          </Button>
                          <Button type="button" variant="outline" className="rounded-xl" onClick={stopCamera}>
                            Cancel Camera
                          </Button>
                        </div>
                        {!isCameraReady && (
                          <p className="text-sm text-slate-500">Starting camera...</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Camera className="text-slate-400 group-hover:text-brand-500" size={32} />
                        </div>
                        <div className="text-center px-4">
                          <p className="font-semibold text-slate-700">Upload a photo or take one now</p>
                          <p className="text-sm text-slate-400">JPG, PNG up to 10MB</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button type="button" variant="outline" className="rounded-xl" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Upload Photo
                          </Button>
                          <Button type="button" className="rounded-xl bg-brand-600 hover:bg-brand-700" onClick={openCamera}>
                            <Camera className="mr-2 h-4 w-4" /> Take Photo
                          </Button>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                    />
                  </div>
                ) : (
                  <div className="relative rounded-3xl overflow-hidden group">
                    <img src={image} alt="Upload preview" className="w-full h-[300px] object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-4 right-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeImage}
                      disabled={isAnalyzing || isSubmitting}
                    >
                      <X size={18} />
                    </Button>
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                        <div className="relative w-12 h-12">
                          <div className="absolute inset-0 bg-brand-400 rounded-full animate-pulse" />
                          <div className="absolute inset-2 bg-brand-500 rounded-full" />
                          <Sparkles className="absolute inset-3 text-white animate-spin" />
                        </div>
                        <p className="font-semibold text-lg">AI Analyzing...</p>
                        <p className="text-xs text-brand-200">Detecting road conditions</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              {image && !detectedIssue && !isAnalyzing && (
                <Button
                  type="button"
                  className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center gap-2"
                  onClick={() => {
                    setShowAnalysisResult(true);
                    analyzeImage(image);
                  }}
                  disabled={isAnalyzing || isSubmitting}
                >
                  <Sparkles size={18} />
                  Analyze with AI
                </Button>
              )}

              {/* ── AI Analysis Report ── */}
              {detectedIssue && !isAnalyzing && showAnalysisResult && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">

                  {/* ① Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-brand-700">
                      <Sparkles size={16} className="text-brand-500" />
                      <span className="font-bold text-xs uppercase tracking-widest">AI Road Assessment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {detectedIssue.severity && (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${detectedIssue.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                          detectedIssue.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                            detectedIssue.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                          }`}>
                          {detectedIssue.severity} Severity
                        </span>
                      )}
                      <Badge className="bg-brand-600 text-white border-0 py-1 px-3 rounded-full text-xs font-semibold">
                        {detectedIssue.issueType}
                      </Badge>
                    </div>
                  </div>

                  {/* ② Full Description */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Problem Description</p>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {detectedIssue.fullDescription || detectedIssue.description}
                    </p>
                  </div>

                  {/* ③ Stats grid: time, cost, urgency */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Est. Repair Time</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{detectedIssue.estimatedTime || '—'}</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Banknote size={14} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Est. Cost (ZAR)</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{detectedIssue.estimatedCostZAR || '—'}</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Zap size={14} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Urgency</span>
                      </div>
                      <p className={`text-sm font-bold ${detectedIssue.urgency === 'Emergency' ? 'text-red-600' :
                        detectedIssue.urgency === 'Urgent' ? 'text-orange-600' :
                          detectedIssue.urgency === 'Moderate' ? 'text-amber-600' :
                            'text-emerald-600'
                        }`}>{detectedIssue.urgency || '—'}</p>
                    </div>
                  </div>

                  {/* ④ Recommended Action */}
                  {detectedIssue.recommendedAction && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                      <Wrench size={16} className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Recommended Municipal Action</p>
                        <p className="text-xs text-blue-800 leading-relaxed">{detectedIssue.recommendedAction}</p>
                      </div>
                    </div>
                  )}

                  {/* ⑤ Confidence bars */}
                  {detectedIssue.rawLabels && detectedIssue.rawLabels.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Detection Confidence</p>
                      <div className="space-y-2.5">
                        {detectedIssue.rawLabels.slice(0, 6).map((label, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 w-32 truncate font-medium capitalize flex items-center gap-1">
                              {label.name}
                              {label.isObject && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded-full font-bold">OBJ</span>
                              )}
                            </span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                                style={{ width: `${label.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-brand-700 w-9 text-right tabular-nums">
                              {label.confidence}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ⑥ Disclaimer */}
                  {detectedIssue.disclaimer && (
                    <div className="flex gap-2 items-start px-1">
                      <AlertTriangle size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-slate-400 leading-relaxed">{detectedIssue.disclaimer}</p>
                    </div>
                  )}

                  {/* ⑦ Re-analyze */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl text-brand-600 border-brand-200 hover:bg-brand-50 font-semibold flex items-center justify-center gap-2"
                    onClick={() => analyzeImage(image!)}
                    disabled={isAnalyzing || isSubmitting}
                  >
                    <Sparkles size={15} />
                    Re-analyze Image
                  </Button>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="location" className="text-base font-semibold">2. Location</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input
                        id="location"
                        placeholder="e.g. 123 Main St, Pretoria"
                        className="pl-10 h-14 rounded-2xl bg-slate-50 border-slate-100 focus-visible:ring-brand-500"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      title="Use my current location"
                      className="h-14 w-14 shrink-0 rounded-2xl border-slate-100 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center justify-center"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                    >
                      {isLocating
                        ? <Loader2 size={20} className="animate-spin text-brand-500" />
                        : <LocateFixed size={20} />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Info size={12} /> Be specific, or tap <LocateFixed size={11} className="inline" /> to auto-detect your location.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="type" className="text-base font-semibold">3. Issue Type</Label>
                  <select
                    id="type"
                    className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 px-4 focus-visible:ring-brand-500 outline-none text-sm appearance-none"
                    value={detectedIssue?.issueType || 'Other'}
                    onChange={(e) => setDetectedIssue({ ...detectedIssue!, issueType: e.target.value as IssueType })}
                  >
                    <option value="Pothole">Pothole</option>
                    <option value="Crack">Surface Crack</option>
                    <option value="Broken Traffic Light">Broken Traffic Light</option>
                    <option value="Other">Other Obstruction</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-semibold">4. Additional Details (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue size, impact on traffic, or any other details..."
                  className="min-h-[120px] rounded-2xl bg-slate-50 border-slate-100 focus-visible:ring-brand-500 p-4"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 h-14 rounded-2xl text-lg font-semibold"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            className="flex-[2] h-14 rounded-2xl text-lg font-semibold bg-brand-600 hover:bg-brand-700 shadow-xl"
            disabled={!image || isAnalyzing}
            isLoading={isSubmitting}
            loadingText="Submitting..."
          >
            <CheckCircle2 className="mr-2 h-5 w-5" /> Submit Report
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
