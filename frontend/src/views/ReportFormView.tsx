
import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  MapPin, 
  Info, 
  Loader2, 
  Sparkles,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { detectRoadDamage } from '@/aiService';
import { saveReport, getCurrentUser } from '@/store';
import { Report, IssueType } from '@/types';

interface ReportFormViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ReportFormView({ onCancel, onSuccess }: ReportFormViewProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedIssue, setDetectedIssue] = useState<{ issueType: IssueType; description: string } | null>(null);
  const [location, setLocation] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
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
    setManualDescription(result.description);
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

  const removeImage = () => {
    stopCamera();
    setImage(null);
    setDetectedIssue(null);
    setManualDescription('');
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
                    >
                      <X size={18} />
                    </Button>
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <Loader2 className="h-10 w-10 animate-spin mb-4 text-brand-400" />
                        <p className="font-semibold text-lg flex items-center gap-2">
                          <Sparkles className="text-brand-400" /> AI Analyzing Road Conditions...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Detection Result */}
              {detectedIssue && !isAnalyzing && (
                <div className="p-6 bg-brand-50 border border-brand-100 rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand-700">
                      <Sparkles size={18} />
                      <span className="font-bold text-sm uppercase tracking-wider">AI Detection Result</span>
                    </div>
                    <Badge className="bg-brand-600 text-white border-0 py-1.5 px-3 rounded-full">
                      {detectedIssue.issueType}
                    </Badge>
                  </div>
                  <p className="text-slate-700 italic">"Based on visual analysis, I've identified a <strong>{detectedIssue.issueType.toLowerCase()}</strong> which appears to be a safety hazard. We've logged this automatically."</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="location" className="text-base font-semibold">2. Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                      id="location"
                      placeholder="e.g. 123 Main St, Pretoria" 
                      className="pl-10 h-14 rounded-2xl bg-slate-50 border-slate-100 focus-visible:ring-brand-500"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Info size={12} /> Pro-tip: Be as specific as possible (landmarks help!)
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
          <Button 
            type="submit" 
            className="flex-[2] h-14 rounded-2xl text-lg font-semibold bg-brand-600 hover:bg-brand-700 shadow-xl"
            disabled={isSubmitting || !image || isAnalyzing}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-5 w-5" /> Submit Report</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
