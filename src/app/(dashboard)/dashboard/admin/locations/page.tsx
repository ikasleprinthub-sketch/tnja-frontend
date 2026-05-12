"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Users, 
  Building2, 
  Search,
  ArrowRight,
  TrendingUp,
  Map as MapIcon
} from "lucide-react";

export default function LocationsPage() {
  // Mock data for taluks in the district
  const taluks = [
    { name: "Kodambakkam", members: 420, clubs: 12, players: 310, coaches: 8 },
    { name: "Teynampet", members: 310, clubs: 8, players: 215, coaches: 5 },
    { name: "Adyar", members: 280, clubs: 6, players: 190, coaches: 4 },
    { name: "Anna Nagar", members: 274, clubs: 10, players: 185, coaches: 6 },
    { name: "Mylapore", members: 210, clubs: 5, players: 140, coaches: 3 },
    { name: "Ambattur", members: 195, clubs: 4, players: 130, coaches: 4 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Location Analytics</h1>
          <p className="text-slate-500">Member distribution across Chennai district taluks</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
            <MapIcon size={20} />
            Map View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Taluk List */}
        <div className="md:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search taluks..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Taluk Name</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-center">Clubs</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-center">Members</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taluks.map((taluk, idx) => (
                  <motion.tr 
                    key={taluk.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                          {taluk.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{taluk.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-medium text-slate-600 bg-purple-50 px-3 py-1 rounded-full">{taluk.clubs}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-bold text-slate-800">{taluk.members}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ArrowRight size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-600/20">
            <h3 className="text-xl font-bold mb-4">Total District Members</h3>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-bold">1,284</span>
              <span className="text-blue-200 font-medium mb-2 flex items-center gap-1">
                <TrendingUp size={16} /> +12%
              </span>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Kodambakkam remains the most active taluk with 32% of total district members.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Top Contributors</h3>
            <div className="space-y-6">
              {[
                { name: "Kodambakkam Judo", type: "Club", count: 120, color: "bg-blue-500" },
                { name: "Teynampet Dojo", type: "Club", count: 85, color: "bg-purple-500" },
                { name: "Adyar Academy", type: "Academy", count: 76, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 ${item.color} rounded-full`}></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                      <p className="text-xs text-slate-400">{item.type}</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
