"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  User, 
  Users, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Settings,
  MessageSquare,
  Loader2
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Profile dropdown & modal states
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchFullProfile = async () => {
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProfileData(data.user);
      }
    } catch (err) {
      console.error("Error fetching full profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("tnja_notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const saveNotifications = (newNotifs: any[]) => {
    setNotifications(newNotifs);
    localStorage.setItem("tnja_notifications", JSON.stringify(newNotifs));
    window.dispatchEvent(new Event("tnja_notifications_updated"));
  };
  const router = useRouter();
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (!token) {
      router.push("/login");
      return;
    }

    if (role) setUserRole(role);
    if (name) setUserName(name);
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole") || "GUEST";
    if (!token) return;

    let userId = "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.userId;
    } catch (e) {
      console.error("Failed to parse token payload:", e);
      return;
    }

    if (!userId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";
    const socket = new WebSocket(`${wsUrl}?userId=${userId}&role=${role}`);

    socket.onopen = () => {
      console.log("[WS] Connected to notifications server");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "GRIEVANCE_REPLY" || data.type === "NEW_GRIEVANCE") {
          showToast(data.message || "New notification received!", "success");
          const newNotif = {
            id: data.grievanceId || Date.now().toString(),
            message: data.message || "Notification received",
            createdAt: new Date().toISOString(),
            read: false,
          };
          setNotifications(prev => {
            const updated = [newNotif, ...prev];
            localStorage.setItem("tnja_notifications", JSON.stringify(updated));
            window.dispatchEvent(new Event("tnja_notifications_updated"));
            return updated;
          });
        }
      } catch (err) {
        console.error("[WS] Error parsing websocket message:", err);
      }
    };

    socket.onclose = () => {
      console.log("[WS] Disconnected from notifications server");
    };

    socket.onerror = (err) => {
      console.error("[WS] Connection error:", err);
    };

    return () => {
      socket.close();
    };
  }, []);

  if (!isMounted) return null;

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const adminNavItems = [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Approvals", href: "/dashboard/admin/approvals", icon: ShieldCheck },
    { name: "Events", href: "/dashboard/admin/events", icon: Calendar },
    { name: "Members List", href: "/dashboard/admin/members", icon: Users },
    { name: "Grievances", href: "/dashboard/admin/grievances", icon: MessageSquare },
  ];

  // Add Super Admin only links
  if (userRole === "SUPER_ADMIN") {
    adminNavItems.push({ name: "Locations", href: "/dashboard/admin/locations", icon: MapPin });
    adminNavItems.push({ name: "User Management", href: "/dashboard/admin/users", icon: Users });
    adminNavItems.push({ name: "Settings", href: "/dashboard/admin/settings", icon: Settings });
  }

  const isPromotedRole = userRole && [
    "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", 
    "ZONE_PRESIDENT", "ZONE_SECRETARY", 
    "STATE_PRESIDENT", "STATE_SECRETARY"
  ].includes(userRole);

  const navItems = (isPromotedRole || userRole === "SUPER_ADMIN") 
    ? adminNavItems 
    : [
        { 
          name: userRole === "PLAYER" ? "Dashboard" : "My Profile", 
          href: userRole === "PLAYER" ? "/dashboard/player" : "/dashboard/member", 
          icon: userRole === "PLAYER" ? LayoutDashboard : User 
        },
        { name: "Events", href: "/dashboard/member/events", icon: Calendar },
        { name: "Grievances", href: "/dashboard/grievance", icon: MessageSquare },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[999] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm bg-emerald-600`}
          >
            <Bell size={20} className="animate-bounce text-white" />
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-slate-900 text-white flex flex-col z-50`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <h1 className="text-2xl font-bold text-brand-orange">TNJA</h1>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-grow mt-6 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center p-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-[#FF7400] text-white shadow-lg shadow-orange-500/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {isSidebarOpen && <span className="ml-3 font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center p-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-40">
          <h2 className="text-xl font-semibold text-slate-800">
            {navItems.find(i => i.href === pathname)?.name || "Dashboard"}
          </h2>
          
          <div className="flex items-center space-x-6">
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-400 hover:text-[#FF7400] relative focus:outline-none transition-colors"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur">
                      <span className="font-bold text-slate-800 text-sm">Notifications</span>
                      {notifications.some(n => !n.read) && (
                        <button 
                          onClick={() => {
                            const updated = notifications.map(n => ({ ...n, read: true }));
                            saveNotifications(updated);
                          }}
                          className="text-xs text-[#FF7400] font-bold hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id}
                            className={`p-4 border-b border-slate-50 flex items-start gap-3 transition-colors ${
                              notif.read ? "bg-white" : "bg-orange-50/30"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? "bg-transparent" : "bg-[#FF7400]"}`} />
                            <div className="flex-grow space-y-1 text-left">
                              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative border-l pl-6 border-slate-200">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-3 focus:outline-none hover:opacity-85 transition-opacity"
              >
                <div className="text-right hidden sm:block text-left">
                  <p className="text-sm font-bold text-slate-800">{userName}</p>
                  <p className="text-xs text-slate-400 capitalize">{userRole?.replace("_", " ").toLowerCase()}</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-[#FF7400] font-bold border-2 border-white shadow-sm">
                  {userName.charAt(0)}
                </div>
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-left">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account</p>
                        <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">{userName}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setIsProfileModalOpen(true);
                            setIsProfileDropdownOpen(false);
                            fetchFullProfile();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-orange-50 hover:text-[#FF7400] rounded-xl transition-colors text-sm font-bold text-left"
                        >
                          <User size={18} />
                          My Profile Details
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold text-left"
                        >
                          <LogOut size={18} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-grow overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>

      {/* Profile Details Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FF7400] to-orange-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl shadow-orange-500/20">
                    {userName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black">{userName}</h3>
                    <p className="text-slate-300 text-xs sm:text-sm font-semibold capitalize mt-0.5 tracking-wider">{userRole?.replace("_", " ").toLowerCase()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-8">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-[#FF7400]" size={40} />
                    <p className="text-slate-400 font-bold text-sm">Loading details...</p>
                  </div>
                ) : profileData ? (
                  <>
                    {/* Basic Status & Identity Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permanent ID</p>
                        <p className="text-base font-extrabold text-[#1A1A1A] mt-1 font-mono">{profileData.permanentId || "Not Assigned Yet"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporary ID</p>
                        <p className="text-base font-extrabold text-[#FF7400] mt-1 font-mono">{profileData.tempId}</p>
                      </div>
                    </div>

                    {/* Personal Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Personal Information</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                          <p className="font-extrabold text-slate-700 mt-1">{profileData.dob ? new Date(profileData.dob).toLocaleDateString() : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</p>
                          <p className="font-extrabold text-slate-700 mt-1">{profileData.age ? `${profileData.age} years` : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</p>
                          <p className="font-extrabold text-slate-700 mt-1 capitalize">{profileData.gender?.toLowerCase() || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Group</p>
                          <p className="font-extrabold text-slate-700 mt-1">{profileData.bloodGroup || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nationality</p>
                          <p className="font-extrabold text-slate-700 mt-1">{profileData.nationality || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Contact Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                          <p className="font-extrabold text-slate-700 mt-1">{profileData.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</p>
                          <p className="font-extrabold text-slate-700 mt-1">{profileData.mobileNumber || "N/A"}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residential Address</p>
                          <p className="font-extrabold text-slate-700 mt-1">
                            {profileData.address ? `${profileData.address}, ${profileData.city}, ${profileData.state} - ${profileData.addressPincode || profileData.pincode}` : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Match & Coaching Details (Only for players) */}
                    {userRole === "PLAYER" && (
                      <>
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Match Statistics</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Wins</p>
                              <p className="text-2xl font-black text-emerald-700 mt-1">{profileData.wins || 0}</p>
                            </div>
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                              <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Losses</p>
                              <p className="text-2xl font-black text-rose-700 mt-1">{profileData.losses || 0}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-center">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Draws</p>
                              <p className="text-2xl font-black text-slate-700 mt-1">{profileData.draws || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Location & Coaching</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">District</p>
                              <p className="font-extrabold text-slate-700 mt-1">{profileData.district?.name || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academy / Club</p>
                              <p className="font-extrabold text-slate-700 mt-1">{profileData.club?.name || "Independent"}</p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Coach</p>
                              <p className="font-extrabold text-[#FF7400] mt-1">
                                {profileData.coach ? `${profileData.coach.fullName} (${profileData.coach.presentGradeInJudo || "Certified"})` : "No Coach Assigned"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    Failed to load profile details.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t flex justify-end shrink-0">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-6 py-3 bg-[#FF7400] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all text-sm"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
