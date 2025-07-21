import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";
import { GlassCard } from "@/components/ui/glass-card";
import { BadgeGlow } from "@/components/ui/badge-glow";
import { FeaturedStream } from "@/components/FeaturedStream";
import { HomePricingSection } from "@/components/HomePricingSection";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileNavbar />

      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-16 md:pb-24 px-4 md:px-8 max-w-7xl mx-auto relative">
        
        <div className="flex flex-col md:flex-row md:items-center gap-12 md:gap-16 relative z-10">
          <motion.div 
            className="md:w-1/2"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Bring Your <span className="text-primary">Digital Self</span> to Life
            </h1>
            <p className="mt-6 text-xl text-gray-300 max-w-lg">
              Stream with customizable 3D avatars on Twitter Spaces and beyond. VIDA³ is the ultimate platform for creators.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href={user ? "/stream" : "/register"}>
                <Button className="w-full sm:w-auto px-8 py-6 text-lg shadow-neon-purple">
                  Get Started Free
                </Button>
              </Link>
              <Button variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg">
                Watch Demo
                <i className="ri-play-circle-line ml-2"></i>
              </Button>
              {user && user.user?.app_metadata?.roles?.includes('superadmin') && (
                <Link href="/admin/dashboard">
                  <Button variant="secondary" className="w-full sm:w-auto px-8 py-6 text-lg mt-3 sm:mt-0">
                    Admin Dashboard
                    <i className="ri-dashboard-line ml-2"></i>
                  </Button>
                </Link>
              )}
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" className="w-10 h-10 rounded-full border-2 border-background" alt="User avatar" />
                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" className="w-10 h-10 rounded-full border-2 border-background" alt="User avatar" />
                <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" className="w-10 h-10 rounded-full border-2 border-background" alt="User avatar" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">
                  <span className="font-bold text-white">1,000+</span> creators already streaming
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="md:w-1/2 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative">
              <FeaturedStream />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-secondary/30 rounded-full blur-2xl"></div>
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/30 rounded-full blur-2xl"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">Transform Your <span className="text-primary">Digital Presence</span></h2>
          <p className="mt-4 text-xl text-gray-300 max-w-2xl mx-auto">
            Express yourself beyond webcams with our powerful avatar system
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <motion.div 
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
              <i className="ri-user-3-line text-primary text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">Personalized Avatars</h3>
            <p className="text-gray-300">
              Create and customize 3D avatars that match your style and personality.
            </p>
          </motion.div>

          {/* Feature Card 2 */}
          <motion.div 
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-6">
              <i className="ri-live-line text-secondary text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">Twitter Spaces Integration</h3>
            <p className="text-gray-300">
              Inject your avatar directly into Twitter Spaces with our camera emulator.
            </p>
          </motion.div>

          {/* Feature Card 3 */}
          <motion.div 
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center mb-6">
              <i className="ri-vidicon-fill text-accent text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold mb-3">High-Quality Streaming</h3>
            <p className="text-gray-300">
              Stream in HD with low latency and smooth performance on any device.
            </p>
          </motion.div>
        </div>

        <motion.div 
          className="mt-16 p-6 md:p-10 glass-card rounded-3xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="md:w-1/2">
              <img src="https://images.unsplash.com/photo-1583195764036-6dc248ac07d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" alt="2D to 3D avatar transformation" className="w-full h-auto rounded-2xl shadow-lg" />
            </div>
            <div className="md:w-1/2">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                From 2D to 3D in Seconds
              </h3>
              <p className="text-lg text-gray-300 mb-6">
                Upload your 2D image and watch as our advanced AI technology transforms it into a fully rigged 3D avatar ready for streaming.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <i className="ri-check-line text-primary"></i>
                  </div>
                  <span>Automatic face rigging with 52 control points</span>
                </li>
                <li className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <i className="ri-check-line text-primary"></i>
                  </div>
                  <span>Customizable expressions and animations</span>
                </li>
                <li className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <i className="ri-check-line text-primary"></i>
                  </div>
                  <span>Real-time facial tracking with your camera</span>
                </li>
              </ul>
              <Link href="/avatars">
                <Button className="mt-8 px-6 py-3 shadow-neon-purple">
                  Try Avatar Creator
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <HomePricingSection />
        </motion.div>
      </section>

      {/* Call To Action */}
      <section className="py-16 md:py-24 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1639762681057-408e52192e55?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')] bg-cover bg-center opacity-10"></div>
        
        <motion.div 
          className="max-w-4xl mx-auto relative z-10 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Digital Presence?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of creators already using VIDA³ to connect with their audience in new and exciting ways.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? "/stream" : "/register"}>
              <Button className="w-full sm:w-auto px-8 py-6 text-lg shadow-neon-purple">
                Start Free Trial
              </Button>
            </Link>
            <Button variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg">
              Book a Demo
            </Button>
          </div>
        </motion.div>
      </section>
      
      <Footer />
    </div>
  );
}
