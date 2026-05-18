"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Eye,
  Search,
  Filter,
  MessageSquare,
  Building2,
  User,
  GraduationCap,
  Shield,
  RefreshCw,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
} from "lucide-react";

type ApprovalType = "CLUB" | "STUDENT" | "COACH" | "MEMBER";

interface Application {
  id: string;
  name: string;       // display name resolved below
  subtitle: string;   // e.g. "President: X" or "Age: 16 • Club"
  date: string;
  status: string;
  email: string;
  rawData: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const TYPE_MAP: Record<ApprovalType, string> = {
  CLUB: "club",
  STUDENT: "student",
  COACH: "coach",
  MEMBER: "member",
};

function resolveApplication(raw: any, type: ApprovalType): Application {
  let name = "";
  let subtitle = "";
  let email = raw.email || "";

  switch (type) {
    case "CLUB":
      name = raw.name;
      subtitle = `President: ${raw.president} • Secretary: ${raw.secretary}`;
      break;
    case "STUDENT":
      name = raw.fullName;
      subtitle = `Age: ${raw.age} • ${raw.club?.name || "No Club"}`;
      break;
    case "COACH":
      name = raw.fullName;
      subtitle = `${raw.presentGradeInJudo} • ${raw.deptName}`;
      break;
    case "MEMBER":
      name = raw.fullName;
      subtitle = `${raw.employmentType || "Member"} • ${raw.city}`;
      break;
  }

  return {
    id: raw.id,
    name,
    subtitle,
    date: raw.createdAt ? new Date(raw.createdAt).toLocaleDateString("en-IN") : "-",
    status: raw.status || "N/A",
    email,
    rawData: raw,
  };
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<ApprovalType>("CLUB");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Application | null>(null);
  const [remark, setRemark] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const tabs = [
    { id: "CLUB" as const, label: "Clubs / Orgs", icon: Building2 },
    { id: "STUDENT" as const, label: "Players", icon: GraduationCap },
    { id: "COACH" as const, label: "Coaches", icon: Shield },
    { id: "MEMBER" as const, label: "Members", icon: User },
  ];

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/applications/pending?type=${activeTab}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const json = await res.json();
      const raw: any[] = json.data || [];
      setApplications(raw.map((r) => resolveApplication(r, activeTab)));
    } catch (err) {
      showToast("Failed to load applications. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchApplications();
    setSearchQuery("");
  }, [fetchApplications]);

  const filteredData = applications.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = async (item: Application) => {
    setActionLoading(item.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/application/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ id: item.id, type: TYPE_MAP[activeTab], status: "APPROVED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Approval failed");
      showToast(`✅ ${item.name} approved! Password email sent to ${item.email}`, "success");
      fetchApplications();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (item: Application) => {
    setSelectedItem(item);
    setRemark("");
    setIsRejectModalOpen(true);
  };

  const openDetailModal = (item: Application) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleReject = async () => {
    if (!remark.trim()) return showToast("Please enter a rejection reason", "error");
    if (!selectedItem) return;
    setActionLoading(selectedItem.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/application/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedItem.id,
          type: TYPE_MAP[activeTab],
          status: "REJECTED",
          remark,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rejection failed");
      showToast(`❌ ${selectedItem.name} rejected. Notification email sent.`, "success");
      setIsRejectModalOpen(false);
      fetchApplications();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor: Record<string, string> = {
    PENDING:  "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-6">
      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Pending Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">
            Review and approve registrations. An email with login credentials is sent automatically on approval.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm shadow-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#FF7400] text-white shadow-lg shadow-orange-500/20"
                : "text-slate-500 hover:text-[#FF7400] hover:bg-orange-50"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()}s by name or email...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
          <Filter size={20} />
          Filters
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FF7400]" />
            <p className="text-slate-400 font-medium">Loading applications…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Applicant</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Submitted</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {filteredData.map((item) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF7400] to-[#E56900] text-white flex items-center justify-center font-bold text-xl shadow-md">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{item.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Mail size={14} className="text-slate-400" />
                          {item.email}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm text-slate-600">{item.date}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor[item.status] || "bg-slate-100 text-slate-500"}`}>
                          <Clock size={11} />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="p-2 text-slate-400 hover:text-[#FF7400] hover:bg-orange-50 rounded-lg transition-all"
                            title="View Full Application"
                          >
                            <Eye size={20} />
                          </button>
                          {item.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                disabled={actionLoading === item.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all font-semibold text-sm disabled:opacity-50"
                                title="Approve & Send Email"
                              >
                                {actionLoading === item.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Check size={16} />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(item)}
                                disabled={actionLoading === item.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-all font-semibold text-sm disabled:opacity-50"
                                title="Reject"
                              >
                                <X size={16} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredData.length === 0 && !loading && (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-400">No pending applications found</h3>
                <p className="text-slate-400 mt-1">Try adjusting your filters or check back later.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Application Details</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={22} className="text-slate-500" />
                </button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(selectedItem.rawData)
                    .filter(([k]) => !["password", "id"].includes(k))
                    .map(([key, val]: any) => {
                      const isUploadUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.includes("/uploads/"));
                      return (
                        <tr key={key} className="border-b border-slate-100 last:border-0">
                          <td className="py-3.5 pr-4 font-semibold text-slate-500 capitalize w-44">
                            {key.replace(/([A-Z])/g, " $1")}
                          </td>
                          <td className="py-3.5 text-slate-800 break-words">
                            {isUploadUrl ? (
                              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-150 w-fit">
                                {val.toLowerCase().endsWith(".pdf") ? (
                                  <div className="p-2.5 bg-red-50 text-red-500 rounded-lg">
                                    <FileText size={20} />
                                  </div>
                                ) : (
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                    <img src={val} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-1 pr-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document File</span>
                                  <div className="flex gap-2">
                                    <a 
                                      href={val} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:text-[#FF7400] hover:border-[#FF7400] rounded-md transition-all font-semibold text-xs shadow-sm"
                                    >
                                      <Eye size={12} />
                                      View
                                    </a>
                                    <a 
                                      href={val} 
                                      download
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF7400] text-white hover:bg-[#E56900] rounded-md transition-all font-bold text-xs shadow-sm"
                                    >
                                      <Download size={12} />
                                      Download
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ) : typeof val === "object" && val !== null ? (
                              (val as any).name || JSON.stringify(val)
                            ) : (
                              String(val ?? "-")
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Reject Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isRejectModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Rejection Remarks</h3>
                  <p className="text-slate-500">
                    Provide a reason for rejecting <strong>{selectedItem.name}</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 mb-5 text-sm text-amber-800">
                <Mail size={16} className="mt-0.5 shrink-0" />
                A rejection notification email will be sent to <strong>{selectedItem.email}</strong>
              </div>

              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter rejection reason…"
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none mb-6"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="flex-grow py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!actionLoading}
                  className="flex-grow py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                  Reject & Notify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
