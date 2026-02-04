import React, { useContext } from 'react';
import { AuthContext } from '../App';
import LandingNavbar from './landing/LandingNavbar';
import LandingHero from './landing/LandingHero';
import LandingTrustBar from './landing/LandingTrustBar';
import LandingProblemSolution from './landing/LandingProblemSolution';
import LandingFeatures from './landing/LandingFeatures';
import LandingHowItWorks from './landing/LandingHowItWorks';
import LandingSecuritySection from './landing/LandingSecuritySection';
import LandingPricingPreview from './landing/LandingPricingPreview';
import LandingFinalCTA from './landing/LandingFinalCTA';
import LandingFooter from './landing/LandingFooter';

export default function Home() {
  const { token } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <LandingNavbar />
      <main className="flex-grow">
        <LandingHero />
        <LandingTrustBar />
        <LandingProblemSolution />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingSecuritySection />
        <LandingPricingPreview />
        <LandingFinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
