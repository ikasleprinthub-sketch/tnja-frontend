"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import Button from "./Button";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  const topNavLinks = [
    { name: "TESTIMONIAL", href: "#" },
    { name: "GALLERY", href: "#" },
    { name: "ABOUT US", href: "#" },
    { name: "BLOG", href: "#" },
    { name: "CAREER & OPPORTUNITIES", href: "#" },
    { name: "EDUCATION", href: "#" },
    { name: "TENDORS", href: "#" },
    { name: "SPORTS COMMISSION", href: "#" },
    { name: "CALENDER", href: "#" },
  ];

  const mainNavLinks = [
    { name: "Home", href: "/" },
    { name: "Members", href: "#", hasDropdown: true },
    { name: "Committee", href: "#", hasDropdown: true },
    { name: "News & Events", href: "#", hasDropdown: true },
    { name: "Honours & Thanks", href: "#", hasDropdown: true },
    { name: "Counseling", href: "#", hasDropdown: true },
    { name: "Judo Tutorial", href: "#", hasDropdown: true },
    { name: "Contact Us", href: "/contact" },
  ];

  return (
    <header className="w-full relative z-50">
      {/* Top Header - Hidden on Mobile, Shown on Desktop (xl+) */}
      <div 
        className="hidden xl:block relative w-full text-[#FF7400] py-2 md:py-3 overflow-hidden min-h-[36px] md:min-h-[40px] shadow-[0_2px_8px_0_rgba(43,19,0,0.4)]"
        style={{
          background: 'linear-gradient(to right, #FFFFFF 0%, #2B1300 12%, #2B1300 88%, #FFFFFF 100%)'
        }}
      >
        {/* Decorative SVGs */}
        {/* <div className="absolute left-0 top-0 h-full w-[25%] pointer-events-none opacity-60 md:opacity-80">
          <Image src="/navbar/left-assests.svg" alt="" fill className="object-contain object-left scale-125 md:scale-110" />
        </div>
        <div className="absolute right-0 top-0 h-full w-[25%] pointer-events-none opacity-60 md:opacity-80">
          <Image src="/navbar/right-assests.svg" alt="" fill className="object-contain object-right scale-125 md:scale-110" />
        </div> */}

        <div className="container mx-auto px-4 flex justify-center items-center relative z-10">
          <nav className="flex flex-wrap justify-center gap-x-3 md:gap-x-6 gap-y-1 text-[9px] md:text-[11px] font-bold tracking-wide">
            {topNavLinks.map((link) => (
              <Link key={link.name} href={link.href} className="hover:text-white transition-colors uppercase whitespace-nowrap">
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Header */}
      <div className="relative w-full bg-white py-2 md:py-3 px-4 md:px-8 overflow-hidden border-b border-gray-100">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #f26522 1px, transparent 1px), linear-gradient(to bottom, #f26522 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />

        <div className="max-w-[1440px] mx-auto flex items-center relative z-10">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="group block">
              <Image 
                src="/navbar/Logo.png" 
                alt="TNJA Logo" 
                width={100} 
                height={100} 
                priority
                loading="eager"
                sizes="(max-width: 768px) 100vw, 100px"
                className="w-auto h-12 md:h-16 object-contain transition-transform group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex flex-1 justify-center items-center gap-6 xl:gap-8">
            {mainNavLinks.map((link) => (
              <div key={link.name} className="group relative flex items-center gap-1 cursor-pointer">
                <Link href={link.href} className="text-[14px] font-bold text-gray-900 hover:text-[#f26522] transition-colors">
                  {link.name}
                </Link>
                {link.hasDropdown && (
                  <svg className="w-2.5 h-2.5 text-gray-500 group-hover:text-[#f26522] transition-colors mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            ))}
          </nav>

          {/* Buttons & Hamburger */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-auto">
            <div className="hidden lg:flex items-center gap-3">
              <Button href="/login" variant="outline">
                Login / Sign In
              </Button>
              <Button href="/register" variant="primary">
                Register Now
              </Button>
            </div>

            {/* Hamburger Button */}
            <button 
              className="xl:hidden p-2 text-gray-600 hover:text-[#f26522] transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[88px] md:top-[100px] bg-white z-50 xl:hidden overflow-y-auto animate-in slide-in-from-right duration-300">
          <div className="p-6 flex flex-col gap-6">
            {/* Main Navigation Links */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Main Menu</span>
              {mainNavLinks.map((link) => (
                <div key={link.name} className="border-b border-gray-50 last:border-0">
                  <Link 
                    href={link.href}
                    className="py-3 text-lg font-bold text-gray-800 hover:text-[#f26522] flex items-center justify-between group"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                    {link.hasDropdown && (
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-[#f26522]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    )}
                  </Link>
                </div>
              ))}
            </div>

            {/* Top Bar Links Section */}
            <div className="bg-gray-50/50 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-[10px] font-black text-[#FF7400] uppercase tracking-widest mb-3">Quick Links</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {topNavLinks.map((link) => (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className="text-[13px] font-bold text-gray-600 hover:text-[#FF7400] transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-2">
              <Button 
                href="/login" 
                variant="outline"
                className="w-full h-[48px] rounded-xl text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Login / Sign In
              </Button>
              <Button 
                href="/register" 
                variant="primary"
                className="w-full h-[48px] rounded-xl text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Register Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
