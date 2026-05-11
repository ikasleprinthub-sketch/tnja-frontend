"use client";

import React from 'react';
import Image from 'next/image';

const PhilosophySection = () => {
  const kanoImages = [
    "/homepage/philosophy/kano.png",
    "/homepage/philosophy/kano2.png",
  ];

  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % kanoImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [kanoImages.length]);

  const getImageAt = (offset: number) => {
    const index = (activeIndex + offset + kanoImages.length) % kanoImages.length;
    return kanoImages[index];
  };

  const cards = [
    {
      id: "01",
      text: "Tamil Nadu is a land of valour, discipline, and unwavering spirit from the courage of ancient Tamil warriors to the resilience of today's athletes. The Tamil Nadu Judo Association (TNJA) carries this proud legacy forward through the art and philosophy of Judo.",
      reverse: false
    },
    {
      id: "02",
      text: "From village dojos to national and international arenas, we nurture talent through structured training, ethical competition, and continuous guidance by certified coaches and officials. Our mission is to build champions who uphold Tamil pride, sporting excellence, and global standards.",
      reverse: true
    },
    {
      id: "03",
      text: "Born in 1882, Judo made its way to Indian soil in 1929. Since then, it has blossomed through generations thanks to the passionate efforts of stalwarts like Sensei N.T. Bangera, Sensei Khanawala, Behram Mistry, and more recently, Sensei Mukesh.",
      reverse: false
    }
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Top Titles */}
        <div className="flex justify-between items-center mb-16 text-[14px] md:text-[18px] font-medium italic text-gray-500 px-4 md:px-12">
          <span>The Legacy of Tamil Valor!</span>
          <span className="hidden md:block">The Way of Discipline!</span>
          <span>The Philosophy of Judo!</span>
        </div>

        {/* Kano Gallery Carousel */}
        <div className="relative flex items-end justify-center gap-2 md:gap-8 mb-24 min-h-[300px] md:min-h-[450px]">
          {/* Edge Images (Deep blur & fade) */}
          <div className="hidden xl:block relative w-[120px] h-[160px] opacity-20 blur-[6px] transition-all duration-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent z-20"></div>
            <Image 
              src={getImageAt(-2)} 
              alt="Dr. Jigoro Kano" 
              fill 
              sizes="120px" 
              className="object-cover rounded-2xl" 
            />
          </div>
          <div className="relative w-[150px] h-[200px] md:w-[220px] md:h-[300px] opacity-40 blur-[3px] transition-all duration-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent z-20"></div>
            <Image 
              src={getImageAt(-1)} 
              alt="Dr. Jigoro Kano" 
              fill 
              sizes="(max-width: 768px) 150px, 220px" 
              className="object-cover rounded-2xl" 
            />
          </div>
          
          {/* Main Image (Sharp Focus with Bottom Fade) */}
          <div className="relative w-[220px] h-[300px] md:w-[380px] md:h-[500px] z-10 transition-all duration-1000 group mx-2 md:mx-4">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-20"></div>
            <Image 
              src={getImageAt(0)} 
              alt="Dr. Jigoro Kano" 
              fill 
              sizes="(max-width: 768px) 220px, 380px"
              className="object-cover rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.08)]" 
              priority
            />
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-full">
              <p className="text-2xl md:text-3xl font-[900] text-black tracking-tight uppercase">Dr. Jigoro Kano</p>
            </div>
          </div>

          {/* Right Side (Symmetrical Fade) */}
          <div className="relative w-[150px] h-[200px] md:w-[220px] md:h-[300px] opacity-40 blur-[3px] transition-all duration-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent z-20"></div>
            <Image 
              src={getImageAt(1)} 
              alt="Dr. Jigoro Kano" 
              fill 
              sizes="(max-width: 768px) 150px, 220px" 
              className="object-cover rounded-2xl" 
            />
          </div>
          <div className="hidden xl:block relative w-[120px] h-[160px] opacity-20 blur-[6px] transition-all duration-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent z-20"></div>
            <Image 
              src={getImageAt(2)} 
              alt="Dr. Jigoro Kano" 
              fill 
              sizes="120px" 
              className="object-cover rounded-2xl" 
            />
          </div>
        </div>

        {/* Numbered Info Cards */}
        <div className="flex flex-col gap-16 mt-24 max-w-6xl mx-auto">
          {cards.map((card) => (
            <div 
              key={card.id} 
              className={`flex flex-col md:flex-row items-stretch gap-0 rounded-2xl overflow-hidden group transition-all duration-500 border border-[#FF7400] shadow-[0_4px_16px_rgba(255,116,0,0.2)] hover:shadow-[0_8px_24px_rgba(255,116,0,0.4)] ${card.reverse ? 'md:flex-row-reverse' : ''}`}
            >
              {/* Number Block */}
              <div className="bg-[#2B1300] flex items-center justify-center p-6 md:p-8 min-w-[140px] md:min-w-[160px] transition-colors duration-500 group-hover:bg-[#1A0B00] rounded-2xl border-[1px] border-[#FF7400]">
                <span className="text-4xl md:text-6xl font-bold leading-none tracking-tighter bg-gradient-to-b from-[#FF7400] to-[#FFDA00] bg-clip-text text-transparent">
                  {card.id}
                </span>
              </div>
              
              {/* Content Body */}
              <div className={`bg-white flex-1 p-6 md:p-8 flex items-center border-[#FF7400] rounded-b-2xl md:rounded-b-none ${card.reverse ? 'md:rounded-l-2xl' : 'md:rounded-r-2xl'}`}>
                <p className="text-gray-600 text-xs md:text-sm leading-relaxed font-medium">
                  {card.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;
