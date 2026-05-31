import HeroSection from "@/components/features/HeroSection";
import WhatIsJudo from "@/components/features/WhatIsJudo";
import NewsMarquee from "@/components/features/NewsMarquee";
import PhilosophySection from "@/components/features/PhilosophySection";
import TalentedPlayers from "@/components/features/TalentedPlayers";
import TalentedCoaches from "@/components/features/TalentedCoaches";
import VisionMission from "@/components/features/VisionMission";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white">
      <HeroSection />
      <WhatIsJudo />
      <NewsMarquee />
      <PhilosophySection />
      <VisionMission />
      <TalentedCoaches />
      <TalentedPlayers />
      
      {/* Other sections can be added here */}
    </main>
  );
}
