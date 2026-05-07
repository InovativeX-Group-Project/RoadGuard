
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  MapPin, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Send,
  History,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getReport, addReportComment, getCurrentUser } from '@/store';
import { Report, ReportStatus, Comment } from '@/types';

interface ReportDetailViewProps {
  reportId: string;
  onBack: () => void;
}

const statusColors: Record<ReportStatus, string> = {
  'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Resolved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-slate-100 text-slate-700 border-slate-200'
};

const statusSteps: ReportStatus[] = ['Pending', 'In Progress', 'Resolved'];

export default function ReportDetailView({ reportId, onBack }: ReportDetailViewProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [commentText, setCommentText] = useState('');
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const loadReport = async () => {
      try {
        const reportData = await getReport(reportId);
        if (reportData) setReport(reportData);
      } catch (error) {
        console.error('Error loading report:', error);
      }
    };
    loadReport();
  }, [reportId]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !report) return;

    try {
      await addReportComment(report.id, commentText);
      // Reload the report to get the updated comments
      const updatedReport = await getReport(reportId);
      if (updatedReport) setReport(updatedReport);
      setCommentText('');
      toast.success("Comment added");
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (!report) return <div className="p-20 text-center">Report not found.</div>;

  const currentStatusIndex = statusSteps.indexOf(report.status);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <Button variant="ghost" className="mb-4 rounded-full" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex flex-col md:row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Report #{report.id.slice(-6)}</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1.5"><MapPin size={16} /> {report.location}</span>
              <span className="flex items-center gap-1.5"><Calendar size={16} /> Submitted {new Date(report.timestamp).toLocaleDateString()}</span>
            </div>
          </div>
          <Badge className={`text-lg px-6 py-2 rounded-full border ${statusColors[report.status]}`}>
            {report.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image & Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[32px] overflow-hidden border-slate-100 shadow-xl">
            <img src={report.image} alt={report.issueType} className="w-full aspect-[4/3] object-cover" />
          </Card>

          <Card className="rounded-[32px] border-slate-100 shadow-sm p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Info size={20} className="text-brand-600" /> Issue Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Label className="text-slate-400 font-medium">Issue Type</Label>
                <div className="text-lg font-bold text-slate-900 mt-1">{report.issueType}</div>
              </div>
              <div>
                <Label className="text-slate-400 font-medium">Reported By</Label>
                <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <User size={12} className="text-slate-500" />
                  </div>
                  {report.userId === user?.id ? "You" : "Citizen"}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-slate-400 font-medium">Description</Label>
                <p className="text-lg text-slate-700 mt-2 leading-relaxed">
                  {report.description || "No additional description provided."}
                </p>
              </div>
            </div>
          </Card>

          {/* Timeline / Progress */}
          <Card className="rounded-[32px] border-slate-100 shadow-sm p-8 text-slate-900">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <History size={20} className="text-brand-600" /> Repair Timeline
            </h3>
            <div className="relative pl-8 border-l-2 border-slate-100 space-y-12">
              {statusSteps.map((step, i) => {
                const isActive = i <= currentStatusIndex;
                const isCurrent = i === currentStatusIndex;
                return (
                  <div key={step} className="relative">
                    <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-md transition-colors duration-500 ${isActive ? 'bg-brand-600' : 'bg-slate-200'}`} />
                    <div className={isActive ? 'opacity-100' : 'opacity-40'}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`font-bold ${isCurrent ? 'text-brand-600' : 'text-slate-900 text-sm'}`}>{step}</span>
                        {isActive && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                      <p className="text-sm text-slate-500">
                        {i === 0 && `Submitted on ${new Date(report.timestamp).toLocaleDateString()}`}
                        {i === 1 && (report.status === 'In Progress' || report.status === 'Resolved' ? "Material sourced and crew dispatched." : "Await municipality assessment.")}
                        {i === 2 && (report.status === 'Resolved' ? `Fixed on ${new Date(report.history[report.history.length-1].timestamp).toLocaleDateString()}` : "Repairs finalized.")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Comments & Feedback */}
        <div className="space-y-8">
          <Card className="rounded-[32px] border-slate-100 shadow-sm flex flex-col h-full bg-slate-50/50">
            <CardHeader className="p-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare size={20} className="text-brand-600" /> Comments & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
              {report.comments.length > 0 ? (
                report.comments.map((comment) => (
                  <div key={comment.id} className={`p-4 rounded-2xl ${comment.author === 'Municipal Staff' ? 'bg-brand-50 border border-brand-100' : 'bg-white border border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${comment.author === 'Municipal Staff' ? 'text-brand-700' : 'text-slate-900'}`}>{comment.author}</span>
                      <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{comment.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">No feedback yet from municipal staff.</p>
                </div>
              )}
            </CardContent>
            <Separator className="bg-slate-100" />
            <div className="p-6 bg-white rounded-b-[32px]">
              <div className="relative">
                <Textarea 
                  placeholder="Ask a question or provide more info..." 
                  className="rounded-2xl bg-slate-50 border-none min-h-[80px] pr-12 focus-visible:ring-0"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button 
                  size="icon" 
                  className="absolute bottom-2 right-2 rounded-xl bg-brand-600 hover:bg-brand-700 h-8 w-8"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[32px] border-slate-100 shadow-sm p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-bold">Next Steps</h4>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Our AI has classified this as a <strong>{report.issueType}</strong>. The local ward councillor has been notified. Expect an update within 48 hours.
            </p>
            <Button variant="link" className="text-brand-400 p-0 h-auto">Help Center & FAQs</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
