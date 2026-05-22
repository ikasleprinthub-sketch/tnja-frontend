"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Lock,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Calendar,
  AlertCircle,
  Pencil,
  Trash2,
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

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
    entryFee: "",
    totalSlots: "",
    ageGroup: "",
    weightCategory: "",
  });

  const [editData, setEditData] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
    entryFee: "",
    totalSlots: "",
    ageGroup: "",
    weightCategory: "",
  });

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
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
      }
    } catch (err) {
      console.error("Failed to load tournaments", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

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
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: action === "APPROVE" ? "APPROVED" : "REJECTED" }),
      });
      if (!res.ok) throw new Error("Failed to update registration");
      setRegistrations((prev) => ({
        ...prev,
        [tournamentId]: prev[tournamentId].map((r) =>
          r.id === registrationId ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : r
        ),
      }));
      showToast(`Registration ${action === "APPROVE" ? "approved" : "rejected"}.`, "success");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    }
  };

  const handleOpenEdit = (tournament: any) => {
    setEditData({
      title: tournament.title,
      date: new Date(tournament.date).toISOString().split("T")[0],
      location: tournament.location,
      description: tournament.description,
      entryFee: String(tournament.entryFee),
      totalSlots: String(tournament.totalSlots),
      ageGroup: tournament.ageGroup || "",
      weightCategory: tournament.weightCategory || "",
    });
    setEditingTournament(tournament);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setFormData({ title: "", date: "", location: "", description: "", entryFee: "", totalSlots: "", ageGroup: "", weightCategory: "" });
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

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-100",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
    REJECTED: "bg-red-50 text-red-700 border-red-100",
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
          <h1 className="text-3xl font-bold text-slate-800">Club Tournaments</h1>
          <p className="text-slate-500 mt-1">Create private tournaments visible only to your paid club players</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-4 bg-[#FF7400] text-white font-bold rounded-2xl shadow-lg shadow-[#FF7400]/20 hover:scale-105 active:scale-95 transition-all w-fit"
        >
          <Plus size={20} />
          Create Tournament
        </button>
      </div>

      

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tournaments..."
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
                      
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#FF7400]" />{new Date(tournament.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#FF7400]" />{tournament.location}</span>
                      <span className="flex items-center gap-1.5"><IndianRupee size={14} className="text-[#FF7400]" />Entry: ₹{tournament.entryFee}</span>
                      <span className="flex items-center gap-1.5"><Users size={14} className="text-[#FF7400]" />{tournament.registrationCount ?? 0} / {tournament.totalSlots} Registered</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
              </div>

              {/* Registrations List */}
              <AnimatePresence>
                {expandedId === tournament.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 overflow-hidden"
                  >
                    <div className="p-6">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Registered Players</h4>
                      {!registrations[tournament.id] || registrations[tournament.id].length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                          No players have registered yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {registrations[tournament.id].map((reg) => (
                            <div
                              key={reg.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#FF7400]/10 text-[#FF7400] flex items-center justify-center font-bold text-lg">
                                  {reg.player?.fullName?.charAt(0) || "P"}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{reg.player?.fullName || "—"}</p>
                                  <p className="text-xs text-slate-400">{reg.player?.permanentId || reg.player?.tempId || "—"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor[reg.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                  {reg.status}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${reg.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                                  {reg.isPaid ? "Paid" : "Unpaid"}
                                </span>
                                {reg.status === "PENDING" && reg.isPaid && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApproveReg(tournament.id, reg.id, "APPROVE")}
                                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleApproveReg(tournament.id, reg.id, "REJECT")}
                                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
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
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input type="date" required value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location</label>
                    <input type="text" required value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input type="number" required min="1" value={editData.entryFee} onChange={(e) => setEditData({ ...editData, entryFee: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Slots</label>
                    <input type="number" required min="2" value={editData.totalSlots} onChange={(e) => setEditData({ ...editData, totalSlots: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Age Group</label>
                    <select value={editData.ageGroup} onChange={(e) => setEditData({ ...editData, ageGroup: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                      <option value="">All Ages</option>
                      <option value="U-12">Under 12</option>
                      <option value="U-15">Under 15</option>
                      <option value="U-18">Under 18</option>
                      <option value="U-21">Under 21</option>
                      <option value="SENIOR">Senior (21+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Weight Category</label>
                    <select value={editData.weightCategory} onChange={(e) => setEditData({ ...editData, weightCategory: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold">
                      <option value="">All Categories</option>
                      <option value="-44kg">-44 kg</option>
                      <option value="-48kg">-48 kg</option>
                      <option value="-52kg">-52 kg</option>
                      <option value="-57kg">-57 kg</option>
                      <option value="-63kg">-63 kg</option>
                      <option value="-70kg">-70 kg</option>
                      <option value="-78kg">-78 kg</option>
                      <option value="+78kg">+78 kg</option>
                      <option value="OPEN">Open Weight</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea required value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full h-28 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none" />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => setEditingTournament(null)}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitLoading}
                    className="flex-1 py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                    {submitLoading ? <Loader2 size={20} className="animate-spin" /> : <><Pencil size={18} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <p className="text-slate-500 text-sm">Only paid players from your club will see and can join this tournament.</p>
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
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Club Championship 2026"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Club Dojo, Chennai"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  {/* Entry Fee */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                      placeholder="Enter amount in ₹"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  {/* Total Slots */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Slots</label>
                    <input
                      type="number"
                      required
                      min="2"
                      value={formData.totalSlots}
                      onChange={(e) => setFormData({ ...formData, totalSlots: e.target.value })}
                      placeholder="e.g. 32"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  {/* Age Group */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Age Group</label>
                    <select
                      value={formData.ageGroup}
                      onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="">All Ages</option>
                      <option value="U-12">Under 12</option>
                      <option value="U-15">Under 15</option>
                      <option value="U-18">Under 18</option>
                      <option value="U-21">Under 21</option>
                      <option value="SENIOR">Senior (21+)</option>
                    </select>
                  </div>

                  {/* Weight Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Weight Category</label>
                    <select
                      value={formData.weightCategory}
                      onChange={(e) => setFormData({ ...formData, weightCategory: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="">All Categories</option>
                      <option value="-44kg">-44 kg</option>
                      <option value="-48kg">-48 kg</option>
                      <option value="-52kg">-52 kg</option>
                      <option value="-57kg">-57 kg</option>
                      <option value="-63kg">-63 kg</option>
                      <option value="-70kg">-70 kg</option>
                      <option value="-78kg">-78 kg</option>
                      <option value="+78kg">+78 kg</option>
                      <option value="OPEN">Open Weight</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tournament rules, schedule, prize details..."
                      className="w-full h-28 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Payment notice */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-sm text-amber-700">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>Entry fee will be collected from players via Razorpay. Unpaid players will not be able to register.</span>
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
    </div>
  );
}
