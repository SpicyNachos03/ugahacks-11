import { Header } from "../../components/Header";
import { HeroSection } from "../../components/HeroSection";
import { FeaturesSection } from "../../components/FeaturesSection";
import { ImpactSection } from "../../components/ImpactSection";
import { Footer } from "../../components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ImpactSection />
      </main>
      <Footer />
    </div>
  );
}