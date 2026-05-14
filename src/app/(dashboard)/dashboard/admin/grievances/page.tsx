"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare,
  Search,
  Filter,
  Loader2,
  Clock,
  User,
  Reply,
  CheckCircle2,
  AlertCircle,
  X,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AdminGrievancePage() {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      const res = await fetch(`${API_BASE}/grievances`);
      const data = await res.json();
      if (res.ok) setGrievances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/${selectedGrievance.id}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText })
      });
      if (res.ok) {
        setReplyText("");
        setSelectedGrievance(null);
        fetchGrievances();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesSearch = 
      g.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "pending") return matchesSearch && g.status === "PENDING";
    if (filter === "replied") return matchesSearch && (g.status === "REPLAY" || g.reply);
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Grievance Management</h1>
          <p className="text-slate-500">Review and respond to complaints from students, coaches, and referees.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, ID, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all"
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
          {["all", "pending", "replied"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl font-bold capitalize transition-all ${
                filter === f ? "bg-[#FF7400] text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredGrievances.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No grievances found</h3>
            <p className="text-slate-500">All caught up! No complaints to show.</p>
          </div>
        ) : (
          filteredGrievances.map((g) => (
            <motion.div
              layoutId={g.id}
              key={g.id}
              onClick={() => {
                setSelectedGrievance(g);
                setReplyText(g.reply || "");
              }}
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-xl hover:border-brand-orange/20 transition-all cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      g.role === "PLAYER" ? "bg-purple-100 text-purple-600" : 
                      g.role === "COACH" ? "bg-orange-100 text-brand-orange" : "bg-emerald-100 text-emerald-600"
                    }`}>
                      {g.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      g.status === "PENDING" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                    }`}>
                      {g.status === "REPLAY" ? "REPLIED" : g.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-brand-orange transition-colors">{g.subject}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User size={16} />
                      {g.userName} ({g.userId})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} />
                      {new Date(g.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-orange-50 group-hover:text-[#FF7400] transition-all">
                    <Reply size={24} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {selectedGrievance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGrievance(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-orange-100 text-[#FF7400] rounded text-[10px] font-bold uppercase">{selectedGrievance.role}</span>
                      <span className="text-xs text-slate-400 font-medium">#{selectedGrievance.userId}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedGrievance.subject}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedGrievance(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF7400] rounded-xl flex items-center justify-center text-white font-bold">
                      {selectedGrievance.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{selectedGrievance.userName}</p>
                      <p className="text-xs text-slate-400">{selectedGrievance.userEmail}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedGrievance.description}
                  </p>
                </div>

                {selectedGrievance.reply && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">Current Reply</p>
                    <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 italic text-slate-700">
                      {selectedGrievance.reply}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <label className="text-sm font-bold text-slate-700 ml-4">Your Response</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-orange/20 focus:bg-white rounded-3xl outline-none transition-all min-h-[120px] resize-none"
                  />
                  <div className="flex gap-4">
                    <button
                      disabled={submitting || !replyText.trim()}
                      onClick={handleReply}
                      className="flex-grow py-4 bg-[#FF7400] text-white rounded-2xl font-bold text-lg hover:bg-[#E56900] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                      {selectedGrievance.reply ? "Update Reply" : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
