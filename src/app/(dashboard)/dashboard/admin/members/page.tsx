"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Mail, 
  Phone,
  ArrowUpDown,
  Loader2
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function MembersListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [districtName, setDistrictName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const [membersRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/users/all`, {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/auth/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
        ]);

        const membersData = await membersRes.json();
        const profileData = await profileRes.json();

        if (membersRes.ok) {
          const approved = membersData.filter((u: any) => u.status === "APPROVED");
          setMembers(approved);
        }

        if (profileRes.ok && profileData.user?.district) {
          setDistrictName(profileData.user.district.name);
        }
      } catch (err) {
        console.error("Failed to fetch directory data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.permanentId && m.permanentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Members Directory</h1>
          <p className="text-slate-500">Manage all registered members in {districtName || 'your district'}</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all">
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, ID or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
          <Filter size={20} />
          Filter
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FF7400]" />
            <p className="text-slate-400 font-medium">Loading directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Member <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Location</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member, idx) => (
                  <motion.tr 
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-100 text-[#FF7400] rounded-full flex items-center justify-center font-bold">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{member.fullName}</h4>
                          <p className="text-xs text-slate-400 font-mono">ID: {member.permanentId || member.tempId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        member.role === "STUDENT" ? "bg-blue-100 text-blue-600" :
                        member.role === "COACH" ? "bg-purple-100 text-purple-600" : 
                        member.role === "CLUB" ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                      }`}>
                        {member.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-600">{member.talukName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{member.districtName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                          <Mail size={12} className="text-[#FF7400]" /> {member.email}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                          <Phone size={12} className="text-[#FF7400]" /> {member.mobileNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-[#FF7400] hover:bg-orange-50 rounded-lg transition-all">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filteredMembers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium">
                      No members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
