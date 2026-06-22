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
  Building2,
  Globe2,
  Flag,
  Download,
  Award,
  Medal,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Tab = "club" | "district" | "zonal" | "stateNational";

const TABS: { key: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: "club",
    label: "Club Tournaments",
    icon: <Building2 size={16} />,
    desc: "Private tournaments organised by your club",
  },
  {
    key: "district",
    label: "District Matches",
    icon: <Flag size={16} />,
    desc: "Official matches in your district",
  },
  {
    key: "zonal",
    label: "Zonal Matches",
    icon: <Trophy size={16} />,
    desc: "Official matches in your zone",
  },
  {
    key: "stateNational",
    label: "State & National",
    icon: <Globe2 size={16} />,
    desc: "State-level and national championship matches",
  },
];

const levelColors: Record<string, string> = {
  DISTRICT: "bg-blue-100 text-blue-700",
  ZONE: "bg-purple-100 text-purple-700",
  STATE: "bg-emerald-100 text-emerald-700",
  NATIONAL: "bg-amber-100 text-amber-800",
};

export default function PlayerTournamentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("club");
  const [clubTournaments, setClubTournaments] = useState<any[]>([]);
  const [districtMatches, setDistrictMatches] = useState<any[]>([]);
  const [zonalMatches, setZonalMatches] = useState<any[]>([]);
  const [stateNationalMatches, setStateNationalMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [registerModal, setRegisterModal] = useState<any | null>(null);
  const [physicalDetails, setPhysicalDetails] = useState({ height: "", weight: "" });

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownloadCertificate = async (tournamentId: string, tournamentTitle: string) => {
    try {
      const token = localStorage.getItem("token");
      showToast("Generating your certificate...", "success");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/certificate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to generate certificate", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tournamentTitle.replace(/\s+/g, "_")}_certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Certificate downloaded! 🎖️", "success");
    } catch (err) {
      showToast("Error downloading certificate", "error");
    }
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [clubRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE}/tournaments/player`, { headers }),
        fetch(`${API_BASE}/tournaments/player/matches`, { headers }),
      ]);

      if (clubRes.ok) {
        setClubTournaments(await clubRes.json());
      }
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        setDistrictMatches(data.district ?? []);
        setZonalMatches(data.zonal ?? []);
        setStateNationalMatches(data.stateAndNational ?? []);
      }
    } catch (err) {
      console.error("Failed to load tournaments", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchAll();
  }, [fetchProfile, fetchAll]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });




  const handleRegister = async (tournament: any, directHeight?: string, directWeight?: string) => {
    const height = directHeight || physicalDetails.height;
    const weight = directWeight || physicalDetails.weight;

    if (!height || !weight) {
      showToast("Height and weight are required.", "error");
      return;
    }
    if (!playerData?.isPaid && !playerData?.isBPL) {
      showToast("Complete your membership payment first to join tournaments.", "error");
      return;
    }
    setPaying(tournament.id);
    try {
      const token = localStorage.getItem("token");

      if (!directHeight || !directWeight) {
        try {
          await fetch(`${API_BASE}/auth/profile`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ height, weight }),
          });
        } catch (err) {
          console.error("Failed to update profile physical details", err);
        }
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay SDK failed to load.");

      const orderRes = await fetch(`${API_BASE}/tournaments/player/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tournamentId: tournament.id,
          height,
          weight,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create payment order");

      if (orderData.isFree) {
        showToast(orderData.message, "success");
        fetchAll();
        fetchProfile();
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TNJA Tournament",
        description: `Entry Fee – ${tournament.title}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${API_BASE}/tournaments/player/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                tournamentId: tournament.id,
                height,
                weight,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            showToast("Payment successful! You are registered. Awaiting approval.", "success");
            fetchAll();
            fetchProfile();
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
      setRegisterModal(null);
      setPhysicalDetails({ height: "", weight: "" });
    }
  };

  const isMemberPaid = playerData?.isPaid || playerData?.isBPL;

  const regStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Registered – Awaiting Approval", color: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    REJECTED: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" },
  };

  const currentList = (() => {
    let list =
      activeTab === "club"
        ? clubTournaments
        : activeTab === "district"
        ? districtMatches
        : activeTab === "zonal"
        ? zonalMatches
        : stateNationalMatches;

    // Filter by gender - only if player has gender set
    if (playerData?.gender && list.length > 0) {
      const filtered = list.filter((t) =>
        !t.gender || t.gender === "BOTH" || t.gender === playerData.gender
      );
      // Only use filtered list if it has results, otherwise show all
      if (filtered.length > 0) {
        list = filtered;
      }
    }

    // Filter by search query
    if (searchQuery) {
      list = list.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  })();

  const emptyMessages: Record<Tab, string> = {
    club: "Your club has not created any tournaments yet.",
    district: "No district matches found in your area.",
    zonal: "No zonal matches are scheduled yet.",
    stateNational: "No state or national matches are scheduled yet.",
  };

  return (
    <div className="space-y-6 relative">
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
        <h1 className="text-3xl font-bold text-slate-800">Matches & Tournaments</h1>
        <p className="text-slate-500 mt-1">View and register for tournaments at every level</p>
      </div>

      {/* Membership gate */}
      {!isMemberPaid && (
        <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
          <Lock size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Membership Payment Required</p>
            <p className="text-sm mt-1">
              You must complete your TNJA membership payment before registering for any tournament.{" "}
              <a href="/dashboard/player" className="underline font-semibold">Go to Dashboard</a> to pay.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === tab.key
                ? "bg-[#FF7400] text-white shadow-md shadow-[#FF7400]/30"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF7400]/40 hover:text-[#FF7400]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-sm text-slate-400 -mt-2">
        {TABS.find((t) => t.key === activeTab)?.desc}
      </p>

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

      {/* Tournament Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Trophy size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-500">No Tournaments Available</h3>
          <p className="text-slate-400 text-sm mt-2">{emptyMessages[activeTab]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {currentList.map((tournament) => {
              const myReg = tournament.myRegistration;
              const isFull = tournament.registrationCount >= tournament.totalSlots;
              const isPayingThis = paying === tournament.id;
              const isFree = tournament.entryFee === 0 || (tournament.allowBPL && playerData?.isBPL);
              const isClubTab = activeTab === "club";

              return (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group"
                >
                  {/* Card Top Banner */}
                  <div
                    className={`h-28 relative overflow-hidden flex items-center justify-center ${
                      tournament.level === "NATIONAL"
                        ? "bg-gradient-to-br from-amber-400/20 to-amber-100"
                        : tournament.level === "STATE"
                        ? "bg-gradient-to-br from-emerald-400/20 to-emerald-100"
                        : tournament.level === "DISTRICT"
                        ? "bg-gradient-to-br from-blue-400/20 to-blue-100"
                        : "bg-gradient-to-br from-[#FF7400]/15 to-amber-100"
                    }`}
                  >
                    <Trophy size={40} className="text-current opacity-20" />

                    {/* Level Badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold ${levelColors[tournament.level] ?? "bg-slate-100 text-slate-600"}`}>
                      {tournament.level}
                    </div>

                    {/* Private badge for club */}
                    {isClubTab && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
                        <Lock size={10} /> Private
                      </div>
                    )}

                    {/* Club name for non-club tabs */}
                    {!isClubTab && tournament.club && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm max-w-[140px] truncate">
                        {tournament.club.name}
                      </div>
                    )}

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
                        {tournament.dateTo &&
                          ` – ${new Date(tournament.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#FF7400]" />
                        {tournament.location}
                      </div>
                      {!isClubTab && tournament.club?.district?.name && (
                        <div className="flex items-center gap-2">
                          <Flag size={14} className="text-[#FF7400]" />
                          {tournament.club.district.name} District
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <IndianRupee size={14} className="text-[#FF7400]" />
                        Entry Fee:{" "}
                        <span className="font-bold text-slate-700">
                          {tournament.entryFee === 0 ? "Free" : `₹${tournament.entryFee}`}
                        </span>
                        {tournament.allowBPL && (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold ml-1">BPL FREE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#FF7400]" />
                        {tournament.registrationCount ?? 0} / {tournament.totalSlots} Slots Filled
                      </div>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                          Age: {tournament.ageFrom}–{tournament.ageTo}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                          {tournament.gender}
                        </span>
                        {tournament.beltEligibility && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                            Belt: {tournament.beltEligibility}
                          </span>
                        )}
                      </div>
                    </div>

                    {tournament.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {tournament.description}
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-slate-100">
                      {/* ── CLOSED: Show placement + Download Certificate ── */}
                      {tournament.status === "CLOSED" && myReg ? (
                        <div className="space-y-2">
                          {/* Placement badge */}
                          {(() => {
                            const p = myReg.placement;
                            const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
                              FIRST:         { label: "1st Place — Gold",   cls: "bg-yellow-50 text-yellow-700 border-yellow-300", icon: <Trophy size={16} /> },
                              SECOND:        { label: "2nd Place — Silver", cls: "bg-slate-50 text-slate-700 border-slate-300", icon: <Medal size={16} /> },
                              THIRD:         { label: "3rd Place — Bronze", cls: "bg-orange-50 text-orange-700 border-orange-300", icon: <Medal size={16} /> },
                              PARTICIPATION: { label: "Participation",      cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Award size={16} /> },
                            };
                            const entry = cfg[p] ?? cfg["PARTICIPATION"];
                            return (
                              <div className={`w-full py-2.5 flex items-center justify-center gap-2 text-sm font-black rounded-xl border ${entry.cls}`}>
                                {entry.icon} {entry.label}
                              </div>
                            );
                          })()}
                          {/* Download Certificate */}
                          <button
                            onClick={() => handleDownloadCertificate(tournament.id, tournament.title)}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            <Award size={15} /> Download Certificate
                          </button>
                        </div>
                      ) : tournament.status === "CLOSED" ? (
                        /* CLOSED but not registered */
                        <div className="w-full py-3 text-center text-sm font-bold rounded-xl bg-slate-100 text-slate-400 border border-slate-200">
                          Tournament Closed
                        </div>
                      ) : myReg ? (
                        /* APPROVED — registered */
                        <div
                          className={`w-full py-3 text-center text-sm font-bold rounded-xl border ${
                            regStatusConfig[myReg.status]?.color || "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
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
                          onClick={() => {
                            if (playerData?.height && playerData?.weight) {
                              handleRegister(tournament, playerData.height, playerData.weight);
                            } else {
                              setRegisterModal(tournament);
                            }
                          }}
                          disabled={isPayingThis}
                          className="w-full py-3 bg-[#FF7400] text-white text-sm font-bold rounded-xl shadow-md shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                          {isPayingThis ? (
                            <><Loader2 size={16} className="animate-spin" /> Processing...</>
                          ) : isFree ? (
                            <>Register (Free) <ArrowRight size={16} /></>
                          ) : (
                            <>Pay &#x20B9;{tournament.entryFee} &amp; Register <ArrowRight size={16} /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Info Footer */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <span>
          After payment, your registration is sent for approval. You will be notified once approved.{" "}
          District matches are shown based on your registered district.
        </span>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {registerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Physical Details</h2>
              <p className="text-slate-400 text-sm mb-1 font-semibold">{registerModal.title}</p>
              <p className="text-slate-500 text-sm mb-6">
                Please provide your current height and weight for tournament registration.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    required
                    value={physicalDetails.height}
                    onChange={(e) => setPhysicalDetails({ ...physicalDetails, height: e.target.value })}
                    placeholder="e.g. 175"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    required
                    value={physicalDetails.weight}
                    onChange={(e) => setPhysicalDetails({ ...physicalDetails, weight: e.target.value })}
                    placeholder="e.g. 68"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setRegisterModal(null);
                    setPhysicalDetails({ height: "", weight: "" });
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegister(registerModal)}
                  disabled={paying === registerModal.id || !physicalDetails.height || !physicalDetails.weight}
                  className="flex-1 py-3 bg-[#FF7400] hover:bg-[#e66a00] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying === registerModal.id ? <Loader2 size={16} className="animate-spin" /> : "Proceed"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
