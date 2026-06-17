"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Plus,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Calendar,
  AlertCircle,
  Pencil,
  Trash2,
  ChevronRight,
  Globe,
  Send,
  MessageSquare,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ClubTournamentsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Record<string, any[]>>({});
  const [loadingRegs, setLoadingRegs] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { id: string; senderRole: string; senderName: string; message: string; createdAt: string }[]>>({});
  const [tMessages, setTMessages] = useState<Record<string, { id: string; senderRole: string; senderName: string; message: string; createdAt: string }[]>>({});
  const [tReplyTexts, setTReplyTexts] = useState<Record<string, string>>({});
  const [tReplyLoading, setTReplyLoading] = useState<Record<string, boolean>>({});
  const [regSearch, setRegSearch] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    dateFrom: "",
    dateTo: "",
    location: "",
    description: "",
    entryFee: "",
    totalSlots: "",
    ageFrom: "0",
    ageTo: "100",
    gender: "BOTH",
    allowBPL: false,
    beltEligibility: "",
    level: "DISTRICT",
    zoneId: "",
  });

  const [editData, setEditData] = useState({
    title: "",
    dateFrom: "",
    dateTo: "",
    location: "",
    description: "",
    entryFee: "",
    totalSlots: "",
    ageFrom: "0",
    ageTo: "100",
    gender: "BOTH",
    allowBPL: false,
    beltEligibility: "",
    level: "DISTRICT",
    zoneId: "",
  });

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [approvedTournaments, setApprovedTournaments] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<"mine" | "approved">("mine");
  const [approvedSearch, setApprovedSearch] = useState("");

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApprovedTournaments = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setApprovedTournaments(Array.isArray(json) ? json : json.tournaments || []);
      }
    } catch (err) {
      console.error("Failed to load approved tournaments", err);
    }
  }, []);

  const fetchTournamentMessages = async (tournamentId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTMessages((prev) => ({ ...prev, [tournamentId]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch tournament messages", err);
    }
  };

  const handleSendTournamentReply = async (tournamentId: string) => {
    const message = tReplyTexts[tournamentId]?.trim();
    if (!message) return;
    setTReplyLoading((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setTReplyTexts((prev) => { const n = { ...prev }; delete n[tournamentId]; return n; });
      await fetchTournamentMessages(tournamentId);
      showToast("Reply sent to admin.", "success");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setTReplyLoading((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/club`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTournaments(json);
        // Fetch messages for each tournament
        json.forEach((t: any) => {
          fetchTournamentMessages(t.id);
        });
      }
    } catch (err) {
      console.error("Failed to load tournaments", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
    fetchApprovedTournaments();
  }, [fetchTournaments, fetchApprovedTournaments]);

  const fetchRegistrations = async (tournamentId: string) => {
    if (registrations[tournamentId]) {
      setExpandedId(expandedId === tournamentId ? null : tournamentId);
      return;
    }
    setLoadingRegs((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setRegistrations((prev) => ({ ...prev, [tournamentId]: json }));
        // Fetch messages for each registration
        for (const reg of json) {
          fetchMessages(tournamentId, reg.id);
        }
      }
    } catch (err) {
      console.error("Failed to load registrations", err);
    } finally {
      setLoadingRegs((prev) => ({ ...prev, [tournamentId]: false }));
      setExpandedId(tournamentId);
    }
  };

  const handleToggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      fetchRegistrations(id);
    }
  };

  const handleApproveReg = async (tournamentId: string, registrationId: string, action: "APPROVE" | "REJECT") => {
    try {
      const token = localStorage.getItem("token");
      const message = replyTexts[registrationId]?.trim() || "";
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: action === "APPROVE" ? "APPROVED" : "REJECTED", message }),
      });
      if (!res.ok) throw new Error("Failed to update registration");
      setRegistrations((prev) => ({
        ...prev,
        [tournamentId]: prev[tournamentId].map((r) =>
          r.id === registrationId ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : r
        ),
      }));
      setReplyTexts((prev) => { const n = { ...prev }; delete n[registrationId]; return n; });
      await fetchMessages(tournamentId, registrationId);
      showToast(`Registration ${action === "APPROVE" ? "approved" : "rejected"}.`, "success");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    }
  };

  const fetchMessages = async (tournamentId: string, registrationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${registrationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => ({ ...prev, [registrationId]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const handleSendReply = async (tournamentId: string, registrationId: string) => {
    const message = replyTexts[registrationId]?.trim();
    if (!message) return;
    setReplyLoading((prev) => ({ ...prev, [registrationId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${registrationId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setReplyTexts((prev) => { const n = { ...prev }; delete n[registrationId]; return n; });
      // Refresh messages after sending
      await fetchMessages(tournamentId, registrationId);
      showToast("Reply sent to player.", "success");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setReplyLoading((prev) => ({ ...prev, [registrationId]: false }));
    }
  };

  const handleOpenEdit = (tournament: any) => {
    // If tournament has a zoneId, ensure level is set to "ZONE"
    const level = tournament.zoneId ? "ZONE" : (tournament.level || "DISTRICT");

    setEditData({
      title: tournament.title,
      dateFrom: new Date(tournament.date).toISOString().split("T")[0],
      dateTo: tournament.dateTo ? new Date(tournament.dateTo).toISOString().split("T")[0] : "",
      location: tournament.location,
      description: tournament.description,
      entryFee: String(tournament.entryFee),
      totalSlots: String(tournament.totalSlots),
      ageFrom: String(tournament.ageFrom || 0),
      ageTo: String(tournament.ageTo || 100),
      gender: tournament.gender || "BOTH",
      allowBPL: tournament.allowBPL || false,
      beltEligibility: tournament.beltEligibility || "",
      level: level,
      zoneId: tournament.zoneId || "",
    });
    setEditingTournament(tournament);
  };

  const handleUpdate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!editingTournament) return;

    // Validate zone for zonal tournaments
    if (editData.level === "ZONE" && !editData.zoneId) {
      showToast("Please select a zone for zonal tournaments.", "error");
      return;
    }

    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${editingTournament.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editData,
          entryFee: Number(editData.entryFee),
          totalSlots: Number(editData.totalSlots),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update tournament");
      showToast("Tournament updated successfully.", "success");
      setEditingTournament(null);
      fetchTournaments();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (tournamentId: string) => {
    if (!confirm("Are you sure you want to delete this tournament? All registrations will also be removed.")) return;
    setDeletingId(tournamentId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete tournament");
      showToast("Tournament deleted.", "success");
      setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
      if (expandedId === tournamentId) setExpandedId(null);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault();

    // Validate zone for zonal tournaments
    if (formData.level === "ZONE" && !formData.zoneId) {
      showToast("Please select a zone for zonal tournaments.", "error");
      return;
    }

    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/club/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          entryFee: Number(formData.entryFee),
          totalSlots: Number(formData.totalSlots),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create tournament");
      showToast("Tournament created! Your club players will be notified.", "success");
      setIsCreateModalOpen(false);
      setFormData({ title: "", dateFrom: "", dateTo: "", location: "", description: "", entryFee: "", totalSlots: "", ageFrom: "0", ageTo: "100", gender: "BOTH", allowBPL: false, beltEligibility: "", level: "DISTRICT", zoneId: "" });
      fetchTournaments();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter((t) =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );


  // Returns true if the tournament end date (or start date) is in the past
  const isExpired = (t: any): boolean => {
    const endDate = t.dateTo || t.date;
    if (!endDate) return false;
    const d = new Date(endDate);
    d.setHours(23, 59, 59, 999); // end of that day
    return d < new Date();
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#FF7400]">Tournament Details</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your club tournaments and approve player registrations</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#FF7400] text-white font-bold rounded-xl shadow-lg shadow-[#FF7400]/20 hover:scale-105 active:scale-95 transition-all w-fit border border-[#E56900]"
        >
          <Plus size={18} />
          Create Tournament
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSection("mine")}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeSection === "mine" ? "bg-white text-[#FF7400] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          My Tournaments ({tournaments.length})
        </button>
        <button
          onClick={() => setActiveSection("approved")}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeSection === "approved" ? "bg-white text-[#FF7400] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Globe size={13} className="inline mr-1.5" />
          Approved Tournaments ({approvedTournaments.length})
        </button>
      </div>

      {/* ══ MY TOURNAMENTS SECTION ════════════════════════════════════════════ */}
      {activeSection === "mine" && (<>
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search my tournaments..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
        />
      </div>

      {/* Tournament List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Trophy size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-500">No Tournaments Yet</h3>
          <p className="text-slate-400 text-sm mt-2">Create your first private club tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTournaments.map((tournament) => (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Tournament Header */}
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#FF7400]/10 text-[#FF7400] rounded-2xl shrink-0">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-slate-800">{tournament.title}</h3>
                      {/* Status badge */}
                      {isExpired(tournament) ? (
                        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 border-slate-300">
                          <AlertCircle size={11} /> Expired
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          tournament.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          tournament.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {tournament.status === "APPROVED" ? <><CheckCircle2 size={12}/> Approved</> :
                           tournament.status === "REJECTED" ? <><XCircle size={12}/> Rejected</> : <><AlertCircle size={12}/> Pending</>}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#FF7400]" />{new Date(tournament.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#FF7400]" />{tournament.location}</span>
                      <span className="flex items-center gap-1.5"><IndianRupee size={14} className="text-[#FF7400]" />Entry: ₹{tournament.entryFee}</span>
                      <span className="flex items-center gap-1.5"><Users size={14} className="text-[#FF7400]" />{tournament.registrationCount ?? 0} / {tournament.totalSlots} Registered</span>
                    </div>
                    {/* Rejection remark / Admin reply */}
                    {tournament.status === "REJECTED" && tournament.rejectionRemark && (
                      <div className="mt-3 px-4 py-2.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold flex items-start gap-2 max-w-lg">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                        <div>
                          <span className="font-black">Rejection Reason: </span>
                          {tournament.rejectionRemark}
                        </div>
                      </div>
                    )}
                    {/* Approval chain mini-badges removed as requested */}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(tournament)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl transition-all text-sm"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tournament.id)}
                      disabled={deletingId === tournament.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                    >
                      {deletingId === tournament.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      Delete
                    </button>
                    <button
                      onClick={() => handleToggleExpand(tournament.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
                    >
                      {loadingRegs[tournament.id] ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : expandedId === tournament.id ? (
                        <><ChevronUp size={15} /> Hide</>
                      ) : (
                        <><ChevronDown size={15} /> Players</>
                      )}
                    </button>
                  </div>
                  {/* Manage button — conditionally visible */}
                  {tournament.status === "APPROVED" && (
                    <Link
                      href={`/dashboard/admin/tournaments/${tournament.id}`}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Trophy size={14} /> Manage / Draw <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Tournament Chat Section */}
              <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#FF7400]" />
                  Admin Communication & Comments
                </h4>

                {/* Messages list */}
                {tMessages[tournament.id]?.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {tMessages[tournament.id].map((msg) => (
                      <div key={msg.id} className="flex items-start gap-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black ${
                          msg.senderRole === "CLUB" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-[#FF7400]"
                        }`}>
                          {msg.senderName.charAt(0)}
                        </div>
                        <div className="flex-grow">
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                            <span className="font-bold text-slate-900 mr-1.5">{msg.senderName}:</span>
                            {msg.message}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {new Date(msg.createdAt).toLocaleDateString("en-GB")} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400">No communication history yet.</p>
                )}

              </div>

              {/* Registrations Panel */}
              <AnimatePresence>
                {expandedId === tournament.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 overflow-hidden"
                  >
                    <div className="p-6 space-y-4">

                      {/* Search + Filter bar — matches screenshot top bar */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-grow">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            value={regSearch[tournament.id] || ""}
                            onChange={(e) => setRegSearch((prev) => ({ ...prev, [tournament.id]: e.target.value }))}
                            placeholder="Search Tournaments"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/30 text-sm font-medium text-slate-700 shadow-sm"
                          />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#FF7400] text-[#FF7400] font-bold rounded-xl text-sm shadow-sm hover:bg-orange-50 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                          Filter
                        </button>
                      </div>

                      {/* Registration count label */}
                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                        Registered Players{registrations[tournament.id] ? ` (${registrations[tournament.id].length})` : ""}
                      </h4>

                      {!registrations[tournament.id] || registrations[tournament.id].length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                          No players have registered yet.
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {registrations[tournament.id]
                            .filter((reg) => {
                              const q = (regSearch[tournament.id] || "").toLowerCase();
                              if (!q) return true;
                              const name = reg.player?.fullName || reg.playerName || "";
                              return name.toLowerCase().includes(q) || tournament.title.toLowerCase().includes(q);
                            })
                            .map((reg) => (
                            <div key={reg.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                              {/* Top — image + details */}
                              <div className="flex" style={{ minHeight: 200 }}>
                                <div className="w-44 flex-shrink-0 relative">
                                  <img src="/homepage/whatjudo/judo1.png" alt="Judo" className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow p-5">
                                  {/* Player Name - Heading */}
                                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                                    {reg.player?.fullName || reg.playerName || "—"}
                                  </h3>
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    {[
                                      { label: "Tournament Name", value: tournament.title },
                                      { label: "Role",            value: "Player" },
                                      { label: "Gender",          value: (() => { const g = tournament.gender; return g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : g || "—"; })() },
                                      { label: "Age",             value: (() => { const from = tournament.ageFrom, to = tournament.ageTo; if (to <= 15) return `Subjunior (${from}-${to})`; if (to <= 18) return `Cadets (${from}-${to})`; if (to <= 21) return `Juniors (${from}-${to})`; if (from > 21) return `Seniors (${from}+)`; return `Veterans (${from}+)`; })() },
                                      { label: "Date",            value: new Date(tournament.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
                                      { label: "Time",            value: new Date(tournament.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
                                      { label: "Location",        value: tournament.location },
                                      { label: "Tournament Fees", value: tournament.entryFee === 0 ? "Free" : String(tournament.entryFee) },
                                    ].map(({ label, value }) => (
                                      <div key={label}>
                                        <p className="text-[11px] font-bold text-[#FF7400] mb-0.5">{label}</p>
                                        <p className="text-sm font-semibold text-slate-700 leading-tight">{value}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Chat thread */}
                              {messages[reg.id]?.length > 0 && (
                                <div className="px-4 py-3 border-t border-slate-100 space-y-2 max-h-36 overflow-y-auto bg-slate-50/50">
                                  {messages[reg.id].map((msg) => (
                                    <div key={msg.id} className="flex items-start gap-2">
                                      <div className="w-6 h-6 rounded-full bg-[#FF7400]/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-black text-[#FF7400]">C</span>
                                      </div>
                                      <div className="flex-grow">
                                        <p className="text-xs font-bold text-slate-700 leading-snug">{msg.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          {new Date(msg.createdAt).toLocaleDateString("en-GB")} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Bottom row */}
                              <div className="flex items-center px-4 py-3 border-t border-slate-100">
                                {/* Send Reply — fixed width, orange border */}
                                <div className="w-72 rounded-[10px] p-[1.5px]" style={{ background: "linear-gradient(to right, #552700 0%, #FF0E00 25%, #FFDA00 75%, #FF7400 100%)" }}>
                                  <div className="flex items-center gap-2 bg-white rounded-[8.5px] px-3 py-2">
                                    <input
                                      type="text"
                                      placeholder="Send Reply"
                                      value={replyTexts[reg.id] || ""}
                                      onChange={(e) => setReplyTexts((prev) => ({ ...prev, [reg.id]: e.target.value }))}
                                      onKeyDown={(e) => e.key === "Enter" && handleSendReply(tournament.id, reg.id)}
                                      className="flex-grow bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none"
                                    />
                                    <button
                                      onClick={() => handleSendReply(tournament.id, reg.id)}
                                      disabled={!replyTexts[reg.id]?.trim() || replyLoading[reg.id]}
                                      className="text-slate-400 hover:text-[#FF7400] disabled:opacity-30 transition-colors shrink-0"
                                    >
                                      {replyLoading[reg.id] ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    </button>
                                  </div>
                                </div>

                                {/* Buttons pushed to far right */}
                                <div className="ml-auto flex items-center gap-2">
                                  {reg.status === "PENDING" && reg.isPaid ? (
                                    <>
                                      <button
                                        onClick={() => handleApproveReg(tournament.id, reg.id, "APPROVE")}
                                        className="px-5 py-2 bg-[#FF7400] text-white text-sm font-bold rounded-lg hover:bg-[#E56900] transition-all"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleApproveReg(tournament.id, reg.id, "REJECT")}
                                        className="px-5 py-2 bg-white border border-[#FF7400] text-slate-700 text-sm font-bold rounded-lg hover:bg-orange-50 transition-all"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                      reg.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      reg.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" :
                                      "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}>
                                      {reg.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
      </>)}

      {/* ══ APPROVED TOURNAMENTS SECTION ══════════════════════════════════════ */}
      {activeSection === "approved" && (
        <div className="space-y-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              placeholder="Search approved tournaments..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
            />
          </div>

          {approvedTournaments.filter(t =>
            !approvedSearch || t.title?.toLowerCase().includes(approvedSearch.toLowerCase())
          ).length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
              <Globe size={40} className="mx-auto mb-3 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-500">No Approved Tournaments</h3>
              <p className="text-slate-400 text-sm mt-1">No tournaments have been fully approved yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {approvedTournaments
                .filter(t => !approvedSearch || t.title?.toLowerCase().includes(approvedSearch.toLowerCase()))
                .map((t) => (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="h-24 bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center relative">
                      <Trophy size={32} className="text-white/20" />
                      <span className="absolute top-3 left-3 bg-white/20 text-white text-[9px] font-bold px-2.5 py-1 rounded-full">
                        {t.level}
                      </span>
                      {isExpired(t) ? (
                        <span className="absolute top-3 right-3 bg-slate-500/30 text-slate-300 text-[9px] font-black px-2.5 py-1 rounded-full border border-slate-400/30 flex items-center gap-1">
                          <Clock size={10} /> Expired
                        </span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Approved
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex-grow flex flex-col gap-3">
                      <h3 className="text-base font-bold text-slate-800 leading-snug">{t.title}</h3>
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-[#FF7400]" />
                          {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-[#FF7400]" />{t.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-[#FF7400]" />
                          Ages {t.ageFrom}–{t.ageTo} · {t.gender}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IndianRupee size={12} className="text-[#FF7400]" />
                          {t.entryFee === 0 ? "Free Entry" : `₹${t.entryFee}`}
                        </div>
                      </div>
                      {t.club && (
                        <p className="text-[10px] text-slate-400 font-semibold">
                          by {t.club.name}{t.club.district ? ` · ${t.club.district.name}` : ""}
                        </p>
                      )}
                      <Link
                        href={`/dashboard/admin/tournaments/${t.id}`}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Trophy size={12} /> Manage / Draw <ChevronRight size={12} />
                      </Link>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-1">Create Tournament</h2>
                  <p className="text-slate-500 text-sm">Set up a new private tournament for your club.</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleCreate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Title</label>
                    <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Club Championship 2026" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
                    <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value, zoneId: "" })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                      <option value="CLUB">Club</option><option value="DISTRICT">District</option><option value="ZONE">Zonal</option><option value="STATE">State</option><option value="NATIONAL">National</option>
                    </select>
                  </div>
                  {formData.level === "ZONE" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Zone *</label>
                      <select required value={formData.zoneId} onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                        <option value="">Select Zone</option>
                        <option value="Chennai Zone">Chennai Zone</option>
                        <option value="Salem Zone">Salem Zone</option>
                        <option value="Coimbatore Zone">Coimbatore Zone</option>
                        <option value="Trichy Zone">Trichy Zone</option>
                        <option value="Madurai Zone">Madurai Zone</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                      <option value="BOTH">Both</option><option value="MALE">Male Only</option><option value="FEMALE">Female Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date *</label>
                    <input type="date" required value={formData.dateFrom} onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (Optional)</label>
                    <input type="date" value={formData.dateTo} onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Min Age</label>
                    <input type="number" required min="0" value={formData.ageFrom} onChange={(e) => setFormData({ ...formData, ageFrom: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Age</label>
                    <input type="number" required min="0" value={formData.ageTo} onChange={(e) => setFormData({ ...formData, ageTo: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location</label>
                    <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Belt Eligibility</label>
                    <input type="text" value={formData.beltEligibility} onChange={(e) => setFormData({ ...formData, beltEligibility: e.target.value })}
                      placeholder="e.g. Yellow belt and above" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input type="number" required min="0" value={formData.entryFee} onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Slots</label>
                    <input type="number" required min="2" value={formData.totalSlots} onChange={(e) => setFormData({ ...formData, totalSlots: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3 mt-4">
                    <input type="checkbox" id="allowBpl_create" checked={formData.allowBPL} onChange={(e) => setFormData({ ...formData, allowBPL: e.target.checked })}
                      className="w-5 h-5 accent-[#FF7400]" />
                    <label htmlFor="allowBpl_create" className="text-sm font-bold text-slate-700">Allow BPL Students to Register for Free</label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full h-28 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none" />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? <Loader2 size={20} className="animate-spin" /> : <><Calendar size={18} /> Create Tournament</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Tournament Modal */}
      <AnimatePresence>
        {editingTournament && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-1">Edit Tournament</h2>
                  <p className="text-slate-500 text-sm">Update the details of this tournament.</p>
                </div>
                <button
                  onClick={() => setEditingTournament(null)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Title</label>
                    <input type="text" required value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="e.g. Club Championship 2026" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
                    <select value={editData.level} onChange={(e) => setEditData({ ...editData, level: e.target.value, zoneId: "" })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                      <option value="CLUB">Club</option><option value="DISTRICT">District</option><option value="ZONE">Zonal</option><option value="STATE">State</option><option value="NATIONAL">National</option>
                    </select>
                  </div>
                  {editData.level === "ZONE" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Zone *</label>
                      <select required value={editData.zoneId} onChange={(e) => setEditData({ ...editData, zoneId: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                        <option value="">Select Zone</option>
                        <option value="Chennai Zone">Chennai Zone</option>
                        <option value="Salem Zone">Salem Zone</option>
                        <option value="Coimbatore Zone">Coimbatore Zone</option>
                        <option value="Trichy Zone">Trichy Zone</option>
                        <option value="Madurai Zone">Madurai Zone</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                    <select value={editData.gender} onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                      <option value="BOTH">Both</option><option value="MALE">Male Only</option><option value="FEMALE">Female Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date *</label>
                    <input type="date" required value={editData.dateFrom} onChange={(e) => setEditData({ ...editData, dateFrom: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (Optional)</label>
                    <input type="date" value={editData.dateTo} onChange={(e) => setEditData({ ...editData, dateTo: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Min Age</label>
                    <input type="number" required min="0" value={editData.ageFrom} onChange={(e) => setEditData({ ...editData, ageFrom: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Age</label>
                    <input type="number" required min="0" value={editData.ageTo} onChange={(e) => setEditData({ ...editData, ageTo: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location</label>
                    <input type="text" required value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Belt Eligibility</label>
                    <input type="text" value={editData.beltEligibility} onChange={(e) => setEditData({ ...editData, beltEligibility: e.target.value })}
                      placeholder="e.g. Yellow belt and above" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input type="number" required min="0" value={editData.entryFee} onChange={(e) => setEditData({ ...editData, entryFee: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Slots</label>
                    <input type="number" required min="2" value={editData.totalSlots} onChange={(e) => setEditData({ ...editData, totalSlots: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3 mt-4">
                    <input type="checkbox" id="allowBpl_edit" checked={editData.allowBPL} onChange={(e) => setEditData({ ...editData, allowBPL: e.target.checked })}
                      className="w-5 h-5 accent-[#FF7400]" />
                    <label htmlFor="allowBpl_edit" className="text-sm font-bold text-slate-700">Allow BPL Students to Register for Free</label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea required value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full h-28 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none" />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTournament(null)}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? <Loader2 size={20} className="animate-spin" /> : <><Pencil size={18} /> Update Tournament</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
