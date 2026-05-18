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
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function PlayerDashboard() {
  const [playerData, setPlayerData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchData();
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
          <div className="w-32 h-32 bg-gradient-to-br from-[#FF7400] to-[#FF9100] rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-[#FF7400]/20">
            {playerData.fullName.charAt(0)}
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
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-gray-600">
                    <Mail size={20} className="text-[#FF7400]" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</p>
                      <p className="font-medium">{playerData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-600">
                    <Phone size={20} className="text-[#FF7400]" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile</p>
                      <p className="font-medium">{playerData.mobileNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-gray-600">
                    <MapPin size={20} className="text-[#FF7400]" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">District</p>
                      <p className="font-medium">{playerData.district?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-600">
                    <GraduationCap size={20} className="text-[#FF7400]" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Academy / Club</p>
                      <p className="font-medium">{playerData.club?.name || "Independent"}</p>
                    </div>
                  </div>
                </div>
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
        </div>
      </div>
    </div>
  );
}
