"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Mail, 
  Phone,
  ArrowUpDown
} from "lucide-react";

export default function MembersListPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const members = [
    { id: "M001", name: "John Doe", type: "Member", taluk: "Kodambakkam", phone: "+91 98765 43210", email: "john@example.com", status: "ACTIVE" },
    { id: "P204", name: "Rahul Sharma", type: "Player", taluk: "Teynampet", phone: "+91 98765 43211", email: "rahul@example.com", status: "ACTIVE" },
    { id: "C012", name: "Suresh Kumar", type: "Coach", taluk: "Adyar", phone: "+91 98765 43212", email: "suresh@example.com", status: "ACTIVE" },
    { id: "M005", name: "Amit Patel", type: "Member", taluk: "Anna Nagar", phone: "+91 98765 43213", email: "amit@example.com", status: "ACTIVE" },
    { id: "P205", name: "Priya Singh", type: "Player", taluk: "Kodambakkam", phone: "+91 98765 43214", email: "priya@example.com", status: "ACTIVE" },
  ];

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Members Directory</h1>
          <p className="text-slate-500">Manage all registered members in your district</p>
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
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
          <Filter size={20} />
          Filter
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">Member <ArrowUpDown size={14} /></div>
                </th>
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Taluk</th>
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
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{member.name}</h4>
                        <p className="text-xs text-slate-400">ID: {member.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      member.type === "Player" ? "bg-blue-100 text-blue-600" :
                      member.type === "Coach" ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600"
                    }`}>
                      {member.type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-medium text-slate-600">{member.taluk}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail size={12} /> {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone size={12} /> {member.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
