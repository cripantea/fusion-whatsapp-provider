import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureCards } from "@/components/landing/feature-cards";
import { PricingTable } from "@/components/landing/pricing-table";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <FeatureCards />
        <PricingTable />
      </main>
      <LandingFooter />
    </div>
  );
}
