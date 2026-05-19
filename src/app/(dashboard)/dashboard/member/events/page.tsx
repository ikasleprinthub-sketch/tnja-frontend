"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Clock, 
  Search,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function MemberEventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [districts, setDistricts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("GUEST");
  
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
      const res = await fetch(`${API_BASE}/events/active`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
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
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
    fetchEvents();
    fetchDistricts();
  }, [fetchEvents]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApply = async (event: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("You must be logged in to apply", "error");
        return;
      }

      if (event.isPaid) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          showToast("Razorpay SDK failed to load. Are you offline?", "error");
          return;
        }

        const orderRes = await fetch(`${API_BASE}/events/create-payment-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ eventId: event.id }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          throw new Error(orderData.error || "Failed to create payment order");
        }

        const userName = localStorage.getItem("userName") || "";
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Tamil Nadu Judo Association",
          description: `Entry Fee for ${event.title}`,
          order_id: orderData.id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch(`${API_BASE}/events/verify-payment`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                  eventId: event.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Verification failed");
              }

              showToast("Payment successful! Applied for the event.", "success");
              fetchEvents();
            } catch (err: any) {
              showToast("Payment verification failed: " + err.message, "error");
            }
          },
          prefill: {
            name: userName,
          },
          theme: {
            color: "#FF7400",
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();

      } else {
        const res = await fetch(`${API_BASE}/events/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ eventId: event.id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to apply for event");
        
        showToast("Successfully applied for this event!", "success");
        fetchEvents();
      }
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    }
  };

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
      if (!res.ok) throw new Error(json.error || "Failed to propose event");
      
      showToast("Event created and submitted for approval! It will appear here once approved.", "success");
      setIsCreateModalOpen(false);
      setFormData({
        title: "", date: "", location: "", description: "", level: "DISTRICT", participantType: "ALL", districtId: "", zoneId: "", isPaid: false, entryFee: ""
      });
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredEvents = events.filter(ev => {
    if (searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
          <h1 className="text-3xl font-bold text-slate-800">Events Directory</h1>
          <p className="text-slate-500">View upcoming events or propose a new one</p>
        </div>
        {userRole === "CLUB" && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-4 bg-[#FF7400] text-white font-bold rounded-2xl shadow-lg shadow-[#FF7400]/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} />
            Propose Event
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search active events..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
        />
      </div>

      {/* Events List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-500">No Active Events</h3>
          <p className="text-slate-400 text-sm mt-2">There are currently no upcoming approved events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <motion.div 
              key={event.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group"
            >
              <div className="h-32 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF7400]/20 to-[#FFDA00]/20 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-sm flex items-center gap-2">
                  <span>{event.level} LEVEL</span>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <span className="text-[#FF7400]">{event.participantType}</span>
                </div>
              </div>

              <div className="p-8 -mt-10 relative flex-grow">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-[#FF7400] mb-6 border border-slate-50">
                  <Calendar size={32} />
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-2 leading-tight">
                  {event.title}
                </h3>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Clock size={16} className="text-[#FF7400]" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <MapPin size={16} className="text-[#FF7400]" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium pt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${event.isPaid ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                      {event.isPaid ? `Entry Fee: ₹${event.entryFee}` : 'Free Entry'}
                    </span>
                  </div>
                  {(event.district?.name || event.zoneId) && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1">
                      <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center">
                        <MapPin size={10} className="text-slate-400" />
                      </div>
                      <span className="text-xs">Region: {event.district?.name || event.zoneId}</span>
                    </div>
                  )}
                  {event.approvedBy && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mt-3 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={16} />
                      <span className="text-xs">Approved by <strong>{event.approvedBy}</strong></span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3 pt-6 border-t border-slate-100">
                  {userRole !== "CLUB" && (
                    (() => {
                      const userReg = event.registrations?.[0];
                      if (userReg) {
                        const statusColors: Record<string, string> = {
                          PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                          APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          REJECTED: "bg-red-50 text-red-700 border-red-200",
                        };
                        const statusColor = statusColors[userReg.status] || "bg-slate-50 text-slate-700 border-slate-200";
                        return (
                          <div className={`w-full py-3 border text-center text-sm font-bold rounded-xl ${statusColor}`}>
                            Applied 
                          </div>
                        );
                      }
                      return (
                        <button 
                          onClick={() => handleApply(event)}
                          className="w-full py-3 bg-[#FF7400] text-white text-sm font-bold rounded-xl shadow-md shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Apply Now
                        </button>
                      );
                    })()
                  )}
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
