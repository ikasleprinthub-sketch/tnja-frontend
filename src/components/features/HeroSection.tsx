import Image from "next/image";
import Button from "../common/Button";

const HeroSection = () => {
  return (
    <section className="relative z-10 pt-10 pb-20 px-4 md:px-8">
      {/* Background Grid Pattern - Localized to the hero section if preferred, 
          or kept in the main layout/page for full coverage */}
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

      <div className="max-w-[1400px] mx-auto">
        
        {/* Hero Header: Logos and Title */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12">
          <div className="flex items-center gap-4">
            <Image 
              src="/navbar/Logo.png" 
              alt="TNJA Logo Left" 
              width={80} 
              height={80} 
              sizes="80px"
              className="w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow-sm"
            />
            <h1 className="md:hidden text-lg font-black text-[#f26522] tracking-tighter text-center leading-none">
              TAMIL NADU JUDO <br/> ASSOCIATION
            </h1>
          </div>

          <h1 className="hidden md:block text-2xl lg:text-2xl font-black text-[#FF7400] tracking-tight text-center uppercase">
            TAMIL NADU JUDO ASSOCIATION 329/2017
          </h1>

          <Image 
            src="/navbar/Logo.png" 
            alt="TNJA Logo Right" 
            width={80} 
            height={80} 
            sizes="80px"
            className="hidden md:block w-20 h-20 object-contain drop-shadow-sm"
          />
        </div>

        {/* Hero Action Image */}
        <div className="relative group">
          {/* Outer Glow Effect */}
          {/* <div className="absolute -inset-1 bg-gradient-to-r from-[#00a3ff] to-[#0066ff] rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div> */}
          
          <div className="relative w-full aspect-[4/3] md:aspect-[16/7] min-h-[400px] md:min-h-[550px] rounded-[2.2rem] overflow-hidden shadow-2xl">
            <Image 
              src="/homepage/hero/Hero.png" 
              alt="Judo Action" 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1400px"
              className="object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-700"
              priority
            />
            
            {/* Subtle lighting overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Shop Serve Save Section */}
        <div className="mt-16 w-full max-w-full mx-auto px-4">
          <div className="relative flex items-center justify-between border-b-[1px] border-black pb-5">
            <span className="text-2xl md:text-3xl font-bold text-black uppercase tracking-widest">Shop</span>
            
            {/* Centered Button on the line */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
              <Button variant="primary" className="px-6 md:px-8 py-2 h-auto rounded-md text-[11px] md:text-[13px] tracking-widest uppercase">
                Shop Now
              </Button>
            </div>

            <span className="text-2xl md:text-3xl font-bold text-black uppercase tracking-widest">Serve</span>
          </div>
          <div className="text-center mt-8">
            <h2 className="text-2xl md:text-3xl font-bold text-black uppercase tracking-widest">Save</h2>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
