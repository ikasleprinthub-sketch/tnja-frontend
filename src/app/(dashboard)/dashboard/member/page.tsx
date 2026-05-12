"use client";

import React from "react";
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
  BadgeCheck
} from "lucide-react";

export default function MemberDashboard() {
  // Mock member data - In a real app, this would be fetched from the backend
  const memberData = {
    fullName: "John Doe",
    age: 28,
    dob: "1996-05-15",
    email: "john.doe@example.com",
    mobileNumber: "+91 9876543210",
    address: "123 Judo Street, Kodambakkam",
    city: "Chennai",
    district: "Chennai",
    pincode: "600024",
    employmentType: "Private",
    companyName: "Tech Solutions Pvt Ltd",
    designation: "Senior Developer",
    workLocation: "Chennai",
    status: "APPROVED",
    permanentId: "MEM-PERM-8822A1"
  };

  const infoGroups = [
    {
      title: "Basic Information",
      icon: User,
      items: [
        { label: "Full Name", value: memberData.fullName, icon: User },
        { label: "Age", value: memberData.age, icon: Calendar },
        { label: "Date of Birth", value: memberData.dob, icon: Calendar },
        { label: "Email", value: memberData.email, icon: Mail },
        { label: "Mobile Number", value: memberData.mobileNumber, icon: Phone },
      ]
    },
    {
      title: "Address Details",
      icon: MapPin,
      items: [
        { label: "Address", value: memberData.address, icon: MapPin },
        { label: "City", value: memberData.city, icon: Building2 },
        { label: "District", value: memberData.district, icon: MapPin },
        { label: "Pincode", value: memberData.pincode, icon: IdCard },
      ]
    },
    {
      title: "Professional Details",
      icon: Briefcase,
      items: [
        { label: "Employment Type", value: memberData.employmentType, icon: Briefcase },
        { label: "Company Name", value: memberData.companyName, icon: Building2 },
        { label: "Designation", value: memberData.designation, icon: BadgeCheck },
        { label: "Work Location", value: memberData.workLocation, icon: MapPin },
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-start gap-8"
      >
        <div className="relative">
          <div className="w-32 h-32 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-blue-600/20">
            {memberData.fullName.charAt(0)}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
            <BadgeCheck size={20} />
          </div>
        </div>

        <div className="flex-grow text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-slate-800">{memberData.fullName}</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider w-fit mx-auto md:mx-0">
              {memberData.status}
            </span>
          </div>
          <p className="text-slate-500 mb-4 flex items-center justify-center md:justify-start gap-2">
            <IdCard size={16} />
            ID: {memberData.permanentId}
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
                    <p className="font-medium">{item.value}</p>
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
