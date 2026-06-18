import React, { useState } from 'react';
import { 
  BarChart2, TrendingUp, Users, Award, 
  ArrowUpRight, ArrowDownRight, Calendar, ChevronDown 
} from 'lucide-react';

export default function TutorAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('Last 30 Days');

  // Dummy Data - LKR වලින් අප්ඩේට් කර ඇත
  const stats = [
    { title: 'Total Revenue', value: 'LKR 725,000', change: '+12.5%', isPositive: true, icon: TrendingUp, color: 'text-emerald-500' },
    { title: 'Active Students', value: '1,240', change: '+8.2%', isPositive: true, icon: Users, color: 'text-blue-500' },
    { title: 'Exam Enrollments', value: '3,840', change: '-2.1%', isPositive: false, icon: BarChart2, color: 'text-amber-500' },
    { title: 'Average Pass Rate', value: '78.4%', change: '+4.3%', isPositive: true, icon: Award, color: 'text-purple-500' },
  ];

  const popularExams = [
    { id: 1, name: 'Advanced Java Programming Mock 2026', enrollments: 450, revenue: 'LKR 225,000', rating: 4.8 },
    { id: 2, name: 'Data Structures & Algorithms Deep Dive', enrollments: 380, revenue: 'LKR 190,000', rating: 4.9 },
    { id: 3, name: 'Database Systems Mid-Term Prep', enrollments: 290, revenue: 'LKR 145,000', rating: 4.6 },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track your course performance, student engagement, and earnings.</p>
        </div>
        
        {/* Time Filter Button */}
        <div className="relative">
          <button className="flex items-center gap-2 bg-[#0d1527] border border-gray-800 hover:border-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-all">
            <Calendar size={16} className="text-gray-400" />
            {timeRange}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#0d1527] border border-gray-800/60 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-gray-400 text-sm font-medium">{stat.title}</span>
                <div className={`p-2 bg-gray-900/50 rounded-xl border border-gray-800 ${stat.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-0.5 ${
                  stat.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {stat.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="lg:col-span-2 bg-[#0d1527] border border-gray-800/60 p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-base">Revenue & Growth Overview (LKR)</h3>
            <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">Monthly View</span>
          </div>
          
          {/* Custom Visual Bar representation using CSS */}
          <div className="h-64 flex items-end justify-between gap-2 pt-4 px-2">
            {[40, 55, 45, 60, 75, 65, 85, 70, 95, 80, 110, 130].map((val, idx) => (
              <div key={idx} className="w-full flex flex-col items-center gap-2 group">
                <div className="w-full bg-blue-600/20 group-hover:bg-blue-500/40 rounded-t-lg transition-all relative" style={{ height: `${val}px` }}>
                  {/* Tooltip on hover showing LKR values */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    LKR {val * 1000}
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 uppercase">{['J','F','M','A','M','J','J','A','S','O','N','D'][idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Exams List */}
        <div className="bg-[#0d1527] border border-gray-800/60 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-base mb-4">Top Performing Exams</h3>
            <div className="space-y-4">
              {popularExams.map((exam) => (
                <div key={exam.id} className="p-3 bg-gray-900/30 border border-gray-800/40 rounded-xl hover:border-gray-700/60 transition-all">
                  <h4 className="text-sm font-medium text-gray-200 line-clamp-1">{exam.name}</h4>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                    <span>{exam.enrollments} Students</span>
                    <span className="text-emerald-400 font-medium">{exam.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full text-center text-xs text-blue-400 hover:text-blue-300 font-medium mt-4 pt-3 border-t border-gray-800/60 transition-colors">
            View All Exam Insights
          </button>
        </div>
      </div>
    </div>
  );
}