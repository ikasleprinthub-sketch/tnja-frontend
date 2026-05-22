"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Clock, 
  Search,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function EventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [districts, setDistricts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
    level: "DISTRICT",
    participantType: "ALL",
    districtId: "",
    zoneId: "",
    isPaid: false,
    entryFee: "",
  });

  const [toast, setToast] = useState<{msg: string, type: "success" | "error"} | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/admin`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setEvents(json);
      }
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDistricts = async () => {
    try {
      const res = await fetch(`${API_BASE}/districts`);
      if (res.ok) {
        const json = await res.json();
        setDistricts(json);
      }
    } catch (err) {
      console.error("Failed to load districts", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchDistricts();
  }, [fetchEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create event");
      
      showToast("Event created and submitted for approval!", "success");
      setIsCreateModalOpen(false);
      setFormData({
        title: "", date: "", location: "", description: "", level: "DISTRICT", participantType: "ALL", districtId: "", zoneId: "", isPaid: false, entryFee: ""
      });
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredEvents = events.filter(ev => {
    if (filter !== "ALL" && ev.status !== filter) return false;
    if (searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const approvedCount = events.filter(e => e.status === "APPROVED").length;
  const pendingCount = events.filter(e => e.status === "PENDING").length;

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
          <h1 className="text-4xl font-black text-[#FF7400]">Events</h1>
          <p className="text-slate-500 text-sm mt-1">Create and Monitor events within your jurisdiction</p>
        </div>
        <div 
          className="p-[1.5px] rounded-[10px] shrink-0 inline-flex"
          style={{ background: 'linear-gradient(to right, #552700 0%, #FF0E00 25%, #FFDA00 75%, #FF7400 100%)' }}
        >
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 font-bold rounded-[8.5px] hover:bg-slate-50 transition-all text-sm shadow-sm"
          >
            <Plus size={18} className="stroke-[2.5]" />
            Create Event
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "TOTAL EVENTS", value: events.length, icon: Calendar, borderColor: "border-[#FF7400] border-b-[4px]", shadowColor: "shadow-[0_14px_28px_-6px_rgba(255,116,0,0.65)]", iconColor: "text-[#FF7400]" },
          { label: "APPROVED", value: approvedCount, icon: CheckCircle2, borderColor: "border-[#FFDA00] border-b-[4px]", shadowColor: "shadow-[0_14px_28px_-6px_rgba(255,218,0,0.65)]", iconColor: "text-[#FFDA00]" },
          { label: "PENDING APPROVAL", value: pendingCount, icon: AlertCircle, borderColor: "border-[#552700] border-b-[4px]", shadowColor: "shadow-[0_14px_28px_-6px_rgba(85,39,0,0.65)]", iconColor: "text-[#8B4513]" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white p-6 rounded-[14px] transition-shadow border ${stat.borderColor} ${stat.shadowColor} flex flex-col justify-between h-[130px]`}>
            <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">{stat.label}</p>
            <div className="flex items-center justify-between">
              <h3 className="text-4xl font-black text-slate-900 leading-none">{stat.value}</h3>
              <div className={`w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center shadow-[0_6px_12px_rgba(0,0,0,0.12),inset_0_3px_6px_rgba(0,0,0,0.12),inset_0_-3px_6px_rgba(255,255,255,1)] ${stat.iconColor}`}>
                <stat.icon size={22} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#FF7400]/30 transition-all font-medium text-sm text-slate-700 shadow-sm"
          />
        </div>
        <div className="relative">
          <div 
            className="p-[1.5px] rounded-[10px] shrink-0 inline-flex shadow-sm"
            style={{ background: 'linear-gradient(to right, #552700 0%, #FF0E00 25%, #FFDA00 75%, #FF7400 100%)' }}
          >
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 font-bold rounded-[8.5px] hover:bg-slate-50 transition-all text-sm"
            >
              <Filter size={16} />
              {filter === "ALL" ? "Filter" : filter}
            </button>
          </div>
          {isFilterOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-[10px] overflow-hidden z-50 w-44">
              {["ALL", "APPROVED", "PENDING", "REJECTED"].map((f) => (
                <button 
                  key={f}
                  onClick={() => { setFilter(f); setIsFilterOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                    filter === f ? "bg-orange-50 text-[#FF7400]" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f === "ALL" ? "All Events" : f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-[20px] shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-500">No Events Found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <motion.div 
              key={event.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[20px] shadow-xl shadow-slate-200/60 overflow-hidden flex flex-col group"
            >
              <div className="h-44 bg-gradient-to-br from-indigo-900 via-purple-700 to-[#FF7400] relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 backdrop-blur-[2px]"></div>
              </div>

              <div className="p-6 flex-grow flex flex-col bg-white rounded-t-[20px] -mt-5 relative z-10 border-t-[4px] border-[#FFDA00]">
                <h3 className="text-[22px] font-bold text-black mb-5 leading-tight">
                  {event.title}
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-[14px] text-slate-700">
                    <Calendar size={18} className="text-[#FF7400] stroke-[1.5]" />
                    {new Date(event.date).toLocaleDateString('en-GB')}
                  </div>
                  <div className="flex items-center gap-3 text-[14px] text-slate-700">
                    <MapPin size={18} className="text-[#FF7400] stroke-[1.5]" />
                    {event.location}
                  </div>
                </div>

                <div className="mb-6 mt-auto">
                  <span className="inline-block px-3 py-1.5 bg-[#FFEEDC] text-black text-[12px] font-bold rounded-md">
                    {event.isPaid ? `Entry Fee : ₹ ${event.entryFee}` : 'Free Entry'}
                  </span>
                </div>

                {/* Status Box */}
                <div className={`-mx-6 pl-[20px] pr-6 py-3.5 font-bold text-[15px] ${
                  event.status === "APPROVED" ? "bg-gradient-to-r from-[#FFF9D6] via-[#FFF9D6] to-transparent text-black border-l-[4px] border-[#FFDA00]" :
                  event.status === "PENDING" ? "bg-gradient-to-r from-[#FDF0E6] via-[#FDF0E6] to-transparent text-black border-l-[4px] border-[#FF7400]" :
                  "bg-gradient-to-r from-red-50 to-transparent text-red-600 border-l-[4px] border-red-500"
                }`}>
                  {event.status === "APPROVED" ? `Approved by ${event.approvedBy || 'Super Admin'}` : 
                   event.status === "PENDING" ? "Pending Approval" : 
                   "Rejected"}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Propose New Event</h2>
                  <p className="text-slate-500">Fill in the details to propose a new event.</p>
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
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Event Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter a descriptive title"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Location</label>
                    <input 
                      type="text" 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Nehru Stadium"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Event Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="DISTRICT">District Level</option>
                      <option value="ZONE">Zone Level</option>
                      <option value="STATE">State Level</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Target Audience</label>
                    <select
                      value={formData.participantType}
                      onChange={e => setFormData({...formData, participantType: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="ALL">Everyone</option>
                      <option value="STUDENT">Players Only</option>
                      <option value="COACH">Coaches/Referees Only</option>
                      <option value="MEMBER">Members Only</option>
                      <option value="CLUB">Clubs Only</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Type</label>
                    <select
                      value={formData.isPaid ? "paid" : "free"}
                      onChange={e => setFormData({...formData, isPaid: e.target.value === "paid", entryFee: e.target.value === "free" ? "" : formData.entryFee})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {formData.isPaid && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={formData.entryFee}
                        onChange={e => setFormData({...formData, entryFee: e.target.value})}
                        placeholder="Enter amount in ₹"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                      />
                    </div>
                  )}

                  {formData.level === "DISTRICT" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Select District</label>
                      <select 
                        required
                        value={formData.districtId}
                        onChange={e => setFormData({...formData, districtId: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                      >
                        <option value="">Select District</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.level === "ZONE" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Zone Identifier</label>
                      <input 
                        type="text" 
                        required
                        value={formData.zoneId}
                        onChange={e => setFormData({...formData, zoneId: e.target.value})}
                        placeholder="e.g. North Zone"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed description of the event..."
                      className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-grow py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    disabled={submitLoading}
                    className="flex-grow py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? <Loader2 size={20} className="animate-spin" /> : "Submit for Approval"}
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
