"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const players = [
  {
    name: "DR. JIGORO KANO",
    role: "FOUNDER & CEO",
    quote: "Lorem ipsum dolor sit amet consectetur. Posuere lobortis integer vulputate enim sapien at mi. Leo ut maecenas ac facilisi feugiat. Nullam ante maecenas eu pellentesque varius magna vitae. Sagittis egestas non eget ut risus in tempor aliquam volutpat.",
    image: "/homepage/kano.png"
  },
  {
    name: "SENSEI N.T. BANGERA",
    role: "CHIEF COACH",
    quote: "Judo is the way to the most effective use of both physical and spiritual power. By training you in attacks and defenses, it refines your body and your soul and helps you make the spiritual essence of Judo a part of your very being.",
    image: "/homepage/kano.png"
  },
  {
    name: "SENSEI MUKESH",
    role: "TECHNICAL DIRECTOR",
    quote: "The objective of Judo is to understand the nature of things by cultivating wisdom through training. It is not just about winning on the mat, but about winning in life through discipline and respect.",
    image: "/homepage/kano.png"
  }
];

const TalentedPlayers = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      zIndex: 0
    }),
    center: {
      zIndex: 10,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const sideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 0.25
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % players.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + players.length) % players.length);
  };

  const getPrevIndex = () => (currentIndex - 1 + players.length) % players.length;
  const getNextIndex = () => (currentIndex + 1) % players.length;

  return (
    <section className="w-full py-24 bg-white overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 text-center">
        {/* Section Header */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-5xl font-extrabold text-black mb-4 tracking-tight">
            Our <span className="text-[#FF7400]">Talented</span> Players
          </h2>
          <p className="text-gray-600 font-medium italic tracking-[0.35em] text-lg">
            Our Coaches, Our Pride
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative flex items-center justify-center py-10 min-h-[600px]">
          
          {/* Main Carousel Viewport */}
          <div className="relative w-full max-w-[900px] h-[500px] flex items-center justify-center">
            
            {/* Previous Slide Preview (Animated) */}
            <div className="absolute right-[calc(100%+80px)] hidden lg:block w-[300px] h-[400px] pointer-events-none">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={`prev-${getPrevIndex()}`}
                  custom={direction}
                  variants={sideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative w-full h-full rounded-[24px] overflow-hidden border border-gray-100 shadow-xl"
                >
                  <Image 
                    src={players[getPrevIndex()].image} 
                    alt="Previous Player" 
                    fill 
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Current Slide (Animated) */}
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 200, damping: 26 },
                  opacity: { duration: 0.4 }
                }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Card Wrapper */}
                <div 
                  className="bg-white rounded-[32px] overflow-hidden flex flex-col md:flex-row border border-[#FF7400]/20 h-full"
                  style={{ boxShadow: '0px 0px 40px 0px rgba(255, 116, 0, 0.239)' }}
                >
                  {/* Left Side: Content */}
                  <div className="flex-1 p-8 md:p-12 text-left flex flex-col justify-between h-full">
                    <div>
                      <div className="mb-8 relative w-10 h-8">
                        <Image src="/homepage/vector/quote.svg" alt="Quote" fill className="object-contain" />
                      </div>
                      
                      <p className="text-gray-800 text-sm md:text-lg leading-relaxed font-semibold italic mb-8">
                        "{players[currentIndex].quote}"
                      </p>
                    </div>

                    <div className="text-right mt-auto">
                      <h4 className="text-[#FF7400] font-black text-lg md:text-xl tracking-wider uppercase mb-1">
                        {players[currentIndex].name}
                      </h4>
                      <p className="text-gray-500 font-bold text-xs md:text-sm tracking-widest uppercase">
                        {players[currentIndex].role}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Image */}
                  <div className="w-full md:w-[48%] relative min-h-[300px] md:min-h-full">
                    <div className="absolute inset-2 rounded-[24px] overflow-hidden shadow-xl border-4 border-white">
                      <Image 
                        src={players[currentIndex].image} 
                        alt={players[currentIndex].name} 
                        fill 
                        className="object-cover"
                      />
                      <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Next Slide Preview (Animated) */}
            <div className="absolute left-[calc(100%+80px)] hidden lg:block w-[300px] h-[400px] pointer-events-none">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={`next-${getNextIndex()}`}
                  custom={direction}
                  variants={sideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative w-full h-full rounded-[24px] overflow-hidden border border-gray-100 shadow-xl"
                >
                  <Image 
                    src={players[getNextIndex()].image} 
                    alt="Next Player" 
                    fill 
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex justify-center gap-6 mt-16">
          <button 
            onClick={prevSlide}
            className="w-12 h-12 rounded-full border-2 border-[#FF7400] text-[#FF7400] flex items-center justify-center hover:bg-[#FF7400] hover:text-white transition-all duration-300 group"
          >
            <ChevronLeft size={28} strokeWidth={3} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button 
            onClick={nextSlide}
            className="w-12 h-12 rounded-full bg-[#FF7400] text-white flex items-center justify-center hover:bg-black transition-all duration-300 shadow-lg shadow-orange-200 group"
          >
            <ChevronRight size={28} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default TalentedPlayers;
