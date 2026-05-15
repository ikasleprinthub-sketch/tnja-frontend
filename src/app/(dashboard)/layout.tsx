"use client";

import React, { useState, useEffect } from "react";
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
  MessageSquare
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
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
    "STATE_PRESIDENT", "STATE_SECRETARY",
    "DISTRICT_ADMIN"
  ].includes(userRole);

  const navItems = (isPromotedRole || userRole === "SUPER_ADMIN") 
    ? adminNavItems 
    : [
        { name: "My Profile", href: "/dashboard/member", icon: User },
        { name: "Events", href: "/dashboard/member/events", icon: Calendar },
        { name: "Grievances", href: "/dashboard/grievance", icon: MessageSquare },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
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
            <button className="p-2 text-slate-400 hover:text-brand-orange relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-3 border-l pl-6 border-slate-200">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{userName}</p>
                <p className="text-xs text-slate-400 capitalize">{userRole?.replace("_", " ")}</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-[#FF7400] font-bold border-2 border-white shadow-sm">
                {userName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-grow overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
