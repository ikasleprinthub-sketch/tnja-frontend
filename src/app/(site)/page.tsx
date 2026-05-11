import HeroSection from "@/components/features/HeroSection";
import WhatIsJudo from "@/components/features/WhatIsJudo";
import NewsMarquee from "@/components/features/NewsMarquee";
import PhilosophySection from "@/components/features/PhilosophySection";
import TalentedPlayers from "@/components/features/TalentedPlayers";
import TalentedCoaches from "@/components/features/TalentedCoaches";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white">
      <HeroSection />
      <WhatIsJudo />
      <NewsMarquee />
      <PhilosophySection />
      <TalentedCoaches />
      <TalentedPlayers />
      
      {/* Other sections can be added here */}
    </main>
  );
}
