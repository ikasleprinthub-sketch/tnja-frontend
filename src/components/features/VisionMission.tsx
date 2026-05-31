"use client";

import React from "react";
import Image from "next/image";

const presidentMessage = `I am honoured to be associated with the Tamil Nadu Judo Association 2/5/2017, an organization that reflects the true spirit of disciplines, resilience, and national pride. Sport has the power to transform lives, and for India to emerge as a global sporting nation, it is essential to build a strong foundation at the grassroots level through collective effort, professional expertise, and a scientific approach to training.

Judo, in particular, holds immense potential for India. With the right ecosystem—structured coaching, modern infrastructure, and long-term athlete development—we can nurture world-class athletes capable of excelling on international platforms. Alongside physical training, equal importance must be given to discipline, mental strength, and character building.

The Tamil Nadu Judo Association's initiative, "Judo for All," is a significant step in this direction. By bringing Judo to schools and grassroots communities, the Association is not only identifying and nurturing young talent but also shaping confident, disciplined, and responsible individuals for the future.

Our vision is to build a strong and inclusive sporting culture that nurtures talent from grassroots to global levels, while our mission is to promote Judo across all sections of society by blending traditional values with modern sports science. Through dedicated efforts, strategic planning, and collective commitment, we aim to position Tamil Nadu as a leading force in Judo and contribute meaningfully to India's sporting excellence.`;

const ceoMessage = `At the heart of the Tamil Nadu Judo Association 2/5/2017 lies an unwavering mission—to ignite the flame of Judo in every corner of Tamil Nadu. Our goal is not merely to promote Judo as a martial art or a sport, but as a way of life—a transformative discipline that empowers individuals to stand strong both on the mat and in society. Beyond the dojo, we aim to cultivate warriors of character who are prepared to rise against immorality, resist anti-social forces, and uphold righteousness with an unwavering spirit.

In proud collaboration with the Veer Vishwa Kalma Academy, our vision expands with renewed vigor—to deliver world-class, inclusive Judo education to every child, irrespective of background. Rooted in equality, enriched by technology, and guided by the principles of transparency and accountability, we envision a future where every learner receives not just training, but a transformative experience.

Our enhanced vision is deeply cultural and profoundly patriotic. We aspire to ensure that every school-going child in Tamil Nadu is not only trained in the art of Judo but is also imbued with the rich traditions, heritage, and nationalism of our land. Through the timeless values of Judo—self-respect, respect for the deserving, courage, humility, honesty, modesty, and integrity—we aim to shape responsible citizens, elevate the soul of our state, and fortify the spirit of our great nation.

Let us build a generation that not only fights with skill but lives with purpose—a generation that makes Tamil Nadu proud and India greater.`;

export default function VisionMission() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundImage: "url('/missionvision/paper.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >

      {/* ══════════════════════════════════
          VISION HALF
          Layout: [VISION label] [photo+card on left half] [empty right half]
      ══════════════════════════════════ */}
      <div className="flex min-h-0">

        {/* VISION vertical label — far left */}
        <div className="w-10 shrink-0 flex items-center justify-center">
          <span
            className="text-black font-black uppercase select-none"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: "clamp(0.9rem, 1.8vw, 1.5rem)",
              letterSpacing: "0.45em",
            }}
          >
            VISION
          </span>
        </div>

        {/* Content area split 50/50 */}
        <div className="flex-1 flex py-10 px-4">

          {/* LEFT half — photo stacked above card */}
          <div className="w-1/2 flex flex-col gap-0 pr-6">

            {/* Photo */}
            <div
              className="relative overflow-hidden w-full"
              style={{ width: 400, height: 360 }}
            >
              <Image
                src="/homepage/philosophy/kano.png"
                alt="Parth Jindal"
                fill
                className="object-cover object-top"
                style={{ filter: "sepia(35%) contrast(1.05)" }}
              />
            </div>

            {/* Name / title — below photo */}
            <div className="mt-2 mb-4">
              <p className="text-[#d4890a] font-extrabold text-base md:text-lg leading-tight">
                Parth Jindal
              </p>
              <p className="text-gray-600 text-[10px] uppercase tracking-[0.22em]">
                President
              </p>
            </div>

            {/* Message card — below name */}
            <div className="w-full">
              <div className="bg-[#d4890a] px-4 py-2">
                <h2 className="text-white text-xs md:text-sm font-bold tracking-widest uppercase">
                  President&apos;s Message
                </h2>
              </div>
              <div className="bg-white/88 px-4 py-4 shadow">
                <p className="text-gray-800 text-[10px] md:text-[11px] leading-relaxed whitespace-pre-line">
                  {presidentMessage}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT half — empty */}
          <div className="w-1/2" />
        </div>

        {/* spacer right */}
        <div className="w-10 shrink-0" />
      </div>

      {/* ══════════════════════════════════
          & SYMBOL — centered between halves
      ══════════════════════════════════ */}
      <div className="flex items-center justify-center py-16">
        <Image
          src="/missionvision/symbol.svg"
          alt="and"
          width={240}
          height={254}
        />
      </div>

      {/* ══════════════════════════════════
          MISSION HALF
          Layout: [empty left half] [photo+card on right half] [MISSION label]
      ══════════════════════════════════ */}
      <div className="flex min-h-0">

        {/* spacer left */}
        <div className="w-10 shrink-0" />

        {/* Content area split 50/50 */}
        <div className="flex-1 flex py-10 px-4">

          {/* LEFT half — empty */}
          <div className="w-1/2" />

          {/* RIGHT half — same structure as top card */}
          <div className="w-1/2 flex flex-col gap-0 pl-6">

            {/* Photo */}
            <div
              className="relative overflow-hidden w-full self-end"
              style={{ width: 400, height: 360 }}
            >
              <Image
                src="/homepage/philosophy/kano.png"
                alt="R. Vijaya Mohana Murali"
                fill
                className="object-cover object-top"
                style={{ filter: "sepia(35%) contrast(1.05)" }}
              />
            </div>

            {/* Name / title — below photo */}
            <div className="mt-2 mb-4 text-right">
              <p className="text-[#d4890a] font-extrabold text-base md:text-lg leading-tight">
                R. Vijaya Mohana Murali
              </p>
              <p className="text-gray-600 text-[10px] uppercase tracking-[0.22em]">
                CEO
              </p>
            </div>

            {/* Message card — below name */}
            <div className="w-full">
              <div className="bg-[#d4890a] px-4 py-2">
                <h2 className="text-white text-xs md:text-sm font-bold tracking-widest uppercase">
                  CEO&apos;s Message
                </h2>
              </div>
              <div className="bg-white/88 px-4 py-4 shadow">
                <p className="text-gray-800 text-[10px] md:text-[11px] leading-relaxed whitespace-pre-line">
                  {ceoMessage}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MISSION vertical label — far right */}
        <div className="w-10 shrink-0 flex items-center justify-center">
          <span
            className="text-black font-black uppercase select-none"
            style={{
              writingMode: "vertical-rl",
              fontSize: "clamp(0.9rem, 1.8vw, 1.5rem)",
              letterSpacing: "0.45em",
            }}
          >
            MISSION
          </span>
        </div>
      </div>

    </section>
  );
}
