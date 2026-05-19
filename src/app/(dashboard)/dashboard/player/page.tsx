"use client";

import React, { useEffect, useState } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Trophy,
  XCircle,
  Scale,
  Contact,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function PlayerDashboard() {
  const [playerData, setPlayerData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [playerNotifications, setPlayerNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const loadNotifs = () => {
      const saved = localStorage.getItem("tnja_notifications");
      if (saved) {
        try {
          setPlayerNotifications(JSON.parse(saved));
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

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      // Fetch profile and settings in parallel
      const [profileRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/auth/profile`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/settings/global`)
      ]);

      const profileData = await profileRes.json();
      const settingsData = await settingsRes.json();

      if (!profileRes.ok) throw new Error(profileData.error || "Failed to fetch profile");
      if (!settingsRes.ok) throw new Error(settingsData.error || "Failed to fetch settings");

      setPlayerData(profileData.user);
      setSettings(settingsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      const token = localStorage.getItem("token");
      const resScript = await loadRazorpayScript();
      if (!resScript) throw new Error("Razorpay SDK failed to load.");

      const orderRes = await fetch(`${API_BASE}/application/create-order`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          id: playerData.id,
          type: "student"
          // Amount is now handled by the backend from GlobalSettings
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      // 3. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Tamil Nadu Judo Association",
        description: "Membership Registration Fee",
        order_id: orderData.id,
        handler: async function (response: any) {
          // 4. Verify Payment on Backend
          try {
            const verifyRes = await fetch(`${API_BASE}/application/verify-payment`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                id: playerData.id,
                type: "student",
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

            // Success!
            alert("Payment successful! Your Player ID has been issued. You will now be logged out. Please log in using your new Player ID to change your password and secure your account.");
            localStorage.clear();
            window.location.href = "/login";
          } catch (err: any) {
            alert("Payment verification failed: " + err.message);
          }
        },
        prefill: {
          name: playerData.fullName,
          email: playerData.email,
          contact: playerData.mobileNumber,
        },
        theme: {
          color: "#FF7400",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      alert(err.message || "Payment initialization failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#FF7400] animate-spin" />
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center gap-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Unable to load dashboard</h2>
        <p className="text-gray-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-6 py-2 bg-[#FF7400] text-white rounded-full font-bold">
          Try Again
        </button>
      </div>
    );
  }

  // Check if payment is required
  const needsPayment = !playerData.isBPL && !playerData.isPaid;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8"
      >
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-to-br from-[#FF7400] to-[#FF9100] rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-[#FF7400]/20 overflow-hidden">
            {playerData.profilePhoto ? (
              <img 
                src={playerData.profilePhoto} 
                alt={playerData.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              playerData.fullName.charAt(0)
            )}
          </div>
          {playerData.permanentId && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
              <BadgeCheck size={20} />
            </div>
          )}
        </div>

        <div className="flex-grow text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-[#1A1A1A]">{playerData.fullName}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit mx-auto md:mx-0 ${
              playerData.permanentId ? "bg-green-100 text-green-600" : "bg-orange-100 text-[#FF7400]"
            }`}>
              {playerData.permanentId ? "Active Member" : "Application Approved"}
            </span>
          </div>
          <p className="text-gray-500 font-medium">
            {playerData.permanentId ? `Player ID: ${playerData.permanentId}` : `Temporary Player ID: ${playerData.tempId}`}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {needsPayment ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 border-2 border-[#FF7400]/20 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#FF7400]/10 text-[#FF7400] rounded-2xl">
                  <CreditCard size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#1A1A1A]">Payment Required</h3>
                  <p className="text-gray-500">Complete your membership to receive your Player ID</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                  <span className="text-gray-500 font-medium">Membership Fee</span>
                  <span className="text-3xl font-bold text-[#FF7400]">₹ {settings?.playerFee || 500}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Processing Fee</span>
                  <span className="text-gray-400">Included</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className="text-green-500" />
                  Instant issue of Player ID
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className="text-green-500" />
                  Access to all TNJA State Events
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className="text-green-500" />
                  Downloadable Membership Card
                </li>
              </ul>

              <button 
                onClick={handlePayment}
                disabled={paying}
                className="w-full py-4 bg-[#FF7400] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {paying ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Processing Secure Payment...
                  </>
                ) : (
                  <>
                    Pay Membership Fee
                    <ArrowRight size={24} />
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Match Statistics Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Wins Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-3xl p-6 shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-wider">Total Wins</p>
                    <h3 className="text-4xl font-black text-emerald-700">{playerData.wins || 0}</h3>
                  </div>
                  <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                    <Trophy size={28} />
                  </div>
                </motion.div>

                {/* Losses Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-3xl p-6 shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-rose-600/80 uppercase tracking-wider">Total Losses</p>
                    <h3 className="text-4xl font-black text-rose-700">{playerData.losses || 0}</h3>
                  </div>
                  <div className="p-4 bg-rose-500/10 text-rose-600 rounded-2xl">
                    <XCircle size={28} />
                  </div>
                </motion.div>

                {/* Draws Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Draws</p>
                    <h3 className="text-4xl font-black text-slate-700">{playerData.draws || 0}</h3>
                  </div>
                  <div className="p-4 bg-slate-500/10 text-slate-600 rounded-2xl">
                    <Scale size={28} />
                  </div>
                </motion.div>
              </div>

              {/* Coach Assignment Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="p-2.5 bg-orange-100 text-[#FF7400] rounded-xl">
                    <Contact size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[#1A1A1A]">Assigned Coach</h3>
                </div>

                {playerData.coach ? (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 bg-slate-50/70 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#FF7400] text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-orange-500/10">
                        {playerData.coach.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-lg leading-tight">{playerData.coach.fullName}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <Award size={14} className="text-[#FF7400]" />
                          <span>{playerData.coach.presentGradeInJudo || "Certified Judo Coach"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">📧</span>
                        <span>{playerData.coach.email}</span>
                      </div>
                      {playerData.coach.mobileNumber && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📞</span>
                          <span>{playerData.coach.mobileNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                    <p className="text-slate-400 font-semibold text-sm">No Coach Assigned</p>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                      Please contact your district administrator or club secretary to assign a certified coach to your profile.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Quick Stats */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h4 className="font-bold text-[#1A1A1A] mb-4">Membership Status</h4>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-4">
              <div className={`p-2 rounded-xl ${playerData.permanentId ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                {playerData.permanentId ? <ShieldCheck size={20} /> : <Loader2 size={20} className="animate-spin" />}
              </div>
              <p className="text-sm font-bold text-gray-700">
                {playerData.permanentId ? "Verified Member" : "Verification Pending"}
              </p>
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              {playerData.permanentId 
                ? "Your membership is active. You can now participate in all TNJA sanctioned events."
                : "Your application has been approved. Complete your payment to activate your permanent membership."}
            </p>
          </div>

          {/* Notifications Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h4 className="font-bold text-[#1A1A1A]">Recent Notifications</h4>
            {playerNotifications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                No notifications found.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {playerNotifications.map((n: any) => (
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
