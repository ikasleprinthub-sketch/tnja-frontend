"use client";

import React from "react";
import Image from "next/image";
import { motion, useInView, Variants } from "framer-motion";
import { ShieldCheck, Handshake, HeartPulse, ShoppingBag, Heart, ShoppingCart } from "lucide-react";

const JudoJourneySection = () => {
  // We'll use a ref for the container to trigger animations when it scrolls into view
  const ref = React.useRef(null);
  const isInView = useInView(ref, { amount: 0.2 });

  // Animation variants
  const sectionVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } }
  };

  const glowVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1, delay: 0.3 } }
  };

  const leftSlide: Variants = {
    hidden: { opacity: 0, x: -100 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 50, damping: 20, delay: 0.6 } }
  };

  const rightSlide: Variants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 50, damping: 20, delay: 0.6 } }
  };

  const borderDraw: Variants = {
    hidden: { borderColor: "rgba(255,116,0,0)" },
    visible: { borderColor: "rgba(255,116,0,1)", transition: { duration: 1, delay: 1.2 } }
  };

  const lineVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 1.5 + custom * 0.15, duration: 0.5 }
    })
  };

  const iconVariants: Variants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: (custom: number) => ({
      opacity: 1,
      scale: 1,
      transition: { type: "spring", delay: 2.2 + custom * 0.2, duration: 0.5 }
    })
  };

  return (
    <motion.section 
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="relative w-full min-h-[100svh] bg-[#050505] py-16 md:py-24 px-4 md:px-12 overflow-hidden mt-4 flex flex-col justify-center"
    >

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="w-full max-w-[1300px] mx-auto flex flex-col items-center gap-16 relative z-10">
        
        {/* Main Combined Card */}
        <motion.div 
          variants={borderDraw}
          className="relative w-full rounded-[40px] border-[2px] shadow-[0_0_40px_rgba(255,116,0,0.15)] bg-[#111] overflow-hidden flex flex-col lg:flex-row"
        >
          {/* Orange glow expands */}
          <motion.div 
            variants={glowVariants}
            className="absolute inset-0 bg-[#FF7400]/10 blur-[80px] pointer-events-none"
          />
          
          {/* Top Center Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: 1, type: "spring", bounce: 0.5 }}
            className="absolute top-0 left-1/2 lg:left-[45%] -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] bg-black rounded-full border-[2px] border-[#FF7400] shadow-[0_0_30px_rgba(255,116,0,0.6)] z-30 flex items-center justify-center"
          >
            {/* The circular text SVG */}
            <div className="absolute inset-0 m-auto w-full h-full p-1 animate-spin-slow" style={{ animationDuration: '20s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/90">
                <path id="textPath" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
                <text fontSize="9.5" fontWeight="bold" letterSpacing="2.5" fill="currentColor">
                  <textPath href="#textPath" startOffset="0%">DISCIPLINE • RESPECT • STRENGTH • HONOR • </textPath>
                </text>
              </svg>
            </div>
            {/* Judo Uniform Icon */}
            <div className="relative w-8 h-8 z-10">
              <Image src="/navbar/Logo.png" alt="Icon" fill className="object-contain" />
            </div>
          </motion.div>

          {/* Left Side: Quote Content */}
          <motion.div 
            variants={leftSlide}
            className="relative w-full lg:w-[50%] p-10 md:p-16 z-20 flex flex-col justify-center"
          >
            {/* Faded Kanji Left */}
            <div className="absolute top-10 right-10 text-[140px] font-bold text-white/[0.03] leading-none select-none" style={{ writingMode: 'vertical-rl' }}>柔道</div>
            
            <span className="text-[60px] md:text-[80px] font-serif text-[#FF7400] leading-none absolute top-10 left-10 drop-shadow-[0_0_10px_rgba(255,116,0,0.3)]">“</span>
            
            <div className="relative z-10 pt-10 pb-12 border-b border-white/10">
              <h3 className="text-[18px] md:text-[22px] font-light text-gray-200 leading-[1.8] tracking-wide mb-8 italic flex flex-col">
                <motion.span custom={0} variants={lineVariants}>Beyond competition,</motion.span>
                <motion.span custom={1} variants={lineVariants}>Judo is a <span className="text-[#FF7400] font-bold not-italic">lifelong journey</span></motion.span>
                <motion.span custom={2} variants={lineVariants}>that helps individuals build character,</motion.span>
                <motion.span custom={3} variants={lineVariants}>respect others, and maintain a</motion.span>
                <motion.span custom={4} variants={lineVariants}>healthy body and mind.</motion.span>
              </h3>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 2.3 }}
                className="flex items-center gap-5"
              >
                <div className="w-12 h-[2px] bg-[#FF7400] shadow-[0_0_10px_#FF7400]" />
                <span className="text-white font-bold tracking-[0.15em] uppercase text-xs">The Philosophy</span>
              </motion.div>
            </div>

            {/* 3 Features */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 pt-8 relative z-10">
              {/* Feature 1 */}
              <motion.div custom={0} variants={iconVariants} className="flex items-center gap-3 group cursor-default">
                <div className="w-12 h-12 rounded-xl border border-[#FF7400]/40 bg-black/50 flex items-center justify-center shadow-inner group-hover:bg-[#FF7400]/20 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-[#FF7400]" />
                </div>
                <div>
                  <div className="text-white text-sm font-bold group-hover:text-[#FF7400] transition-colors">Build Character</div>
                  <div className="text-gray-400 text-xs">Strong Mind</div>
                </div>
              </motion.div>
              {/* Feature 2 */}
              <motion.div custom={1} variants={iconVariants} className="flex items-center gap-3 group cursor-default">
                <div className="w-12 h-12 rounded-xl border border-[#FF7400]/40 bg-black/50 flex items-center justify-center shadow-inner group-hover:bg-[#FF7400]/20 transition-colors">
                  <Handshake className="w-6 h-6 text-[#FF7400]" />
                </div>
                <div>
                  <div className="text-white text-sm font-bold group-hover:text-[#FF7400] transition-colors">Respect Others</div>
                  <div className="text-gray-400 text-xs">Better Society</div>
                </div>
              </motion.div>
              {/* Feature 3 */}
              <motion.div custom={2} variants={iconVariants} className="flex items-center gap-3 group cursor-default">
                <div className="w-12 h-12 rounded-xl border border-[#FF7400]/40 bg-black/50 flex items-center justify-center shadow-inner group-hover:bg-[#FF7400]/20 transition-colors">
                  <HeartPulse className="w-6 h-6 text-[#FF7400]" />
                </div>
                <div>
                  <div className="text-white text-sm font-bold group-hover:text-[#FF7400] transition-colors">Healthy Living</div>
                  <div className="text-gray-400 text-xs">Body & Mind</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side: Image with Swoop */}
          <motion.div 
            variants={rightSlide}
            className="relative lg:absolute lg:top-0 lg:bottom-0 lg:right-0 w-full lg:w-[55%] h-[400px] lg:h-auto z-10 overflow-hidden 
                       rounded-t-[40px] lg:rounded-t-none lg:rounded-l-[250px] border-t-2 lg:border-t-0 lg:border-l-[3px] border-[#FF7400] shadow-[0_-10px_30px_rgba(255,116,0,0.2)] lg:shadow-[-20px_0_40px_rgba(255,116,0,0.3)]"
          >
            <div className="absolute inset-0 w-full h-full pointer-events-auto">
              <Image
                src="/trainer.png"
                alt="Judo Master"
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                className="object-cover object-[center_35%] opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-black/40 mix-blend-overlay" />
              
              {/* Dots Pattern */}
              <div className="absolute top-10 right-8 grid grid-cols-4 gap-2 opacity-60">
                {Array.from({length: 24}).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF7400]" />)}
              </div>
              {/* Kanji Overlay Right */}
              <div className="absolute bottom-10 right-8 text-[120px] font-bold text-white/30 leading-none drop-shadow-lg" style={{ writingMode: 'vertical-rl' }}>柔道</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Shop Serve Save Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 2.8, duration: 0.8 }}
          className="w-full max-w-4xl mx-auto flex flex-col items-center group relative z-20 mt-4"
        >
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8 md:gap-0">
            
            <div className="relative flex items-center justify-center w-32 hover:scale-105 transition-transform cursor-pointer">
              <ShoppingBag className="absolute w-20 h-20 text-white/5 -z-10" />
              <span className="text-4xl md:text-[45px] font-bold text-white uppercase tracking-[0.25em]">Shop</span>
            </div>

            <div className="flex-1 flex w-full md:w-auto items-center px-4 md:px-8">
              <div className="w-2 h-2 rounded-full bg-[#FF7400] shadow-[0_0_8px_#FF7400]"></div>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#FF7400] to-transparent relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <button className="bg-gradient-to-r from-[#FF7400] to-[#FF9500] px-8 py-3 rounded-lg text-black text-[15px] font-bold shadow-[0_0_20px_rgba(255,116,0,0.6)] transition-all hover:scale-105 flex items-center gap-2 hover:shadow-[0_0_30px_rgba(255,116,0,0.8)]">
                    <ShoppingCart className="w-4 h-4" />
                    Shop Now
                  </button>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#FF7400] shadow-[0_0_8px_#FF7400]"></div>
            </div>

            <div className="relative flex items-center justify-center w-32 hover:scale-105 transition-transform cursor-pointer">
              <Heart className="absolute w-20 h-20 text-white/5 -z-10" />
              <span className="text-4xl md:text-[45px] font-bold text-white uppercase tracking-[0.25em]">Serve</span>
            </div>
          </div>

          <span className="text-4xl md:text-[45px] font-bold text-white uppercase tracking-[0.25em] mt-8 md:mt-12 hover:scale-105 transition-transform cursor-pointer">Save</span>
        </motion.div>

      </div>
    </motion.section>
  );
};

export default JudoJourneySection;

