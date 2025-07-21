import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";
import PricingTable from "@/components/PricingTable";
import AddOns from "@/components/AddOns";

export default function Pricing() {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileNavbar />

      <section className="py-20 px-4 md:px-8 bg-background-dark">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h2 className="text-3xl md:text-4xl font-bold">Choose Your <span className="text-primary">Creator Path</span></h2>
            <p className="mt-4 text-xl text-gray-300 max-w-2xl mx-auto">
              Flexible plans designed for creators at every stage
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            <PricingTable />
            <AddOns />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
