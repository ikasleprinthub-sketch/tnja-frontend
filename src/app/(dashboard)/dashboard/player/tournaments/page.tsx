"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  IndianRupee,
  ArrowRight,
  AlertCircle,
  Users,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function PlayerTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlayerData(data.user);
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/player`, {
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
    fetchProfile();
    fetchTournaments();
  }, [fetchProfile, fetchTournaments]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleRegister = async (tournament: any) => {
    if (!playerData?.isPaid && !playerData?.isBPL) {
      showToast("Complete your membership payment first to join tournaments.", "error");
      return;
    }
    setPaying(tournament.id);
    try {
      const token = localStorage.getItem("token");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay SDK failed to load.");

      const orderRes = await fetch(`${API_BASE}/tournaments/create-payment-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tournamentId: tournament.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create payment order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TNJA Club Tournament",
        description: `Entry Fee – ${tournament.title}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${API_BASE}/tournaments/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                tournamentId: tournament.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            showToast("Payment successful! You are registered. Awaiting club approval.", "success");
            fetchTournaments();
          } catch (err: any) {
            showToast("Payment verification failed: " + err.message, "error");
          }
        },
        prefill: {
          name: playerData?.fullName || "",
          email: playerData?.email || "",
          contact: playerData?.mobileNumber || "",
        },
        theme: { color: "#FF7400" },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      showToast(err.message || "Payment failed", "error");
    } finally {
      setPaying(null);
    }
  };

  const filteredTournaments = tournaments.filter(
    (t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isMemberPaid = playerData?.isPaid || playerData?.isBPL;

  const regStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Registered – Awaiting Approval", color: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    REJECTED: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" },
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
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Club Tournaments</h1>
        <p className="text-slate-500 mt-1">Private tournaments organized by your club</p>
      </div>

      {/* Membership Payment Gate */}
      {!isMemberPaid && (
        <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
          <Lock size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Membership Payment Required</p>
            <p className="text-sm mt-1">
              You must complete your TNJA membership payment before you can register for any tournament. Go to your{" "}
              <a href="/dashboard/player" className="underline font-semibold">Dashboard</a> to pay.
            </p>
          </div>
        </div>
      )}

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

      {/* Tournaments */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Trophy size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-500">No Tournaments Available</h3>
          <p className="text-slate-400 text-sm mt-2">Your club has not created any tournaments yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => {
            const myReg = tournament.myRegistration;
            const isFull = tournament.registrationCount >= tournament.totalSlots;
            const isPayingThis = paying === tournament.id;

            return (
              <motion.div
                key={tournament.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group"
              >
                {/* Card Top Banner */}
                <div className="h-28 bg-gradient-to-br from-[#FF7400]/15 to-amber-100 relative overflow-hidden flex items-center justify-center">
                  <Trophy size={40} className="text-[#FF7400]/40" />
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
                    <Lock size={10} /> Private
                  </div>
                  {isFull && (
                    <div className="absolute bottom-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      FULL
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 leading-tight">{tournament.title}</h3>

                  <div className="space-y-2 mb-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#FF7400]" />
                      {new Date(tournament.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#FF7400]" />
                      {tournament.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee size={14} className="text-[#FF7400]" />
                      Entry Fee: <span className="font-bold text-slate-700">₹{tournament.entryFee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#FF7400]" />
                      {tournament.registrationCount ?? 0} / {tournament.totalSlots} Slots Filled
                    </div>
                    {tournament.ageGroup && (
                      <div className="flex gap-2 flex-wrap mt-1">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{tournament.ageGroup}</span>
                        {tournament.weightCategory && (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{tournament.weightCategory}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {tournament.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{tournament.description}</p>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    {myReg ? (
                      <div className={`w-full py-3 text-center text-sm font-bold rounded-xl border ${regStatusConfig[myReg.status]?.color || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {regStatusConfig[myReg.status]?.label || myReg.status}
                      </div>
                    ) : !isMemberPaid ? (
                      <div className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200">
                        <Lock size={14} /> Pay Membership to Join
                      </div>
                    ) : isFull ? (
                      <div className="w-full py-3 text-center text-sm font-bold rounded-xl bg-red-50 text-red-500 border border-red-100">
                        Tournament Full
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRegister(tournament)}
                        disabled={isPayingThis}
                        className="w-full py-3 bg-[#FF7400] text-white text-sm font-bold rounded-xl shadow-md shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {isPayingThis ? (
                          <><Loader2 size={16} className="animate-spin" /> Processing...</>
                        ) : (
                          <>Pay ₹{tournament.entryFee} & Register <ArrowRight size={16} /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Footer */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <span>
          After payment, your registration is sent to the club for approval. You will be notified once approved.
        </span>
      </div>
    </div>
  );
}
