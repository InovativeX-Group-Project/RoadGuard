
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
  LocateFixed,
  Loader2
} from 'lucide-react';
import LoadingButton from '@/components/LoadingButton';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import { toast } from 'sonner';
import { generateDescriptionFromContext, AIAnalysisResult } from '@/aiService';
import { saveReport, getCurrentUser } from '@/store';
import { Report, IssueType, ISSUE_TYPE_OPTIONS } from '@/types';

interface ReportFormViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ReportFormView({ onCancel, onSuccess }: ReportFormViewProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [detectedIssue, setDetectedIssue] = useState<AIAnalysisResult | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<IssueType>('Other');
  const [useCustomIssueType, setUseCustomIssueType] = useState(false);
  const [customIssueType, setCustomIssueType] = useState('');
  const [location, setLocation] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
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
        setDetectedIssue(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateDescription = async () => {
    const issueTypeForAI = useCustomIssueType ? customIssueType.trim() : selectedIssueType;

    if (!issueTypeForAI) {
      toast.error('Please select an issue type first.');
      return;
    }

    if (!location.trim()) {
      toast.error('Please enter a location first.');
      return;
    }

    setIsGeneratingDescription(true);
    toast.info('Generating AI description from issue type and location...');
    try {
      const result = await generateDescriptionFromContext(issueTypeForAI, location);
      const generatedDescription = result.fullDescription || result.description || '';
      const finalDescription = useCustomIssueType
        ? `Reported issue type (user specified): ${issueTypeForAI}. ${generatedDescription}`
        : generatedDescription;

      setDetectedIssue(result);
      setSelectedIssueType(result.issueType || selectedIssueType);
      setManualDescription(finalDescription);
      toast.success('AI description generated.');
    } finally {
      setIsGeneratingDescription(false);
    }
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
    setDetectedIssue(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      toast.error("Please upload an image of the damage.");
      return;
    }

    const customIssueLabel = customIssueType.trim();
    const locationValue = location.trim();
    const descriptionValue = manualDescription.trim();

    if (!locationValue) {
      toast.error('Please provide the report location.');
      return;
    }

    if (useCustomIssueType && !customIssueLabel) {
      toast.error('Please type a custom issue type.');
      return;
    }

    if (!descriptionValue) {
      toast.error('Please generate or enter a problem description before submitting.');
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
      const issueTypeForSave: IssueType = useCustomIssueType ? 'Other' : selectedIssueType;
      const descriptionForSave = useCustomIssueType && customIssueLabel
        ? `Reported issue type (user specified): ${customIssueLabel}. ${descriptionValue}`
        : descriptionValue;

      const newReport: Omit<Report, 'id' | 'timestamp' | 'status' | 'history' | 'comments'> = {
        userId: user.id,
        image: image,
        issueType: issueTypeForSave,
        description: descriptionForSave,
        location: locationValue,
      };

      await saveReport(newReport as Report);

      toast.success("Report submitted successfully! The municipality has been notified.");
      onSuccess();
    } catch (error) {
      console.error('Error submitting report:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit report. Please try again.';
      toast.error(message);
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
    setSelectedIssueType('Other');
    setUseCustomIssueType(false);
    setCustomIssueType('');
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
                      disabled={isSubmitting}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                )}
              </div>

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
                    value={useCustomIssueType ? '__custom__' : selectedIssueType}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__custom__') {
                        setUseCustomIssueType(true);
                        setSelectedIssueType('Other');
                        return;
                      }

                      const typedValue = value as IssueType;
                      setUseCustomIssueType(false);
                      setSelectedIssueType(typedValue);
                      if (detectedIssue) {
                        setDetectedIssue({ ...detectedIssue, issueType: typedValue });
                      }
                    }}
                  >
                    {ISSUE_TYPE_OPTIONS.map((issueType) => (
                      <option key={issueType} value={issueType}>{issueType}</option>
                    ))}
                    <option value="__custom__">Other (Type Manually)</option>
                  </select>
                  {useCustomIssueType && (
                    <Input
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus-visible:ring-brand-500"
                      placeholder="Type custom issue type"
                      value={customIssueType}
                      onChange={(e) => setCustomIssueType(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <Button
                type="button"
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2"
                onClick={handleGenerateDescription}
                disabled={isGeneratingDescription || isSubmitting}
              >
                <Sparkles size={18} />
                {isGeneratingDescription ? 'Generating Description...' : 'Generate AI Description From Location + Issue Type'}
              </Button>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-semibold">4. Problem Description</Label>
                <Textarea
                  id="description"
                  placeholder="AI will generate a professional municipality-ready summary. You can refine it here if needed."
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
            disabled={!image || isGeneratingDescription}
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
