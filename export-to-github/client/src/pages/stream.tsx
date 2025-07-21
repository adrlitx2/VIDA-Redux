import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";
import StableStreamingStudio from "@/components/StableStreamingStudio";

export default function Stream() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MobileNavbar />
      <StableStreamingStudio />
      <Footer />
    </div>
  );
}