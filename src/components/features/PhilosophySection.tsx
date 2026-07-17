"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const PhilosophySection = () => {
  // Using distinct images to prevent any repetition in the carousel
  const images = [
    {
      name: "DR.\nJIGORO KANO",
      image: "/1.png"
    },
    {
      name: "SENSEI.\nELAMPARUTHI",
      image: "/2.png"
    },
    {
      name: "SENSEI.\nMANOHAR BANGERA",
      image: "/3.png"
    },
    {
      name: "SENSEI.\nJEEVAN SHARMA",
      image: "/4.png"
    },
    {
      name: "SENSEI.\nSATHISH PAHADE",
      image: "/5.png"
    },
    {
      name: "SENSEI.\nMANIKUMAR",
      image: "/6.png"
    },
    {
      name: "SENSEI.\nMATHIVANAN",
      image: "/7.png"
    },
    {
      name: "SENSEI.\nBALACHANDAR (NATIONAL MEDALIST)",
      image: "/8.png"
    },
    {
      name: "SENSEI.\n VENKATACHALAPATHI",
     
       image: "/9.png"
    },
    {
      name: "MR.YAZIR\n NATIONAL MEDALIST",
      image: "/10.png"
    },
    {
      name: "SENSEI.\nMUNNAVER",
     
       image: "/11.png"
    },
    {
      name: "SENSEI.\nDESAPPAN",
      image: "/12.png"
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  const cards = [
    {
      id: "01",
      text: "Tamil Nadu is a land of valour, discipline, and unwavering spirit from the courage of ancient Tamil warriors to the resilience of todays athletes. The Tamil Nadu Judo Association (TNJA) carries this proud legacy forward through the art and philosophy of Judo.",
      reverse: false
    },
    {
      id: "02",
      text: "From village dojos to national and international arenas, we nurture talent through structured training, ethical competition, and continuous guidance by certified coaches and officials. Our mission is to build champions who uphold Tamil pride, sporting excellence, and global standards.",
      reverse: true
    },
    {
      id: "03",
      text: "Born in 1882, Judo made its way to Indian soil in 1929. Since then, it has blossomed through generations thanks to the passionate efforts of stalwarts like Sensei N.T. Bangera, Sensei Khanewala, Behram Mistry, and more recently, Sensei Mukesh.",
      reverse: false
    }
  ];

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getImageAt = (offset: number) => {
    const index = (activeIndex + offset + images.length) % images.length;
    return images[index].image;
  };

  return (
    <section className="w-full bg-[#fafafa] py-16 overflow-hidden">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="max-w-[1400px] mx-auto px-4 relative"
      >

        {/* Top Titles (Fades In First) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-between items-center mb-16 text-[12px] md:text-[14px] font-bold italic text-gray-500 px-4 md:px-32 relative z-20"
        >
          <div className="flex flex-col items-center gap-3">
            <span>The Legacy of Tamil Valor!</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF7400]" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <span>The Way of Discipline!</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF7400]" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <span>The Philosophy of Judo!</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF7400]" />
          </div>
        </motion.div>

        {/* Carousel Container */}
        <div className="relative flex items-center justify-center w-full min-h-[450px]">

          {/* Background Dotted Concentric Circles */}
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            whileInView={{ opacity: 1, rotate: 360 }}
            transition={{ opacity: { duration: 1, delay: 1.5 }, rotate: { duration: 80, repeat: Infinity, ease: "linear" } }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full border border-[#FF7400]/20 border-dashed pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            whileInView={{ opacity: 1, rotate: -360 }}
            transition={{ opacity: { duration: 1, delay: 1.5 }, rotate: { duration: 100, repeat: Infinity, ease: "linear" } }}
            className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full border border-[#FF7400]/20 border-dashed pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            whileInView={{ opacity: 1, rotate: 360 }}
            transition={{ opacity: { duration: 1, delay: 1.5 }, rotate: { duration: 120, repeat: Infinity, ease: "linear" } }}
            className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full border border-[#FF7400]/20 border-dashed pointer-events-none"
          />

          {/* Left Navigation Arrow */}
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.6 }}
            onClick={prevSlide}
            className="absolute left-4 md:left-12 z-30 w-12 h-12 rounded-full border border-[#FF7400]/30 flex items-center justify-center bg-white hover:border-[#FF7400] shadow-sm transition-colors text-[#FF7400]"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>

          {/* Right Navigation Arrow */}
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.6 }}
            onClick={nextSlide}
            className="absolute right-4 md:right-12 z-30 w-12 h-12 rounded-full border border-[#FF7400]/30 flex items-center justify-center bg-white hover:border-[#FF7400] shadow-sm transition-colors text-[#FF7400]"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>

          {/* Cards Wrapper */}
          <div className="relative flex items-center justify-center w-full h-[450px]">

            {/* Orange Glow Behind Center Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="absolute z-0 w-[400px] h-[400px] bg-[#FF7400]/15 blur-[60px] rounded-full pointer-events-none"
            />

            {/* Extreme Left (-2) */}
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.3, type: "spring", bounce: 0.2 }}
              className="hidden xl:block absolute left-[15%] z-0 transition-all duration-700"
            >
              <div className="w-[120px] h-[160px] rounded-2xl overflow-hidden opacity-40 blur-[2px] shadow-sm border border-gray-100 flex flex-col items-center bg-white">
                <div className="relative w-full h-full">
                  <Image src={getImageAt(-2)} alt="Profile" fill className="object-cover" />
                </div>
                <div className="absolute bottom-0 w-full h-[30px] bg-gradient-to-t from-white to-transparent" />
              </div>
            </motion.div>

            {/* Left (-1) */}
            <motion.div
              initial={{ opacity: 0, x: -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.1, type: "spring", bounce: 0.3 }}
              className="hidden md:block absolute left-[25%] lg:left-[28%] z-10 transition-all duration-700"
            >
              <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden opacity-70 blur-[1px] shadow-md border border-gray-200 flex flex-col items-center bg-white">
                <div className="relative w-full h-full">
                  <Image src={getImageAt(-1)} alt="Profile" fill className="object-cover" />
                </div>
                <div className="absolute bottom-0 w-full h-[40px] bg-gradient-to-t from-white to-transparent" />
              </div>
            </motion.div>

            {/* Active Center (0) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, type: "spring", bounce: 0.4 }}
              className="absolute z-20 transition-all duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl bg-white border border-gray-100"
            >
              <div className="w-[280px] md:w-[320px] h-[360px] md:h-[400px] flex flex-col relative overflow-hidden rounded-2xl group">
                {/* Image Section */}
                <div className="relative flex-1 bg-white">
                  <Image
                    src={getImageAt(0)}
                    alt="Active Profile"
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Bottom White Fade Gradient */}
                  <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-white to-transparent" />
                </div>
              </div>
            </motion.div>

            {/* Right (+1) */}
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.1, type: "spring", bounce: 0.3 }}
              className="hidden md:block absolute right-[25%] lg:right-[28%] z-10 transition-all duration-700"
            >
              <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden opacity-70 blur-[1px] shadow-md border border-gray-200 flex flex-col items-center bg-white">
                <div className="relative w-full h-full">
                  <Image src={getImageAt(1)} alt="Profile" fill className="object-cover" />
                </div>
                <div className="absolute bottom-0 w-full h-[40px] bg-gradient-to-t from-white to-transparent" />
              </div>
            </motion.div>

            {/* Extreme Right (+2) */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.3, type: "spring", bounce: 0.2 }}
              className="hidden xl:block absolute right-[15%] z-0 transition-all duration-700"
            >
              <div className="w-[120px] h-[160px] rounded-2xl overflow-hidden opacity-40 blur-[2px] shadow-sm border border-gray-100 flex flex-col items-center bg-white">
                <div className="relative w-full h-full">
                  <Image src={getImageAt(2)} alt="Profile" fill className="object-cover" />
                </div>
                <div className="absolute bottom-0 w-full h-[30px] bg-gradient-to-t from-white to-transparent" />
              </div>
            </motion.div>

          </div>
        </div>

        {/* Title Below Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="flex flex-col items-center justify-center mt-6 text-center"
        >
          <h2 className="text-xl md:text-2xl font-[900] text-black tracking-[0.2em] uppercase leading-snug whitespace-pre-line">
            {images[activeIndex].name}
          </h2>
        </motion.div>

        {/* Numbered Info Cards */}
        <div className="flex flex-col gap-10 mt-16 max-w-[1100px] mx-auto px-4 md:px-0 relative z-20">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
              className={`relative flex flex-col md:flex-row items-stretch bg-white rounded-[16px] border border-[#ffb800]/30 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] ${card.reverse ? 'md:flex-row-reverse' : ''}`}
            >
              {/* Glow Behind Dark Block */}
              <div className={`absolute top-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF7400]/40 blur-[50px] rounded-full pointer-events-none ${card.reverse ? '-right-10' : '-left-10'}`} />

              {/* Number Block */}
              <div className="relative z-10 flex items-center justify-center min-w-[140px] md:min-w-[220px] m-1.5 md:m-2 rounded-[12px] bg-[#1a0e05] py-8 md:py-0">
                <span className="text-6xl md:text-[75px] font-bold text-[#ffb000] leading-none tracking-tighter">
                  {card.id}
                </span>
              </div>

              {/* Content Body */}
              <div className="relative z-10 flex-1 px-8 py-8 md:py-10 md:px-12 flex items-center justify-center bg-white text-center">
                <p className="text-gray-600 text-[13px] md:text-[15px] font-medium leading-[1.8] max-w-3xl">
                  {card.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </section>
  );
};

export default PhilosophySection;
