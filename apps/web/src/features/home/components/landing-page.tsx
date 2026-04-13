import { BenefitsSection } from "@/features/home/components/benefits-section";
import { CommunitySection } from "@/features/home/components/community-section";
import { CtaSection } from "@/features/home/components/cta-section";
import { FeaturesSection } from "@/features/home/components/features-section";
import { Footer } from "@/features/home/components/footer";
import { Header } from "@/features/home/components/header";
import { Hero } from "@/features/home/components/hero";
import { HowItWorksSection } from "@/features/home/components/how-it-works-section";

export function LandingPage() {
  return (
    <main className="bg-[#edf3f8] text-asphalt-900">
      <Header />
      <Hero />
      <BenefitsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CommunitySection />
      <CtaSection />
      <Footer />
    </main>
  );
}
