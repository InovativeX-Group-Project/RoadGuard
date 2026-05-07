
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BarChart2,
  MoreVertical,
  ChevronRight,
  Eye,
  RefreshCcw,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { getReports, saveReport, getCurrentUser } from '@/store';
import { Report, ReportStatus, IssueType } from '@/types';

interface AdminDashboardViewProps {
  onViewReport: (id: string) => void;
}

export default function AdminDashboardView({ onViewReport }: AdminDashboardViewProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setReports(getReports());
  }, []);

  const handleUpdateStatus = (id: string, newStatus: ReportStatus) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    const updatedReport: Report = {
      ...report,
      status: newStatus,
      history: [
        ...report.history,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          updatedBy: 'Municipal Admin'
        }
      ]
    };

    saveReport(updatedReport);
    setReports(getReports());
    toast.success(`Report #${id.slice(-6)} updated to ${newStatus}`);
  };

  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = r.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.issueType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 flex flex-col md:row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Municipal Management Hub</h1>
          <p className="text-slate-500 font-medium">Monitoring and processing road infrastructure reports.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl h-11 border-slate-200">
            <BarChart2 className="mr-2 h-4 w-4" /> Reports Export
          </Button>
          <Button className="rounded-2xl h-11 bg-slate-900">
            <Users className="mr-2 h-4 w-4" /> Team Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Active Requests", value: reports.filter(r => r.status !== 'Resolved').length, icon: <AlertCircle className="text-amber-500" />, bg: "bg-amber-50" },
          { label: "Resolved Today", value: "8", icon: <CheckCircle2 className="text-emerald-500" />, bg: "bg-emerald-50" },
          { label: "Avg Fix Time", value: "2.4d", icon: <Clock className="text-blue-500" />, bg: "bg-blue-50" },
          { label: "Citizen Satisfaction", value: "94%", icon: <Users className="text-brand-500" />, bg: "bg-brand-50" }
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-slate-100 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-slate-500 text-sm font-medium">{stat.label}</div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[40px] border-slate-100 bg-white shadow-xl overflow-hidden min-h-[600px]">
        <div className="p-8 border-b border-slate-50 flex flex-col lg:row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search by area or type..." 
                className="pl-10 h-11 rounded-xl bg-slate-50 border-none focus-visible:ring-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium bg-slate-50 px-4 py-2 rounded-full">
            <RefreshCcw size={14} className="animate-spin-slow" /> Real-time Feed Active
          </div>
        </div>

        <div className="p-4">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="rounded-l-2xl font-bold text-slate-800">Report</TableHead>
                <TableHead className="font-bold text-slate-800">Issue Type</TableHead>
                <TableHead className="font-bold text-slate-800">Location</TableHead>
                <TableHead className="font-bold text-slate-800">Status</TableHead>
                <TableHead className="font-bold text-slate-800">Date</TableHead>
                <TableHead className="rounded-r-2xl text-right font-bold text-slate-800">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id} className="group hover:bg-slate-50 border-slate-50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img src={report.image} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold text-sm text-brand-600">#{report.id.slice(-6)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-100 rounded-lg">
                         {report.issueType}
                       </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <MapPin size={14} className="text-brand-500" /> {report.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={report.status} 
                      onValueChange={(val) => handleUpdateStatus(report.id, val as ReportStatus)}
                    >
                      <SelectTrigger className={`h-9 w-32 rounded-lg text-xs font-bold border-none shadow-none focus:ring-0
                        ${report.status === 'Pending' ? 'bg-amber-100 text-amber-700' : ''}
                        ${report.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : ''}
                        ${report.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : ''}
                      `}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-500">
                    {new Date(report.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-brand-50 hover:text-brand-600" onClick={() => onViewReport(report.id)}>
                        <Eye size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500">
                        <Flag size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                        <MoreVertical size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredReports.length === 0 && (
            <div className="py-32 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">No infrastructure reports matching your filters.</p>
            </div>
          )}
        </div>
      </Card>
      
      <div className="mt-8 flex justify-center">
        <Button variant="ghost" className="text-slate-400 hover:text-brand-600 transition-colors">
          View Full Audit Log <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
