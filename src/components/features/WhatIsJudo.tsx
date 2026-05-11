"use client";

import React from 'react';
import Image from 'next/image';

const WhatIsJudo = () => {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        {/* Title Section */}
        <div className="mb-12 relative md:pl-20">
          <h2 className="text-4xl md:text-[80px] font-bold text-black mb-4 tracking-tight leading-none">
            What is Judo?
          </h2>
          {/* Double Underline */}
          <div className="relative w-full h-[1px] bg-gray-200">
            <div 
              className="absolute top-[-2px] left-0 w-full max-w-[1280px] h-[5px] bg-black"
              style={{ clipPath: 'polygon(0 0, 100% 40%, 100% 60%, 0 100%)' }}
            ></div>
          </div>
        </div>

        {/* Intro Paragraph */}
        <p className="text-gray-500 text-[12px] md:text-[15px] leading-relaxed mb-20 max-w-7xl font-medium md:pl-20">
          Judo is a modern martial art, Olympic sport, and a system of physical and mental education that focuses on skill, balance, and technique rather than brute strength. <br className="hidden md:block" />
          It was founded in <span className="font-bold text-gray-900">1882 by Dr. Jigoro Kano in Tokyo, Japan.</span> Drawing from traditional Japanese jujutsu, Dr. Kano created Judo to promote not only self-defense but also personal development and discipline.
        </p>

        {/* First Content Block: Image Left, Text Right */}
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-24">
          {/* Polaroid Image Container */}
          <div className="relative w-full lg:w-1/2 flex justify-center">
            <div className="relative p-[2px] bg-gradient-to-br from-yellow-400 to-red-500 rounded-2xl shadow-[0px_8px_24px_rgba(255,116,0,0.08)] w-full max-w-lg">
              <div className="bg-white p-4 rounded-xl">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg mb-8 bg-gray-50">
                  <Image 
                    src="/homepage/whatjudo/judo1.png" 
                    alt="Judo Action 1" 
                    fill 
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-cover"
                    priority
                  />
                </div>
                {/* The bottom space of polaroid */}
                <div className="h-12 bg-white w-full"></div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="w-full lg:w-1/2 space-y-8">
            <p className="text-gray-700 text-sm md:text-base leading-relaxed">
              The term <span className="text-[#FF7400] font-bold">"Judo"</span> means <span className="text-[#FF7400] font-bold">"the gentle way"</span>. This reflects the core principle of using an opponent's energy and movement against them, instead of relying on force. Judo techniques mainly include throws (Nage-waza), ground control such as pins, joint locks, and chokeholds (Katame-waza), all practiced in a safe and controlled manner.
            </p>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed">
              Judo is built on two important principles: <span className="text-[#FF7400] font-bold">"Maximum Efficiency with Minimum Effort"</span> and <span className="text-[#FF7400] font-bold">"Mutual Welfare and Benefit"</span>. These values teach respect, humility, and cooperation. Practitioners, known as judokas, develop physical fitness, mental strength, confidence, and discipline through consistent training.
            </p>
            <p className="text-gray-700 text-sm md:text-base leading-relaxed">
              Judo gained international recognition and became an official Olympic sport in the 1964 Summer Olympics. Today, it is practiced in schools, clubs, and institutions across the world, making it one of the most popular martial arts globally.
            </p>
          </div>
        </div>

        {/* Quote & Second Image Layout */}
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-12 mt-10">
          {/* Centered Quote */}
          <div className="w-full md:w-2/3 flex flex-col items-center md:items-start md:pl-20">
            <h3 className="text-[20px] font-semibold text-black leading-none tracking-[0.04em] text-center md:text-left max-w-[812px]">
              Beyond competition, Judo is a lifelong journey that helps individuals build character, respect others, and maintain a healthy body and mind.
            </h3>
          </div>

          {/* Second Image Card (Right aligned) */}
          <div className="w-full md:w-1/3 flex justify-end md:pr-16">
            <div className="relative p-[2px] bg-gradient-to-br from-yellow-400 to-red-500 rounded-2xl shadow-[0px_8px_24px_rgba(255,116,0,0.08)] w-full max-w-sm">
              <div className="bg-white p-2 rounded-xl">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg mb-4 bg-gray-50">
                  <Image 
                    src="/homepage/whatjudo/judo2.png" 
                    alt="Judo Action 2" 
                    fill 
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                  />
                </div>
                {/* The bottom space of polaroid */}
                <div className="h-6 bg-white w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsJudo;
