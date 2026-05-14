"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaTwitter, FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const Footer = () => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDashboard = pathname?.startsWith("/dashboard");
  const isLoggedIn = isMounted && typeof window !== 'undefined' && !!localStorage.getItem("token");

  if (isDashboard || isLoggedIn) return null;

  return (
    <footer className="w-full bg-white pt-16 pb-8 px-4 md:px-12 lg:px-24">
      {/* Top Border Line */}
      <div className="max-w-[1440px] mx-auto h-[1px] bg-orange-200 mb-16"></div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Column 1: Logo and Socials */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-24 h-24 mb-6">
            <Image src="/navbar/Logo.png" alt="TNJA Logo" fill sizes="100px" className="object-contain" />
          </div>
          <p className="text-[#FF7400] font-bold text-sm leading-tight mb-8">
            TAMIL NADU JUDO <br /> ASSOCIATION 329/2017
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-[#FF7400] flex items-center justify-center text-white hover:bg-black transition-colors duration-300">
              <FaFacebook size={20} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-[#FF7400] flex items-center justify-center text-white hover:bg-black transition-colors duration-300">
              <FaInstagram size={20} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-[#FF7400] flex items-center justify-center text-white hover:bg-black transition-colors duration-300">
              <FaLinkedin size={20} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-[#FF7400] flex items-center justify-center text-white hover:bg-black transition-colors duration-300">
              <FaTwitter size={20} />
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h3 className="text-[#FF7400] font-bold text-xl mb-8">Quick Links</h3>
          <ul className="space-y-4 text-gray-600 font-medium text-sm">
            <li><Link href="/" className="hover:text-[#FF7400] transition-colors">Home</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Latest New</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Upcoming Events</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Courses</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Gallery</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Members</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Committee</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Terms of Services</Link></li>
            <li><Link href="#" className="hover:text-[#FF7400] transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Column 3: About TJA */}
        <div>
          <h3 className="text-[#FF7400] font-bold text-xl mb-8">About TJA</h3>
          <p className="text-black font-bold text-sm mb-4 leading-relaxed">
            Empowering Tamil Nadu Through <br /> the Spirit of Judo
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            Tamil Nadu Judo Association is dedicated to promoting the art and discipline of Judo across the state. We nurture athletes of all levels through structured training, championships, and a strong foundation in values.
          </p>
        </div>

        {/* Column 4: Contact With Us */}
        <div>
          <h3 className="text-[#FF7400] font-bold text-xl mb-8">Contact With Us</h3>
          <div className="space-y-6 text-sm">
            <div>
              <p className="font-bold text-black mb-2">Address</p>
              <p className="text-gray-600 leading-relaxed">
                TamilNadu Judo Association <br />
                12/1, Ground floor, 1st Cross st, <br />
                Jeth nagar, RA Puram, <br />
                Chennai - 600028
              </p>
            </div>
            <div>
              <p className="font-bold text-black mb-1">Call Us</p>
              <p className="text-gray-600">9003713500</p>
            </div>
            <div>
              <p className="font-bold text-black mb-1">Mail Us</p>
              <p className="text-gray-600">tnja.adoffice@gmail.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Border Line */}
      <div className="max-w-[1440px] mx-auto h-[1px] bg-[#FF7400] mb-8"></div>

      {/* Copyright */}
      <div className="text-center text-sm font-bold text-gray-800">
        <p>
          © {new Date().getFullYear()} All Rights Reserved. Website Developed by <span className="text-[#FF7400]">IKASLÉ BUSINESS GROUP</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
