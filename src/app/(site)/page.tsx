import HeroSection from "@/components/features/HeroSection";
import JudoJourneySection from "@/components/features/JudoJourneySection";
import EventsSection from "@/components/features/EventsSection";
import NewsMarquee from "@/components/features/NewsMarquee";
import PhilosophySection from "@/components/features/PhilosophySection";
import TalentedPlayers from "@/components/features/TalentedPlayers";
import TalentedCoaches from "@/components/features/TalentedCoaches";
import VisionMission from "@/components/features/VisionMission";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white">
      {/* Wrapper for Header and Hero with grid background */}
      <div className="relative z-0">
        <div 
          className="absolute inset-0 -z-10 opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #f26522 1px, transparent 1px),
              linear-gradient(to bottom, #f26522 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
        <HeroSection />
        <JudoJourneySection />
        <EventsSection />
      </div>
      
      <PhilosophySection />
      <VisionMission />
      <TalentedCoaches />
      <TalentedPlayers />
      
      
      {/* Other sections can be added here */}
    </main>
  );
}
