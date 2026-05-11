
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Input } from '@/ui/input';
import { getCurrentUser, getReports, getUnreadIncomingCommentsCount } from '@/store';
import { Report, ReportStatus } from '@/types';

interface DashboardViewProps {
  onNewReport: () => void;
  onViewReport: (report: Report) => void;
}

const statusColors: Record<ReportStatus, string> = {
  'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Resolved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-slate-100 text-slate-700 border-slate-200'
};

const statusIcons: Record<ReportStatus, React.ReactNode> = {
  'Pending': <Clock size={14} />,
  'In Progress': <AlertCircle size={14} />,
  'Resolved': <CheckCircle2 size={14} />,
  'Rejected': <AlertCircle size={14} />
};

export default function DashboardView({ onNewReport, onViewReport }: DashboardViewProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [user] = useState(getCurrentUser());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [reportScope, setReportScope] = useState<'mine' | 'all'>('mine');

  useEffect(() => {
    const loadReports = async () => {
      try {
        const reportsData = await getReports();
        setReports(reportsData);
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadReports();
  }, []);

  const scopedReports = reportScope === 'mine' && user
    ? reports.filter((r) => r.userId === user.id)
    : reports;

  const filteredReports = scopedReports.filter(r =>
    r.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Your Dashboard</h1>
          <p className="text-slate-500">Track and manage your submitted road reports.</p>
        </div>
        <Button size="lg" className="bg-brand-600 hover:bg-brand-700 rounded-2xl h-12 px-6 shadow-md" onClick={onNewReport}>
          <Plus className="mr-2 h-5 w-5" /> Report New Issue
        </Button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="flex flex-col md:row items-center gap-4 mb-8">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant={reportScope === 'mine' ? 'default' : 'outline'}
              className="h-12 rounded-2xl"
              onClick={() => setReportScope('mine')}
            >
              My Reports
            </Button>
            <Button
              variant={reportScope === 'all' ? 'default' : 'outline'}
              className="h-12 rounded-2xl"
              onClick={() => setReportScope('all')}
            >
              View All Reports
            </Button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search by issue or location..." 
              className="pl-10 h-12 rounded-2xl bg-slate-50 border-none focus-visible:ring-brand-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 rounded-2xl font-medium">
             <Filter size={18} className="mr-2" /> {reportScope === 'mine' ? 'My Reports' : 'All Reports'}
          </Button>
        </div>

        {isInitialLoading ? (
          <div className="py-20 px-4">
            <div className="text-center mb-10">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Loading reports...</h3>
              <p className="text-slate-500">Fetching your latest issues from the database.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="rounded-2xl overflow-hidden border border-slate-100">
                  <div className="aspect-video w-full bg-slate-100 animate-pulse" />
                  <CardHeader className="p-5 space-y-3">
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="h-6 w-2/3 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const unreadIncoming = getUnreadIncomingCommentsCount(user, report);

              return (
                <Card 
                  key={report.id} 
                  className="group hover:border-brand-300 transition-all cursor-pointer rounded-2xl overflow-hidden"
                  onClick={() => onViewReport(report)}
                >
                <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                  <img 
                    src={report.image} 
                    alt={report.issueType} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <Badge className={`absolute top-4 right-4 flex items-center gap-1 px-3 py-1 border shadow-lg ${statusColors[report.status]}`}>
                    {statusIcons[report.status]} {report.status}
                  </Badge>
                </div>
                <CardHeader className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
                    <Calendar size={12} /> {new Date(report.timestamp).toLocaleDateString()}
                  </div>
                  {unreadIncoming > 0 && (
                    <Badge className="mb-3 w-fit bg-red-100 text-red-700 border border-red-200 rounded-full">
                      <MessageSquare size={12} className="mr-1" />
                      New message ({unreadIncoming})
                    </Badge>
                  )}
                  <CardTitle className="text-xl mb-2">{report.issueType}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <MapPin size={14} className="text-brand-500" /> {report.location}
                  </div>
                </CardHeader>
                <div className="px-5 pb-5 flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> Last updated: Recently
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                    <ChevronRight size={16} className="group-hover:text-brand-600 transition-colors" />
                  </div>
                </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold mb-2">No reports found</h3>
            <p className="text-slate-500 mb-8">
              {reportScope === 'mine'
                ? "You haven't submitted any reports yet, or no matches for your search."
                : 'No matching reports found across all submissions.'}
            </p>
            <Button className="bg-brand-600 rounded-2xl h-12 px-6" onClick={onNewReport}>
              Submit Your First Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
