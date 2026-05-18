"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare,
  Loader2,
  Clock,
  Reply
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function GrievancePage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(data);
        fetchGrievances(data.user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchGrievances = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/grievances/user/${userId}`);
      const data = await res.json();
      if (res.ok) setGrievances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/grievances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.user.id,
          userName: userData.user.fullName,
          userEmail: userData.user.email,
          role: userData.role,
          subject,
          description
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Your grievance has been submitted successfully." });
        setSubject("");
        setDescription("");
        fetchGrievances(userData.user.id);
        setTimeout(() => setActiveTab("history"), 2000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to submit grievance." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#FF7400] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Grievance Mail Module</h1>
          <p className="text-slate-500">Submit your complaints or suggestions to the TNJA administration.</p>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("new")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === "new" ? "bg-[#FF7400] text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Send size={18} />
          New Grievance
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === "history" ? "bg-[#FF7400] text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <History size={18} />
          History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "new" ? (
          <motion.div
            key="new"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {userData?.role === "STUDENT" ? "Player ID" :
                     userData?.role === "COACH" ? "Coach ID" :
                     userData?.role === "CLUB" ? "Club ID" : "Member ID"}
                  </label>
                  <input
                    type="text"
                    value={userData?.user.permanentId || userData?.user.tempId}
                    disabled
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Role</label>
                  <input
                    type="text"
                    value={userData?.role}
                    disabled
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this regarding?"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FF7400]/20 focus:border-[#FF7400] transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Complaint Description</label>
                <textarea
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your grievance in detail..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FF7400]/20 focus:border-[#FF7400] transition-all outline-none resize-none"
                />
              </div>

              {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#FF7400] text-white rounded-xl font-bold text-lg hover:bg-[#E56900] transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-lg shadow-orange-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Grievance
                    <Send size={20} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {grievances.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No history found</h3>
                <p className="text-slate-500">You haven't submitted any grievances yet.</p>
              </div>
            ) : (
              grievances.map((g, idx) => (
                <div key={g.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-800">{g.subject}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(g.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          g.status === "PENDING" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                        }`}>
                          {g.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {g.description}
                  </p>
                  {g.reply && (
                    <div className="pl-6 border-l-4 border-orange-100 space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-[#FF7400] font-bold text-sm">
                        <Reply size={16} />
                        Admin Reply
                      </div>
                      <p className="text-slate-700 text-sm italic bg-orange-50/50 p-4 rounded-xl">
                        {g.reply}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
