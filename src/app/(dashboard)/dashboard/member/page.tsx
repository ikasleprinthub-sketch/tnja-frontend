"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  IdCard,
  Building2,
  BadgeCheck,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function MemberDashboard() {
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found. Please login again.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch profile");
        }

        setMemberData(data.user);
      } catch (err: any) {
        setError(err.message || "Something went wrong while fetching your profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (error || !memberData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center gap-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Unable to load profile</h2>
        <p className="text-slate-500">{error || "User data not found"}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const infoGroups = [
    {
      title: "Basic Information",
      icon: User,
      items: [
        { label: "Full Name", value: memberData.fullName, icon: User },
        { label: "Date of Birth", value: memberData.dob ? new Date(memberData.dob).toLocaleDateString() : "N/A", icon: Calendar },
        { label: "Email", value: memberData.email, icon: Mail },
        { label: "Mobile Number", value: memberData.mobileNumber, icon: Phone },
      ]
    },
    {
      title: "Address Details",
      icon: MapPin,
      items: [
        { label: "Address", value: memberData.address, icon: MapPin },
        { label: "Taluk", value: memberData.taluk?.name || "N/A", icon: Building2 },
        { label: "District", value: memberData.district?.name || "N/A", icon: MapPin },
        { label: "Pincode", value: memberData.pincode, icon: IdCard },
      ]
    },
    {
      title: "Professional Details",
      icon: Briefcase,
      items: [
        { label: "Employment Type", value: memberData.employmentType || "N/A", icon: Briefcase },
        { label: "Company Name", value: memberData.companyName || "N/A", icon: Building2 },
        { label: "Designation", value: memberData.designation || "N/A", icon: BadgeCheck },
        { label: "Work Location", value: memberData.workLocation || "N/A", icon: MapPin },
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-start gap-8"
      >
        <div className="relative">
          <div className="w-32 h-32 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-blue-600/20">
            {memberData.fullName?.charAt(0)}
          </div>
          {memberData.status === "APPROVED" && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
              <BadgeCheck size={20} />
            </div>
          )}
        </div>

        <div className="flex-grow text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-slate-800">{memberData.fullName}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit mx-auto md:mx-0 ${
              memberData.status === "APPROVED" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
            }`}>
              {memberData.status}
            </span>
          </div>
          <p className="text-slate-500 mb-4 flex items-center justify-center md:justify-start gap-2">
            <IdCard size={16} />
            ID: {memberData.permanentId || memberData.tempId}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl">
              <Mail size={18} className="text-blue-500" />
              <span className="text-sm font-medium">{memberData.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl">
              <Phone size={18} className="text-blue-500" />
              <span className="text-sm font-medium">{memberData.mobileNumber}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {infoGroups.map((group, groupIdx) => (
          <motion.div 
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.1 }}
            className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-200 ${groupIdx === 2 ? "md:col-span-2" : ""}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <group.icon size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">{group.title}</h2>
            </div>

            <div className={`grid gap-6 ${groupIdx === 2 ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {group.items.map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <div className="flex items-center gap-2 text-slate-700">
                    <item.icon size={16} className="text-slate-300" />
                    <p className="font-medium">{item.value || "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
