"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Clock, 
  MoreVertical, 
  Search,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function EventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const events = [
    { id: "1", title: "District Judo Championship 2024", date: "May 25, 2024", location: "Nehru Stadium", status: "APPROVED", participants: 120 },
    { id: "2", title: "Coaches Workshop - Level 1", date: "June 02, 2024", location: "TNJA HQ", status: "PENDING", participants: 15 },
    { id: "3", title: "Inter-Club Friendly Meet", date: "May 18, 2024", location: "Adyar Club", status: "REJECTED", participants: 45 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Events Management</h1>
          <p className="text-slate-500">Create and manage district-level events</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} />
          Create New Event
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total Events", value: "24", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Approved", value: "18", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Pending Approval", value: "4", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search events..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          {["ALL", "APPROVED", "PENDING", "REJECTED"].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event) => (
          <motion.div 
            key={event.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group"
          >
            <div className="h-32 bg-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-sm">
                ID: #{event.id}
              </div>
            </div>

            <div className="p-8 -mt-10 relative flex-grow">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-blue-600 mb-6 border border-slate-50">
                <Calendar size={32} />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-2 leading-tight">
                {event.title}
              </h3>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Clock size={16} className="text-blue-500" />
                  {event.date}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <MapPin size={16} className="text-blue-500" />
                  {event.location}
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  event.status === "APPROVED" ? "bg-emerald-100 text-emerald-600" :
                  event.status === "PENDING" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                }`}>
                  {event.status}
                </div>
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Create New Event</h2>
                  <p className="text-slate-500">Fill in the details to propose a new event for the district.</p>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); setIsCreateModalOpen(false); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Event Title</label>
                    <input 
                      type="text" 
                      placeholder="Enter a descriptive title"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Date</label>
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Nehru Stadium"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Description</label>
                    <textarea 
                      placeholder="Detailed description of the event..."
                      className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-grow py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-grow py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Submit for Approval
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
