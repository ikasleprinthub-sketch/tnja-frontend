"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  TrendingUp,
  MapPin,
  Clock,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AdminDashboard() {
  const [statsData, setStatsData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);

  useEffect(() => {
    const loadNotifs = () => {
      const saved = localStorage.getItem("tnja_notifications");
      if (saved) {
        try {
          setAdminNotifications(JSON.parse(saved));
        } catch (err) {
          console.error(err);
        }
      }
    };
    loadNotifs();

    window.addEventListener("tnja_notifications_updated", loadNotifs);
    return () => {
      window.removeEventListener("tnja_notifications_updated", loadNotifs);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const token = localStorage.getItem("token");
        
        const [statsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/admin/stats`, {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/auth/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
        ]);

        if (!statsRes.ok) throw new Error(`Stats Server error: ${statsRes.status}`);
        if (!profileRes.ok) throw new Error(`Profile Server error: ${profileRes.status}`);

        const stats = await statsRes.json();
        const profile = await profileRes.json();
        
        setStatsData(stats);
        setUserData(profile.user);
      } catch (err: any) {
        console.error("Failed to fetch dashboard data", err);
        setError(err.message || "Failed to connect to the backend server.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        <p className="font-medium">Fetching statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            {error}. Please ensure the backend server and database are running.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#FF7400] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const stats = [
    { label: "Total Members", value: statsData?.counts?.MEMBER || 0, icon: Users, color: "bg-[#FF7400]", trend: "Active" },
    { label: "Organizations", value: statsData?.counts?.CLUB || 0, icon: Building2, color: "bg-purple-500", trend: "Verified" },
    { label: "Active Players", value: statsData?.counts?.STUDENT || 0, icon: GraduationCap, color: "bg-emerald-500", trend: "Players" },
    { label: "Coaches", value: statsData?.counts?.COACH || 0, icon: ShieldCheck, color: "bg-amber-500", trend: "Verified" },
  ];

  const recentApprovals = statsData?.recentApprovals || [];
  const districtName = userData?.district?.name || "State Board";

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{(userData?.role === 'SUPER_ADMIN' || userData?.role === 'CEO') ? 'State' : 'District'} Dashboard</h1>
          <p className="text-slate-500">Overview for {districtName}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-2 bg-orange-50 text-[#FF7400] rounded-xl">
            <MapPin size={20} />
          </div>
          <span className="pr-4 font-semibold text-slate-700">{districtName}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-xl hover:shadow-orange-500/5 transition-all"
          >
            <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                <TrendingUp size={12} />
                {stat.trend}
              </span>
            </div>
            
            {/* Subtle background decoration */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.color} opacity-[0.03] rounded-full`}></div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Approvals List */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-800">Pending Approvals</h2>
            <Link href="/dashboard/admin/approvals" className="text-[#FF7400] font-semibold text-sm hover:underline flex items-center gap-1">
              View All <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {recentApprovals.map((item: any, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                    item.type === "Club" ? "bg-purple-100 text-purple-600" : 
                    item.type === "Player" ? "bg-orange-100 text-[#FF7400]" : "bg-amber-100 text-amber-600"
                  }`}>
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{item.name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} /> {new Date(item.createdAt).toLocaleDateString()} • {item.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    href="/dashboard/admin/approvals"
                    className="px-4 py-2 bg-[#FF7400] text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
            {recentApprovals.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                No pending applications at the moment.
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Location Based Stats - Super Admin Only */}
          {(userData?.role === 'SUPER_ADMIN' || userData?.role === 'CEO') && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl"
            >
              <h2 className="text-xl font-bold mb-6">Taluk Breakdown</h2>
              <div className="space-y-6">
                {(statsData?.talukBreakdown || []).map((taluk: any, idx: number) => (
                  <div key={taluk.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{taluk.name}</span>
                      <span className="font-bold">{taluk.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(taluk.count / Math.max(...(statsData?.talukBreakdown?.map((t: any) => t.count) || [1]))) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full ${
                          idx === 0 ? "bg-[#FF7400]" : 
                          idx === 1 ? "bg-orange-400" : 
                          idx === 2 ? "bg-purple-500" : "bg-emerald-500"
                        }`}
                      ></motion.div>
                    </div>
                  </div>
                ))}
                {(!statsData?.talukBreakdown || statsData.talukBreakdown.length === 0) && (
                  <p className="text-slate-500 text-sm italic">No data available yet.</p>
                )}
              </div>

              <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold mb-2">Registration Flow</h4>
                <p className="text-xs text-slate-400 mb-4">Live distribution of registrations across taluks.</p>
                <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl text-xs hover:bg-orange-100 transition-colors">
                  Download Report
                </button>
              </div>
            </motion.div>
          )}

          {/* Notifications Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800">Recent Notifications</h4>
            {adminNotifications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                No notifications found.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {adminNotifications.map((n: any) => (
                  <div key={n.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100/50 transition-colors flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 bg-[#FF7400] rounded-full mt-1.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed text-left">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
