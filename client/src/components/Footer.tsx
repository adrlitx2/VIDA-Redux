import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background-dark py-8 md:py-12 px-4 md:px-8 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-bold text-white font-display">VIDA<sup>3</sup></span>
            <p className="mt-4 text-gray-400 text-sm md:text-base">
              The ultimate avatar streaming platform for creators, gamers, and NFT communities.
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-white hover:bg-primary transition">
                <i className="ri-twitter-fill"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-white hover:bg-primary transition">
                <i className="ri-instagram-fill"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-white hover:bg-primary transition">
                <i className="ri-discord-fill"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-white hover:bg-primary transition">
                <i className="ri-youtube-fill"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="/"><a className="text-gray-400 hover:text-primary transition">Features</a></Link></li>
              <li><Link href="/pricing"><a className="text-gray-400 hover:text-primary transition">Pricing</a></Link></li>
              <li><Link href="/avatars"><a className="text-gray-400 hover:text-primary transition">Avatars</a></Link></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Marketplace</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Tutorials</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Community</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Help Center</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Company</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-primary transition">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-primary transition">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-surface flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-xs md:text-sm">
            &copy; {new Date().getFullYear()} VIDA³. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex flex-wrap justify-center md:justify-end items-center gap-4 md:gap-6">
            <a href="#" className="text-gray-400 text-xs md:text-sm hover:text-primary transition">Privacy Policy</a>
            <a href="#" className="text-gray-400 text-xs md:text-sm hover:text-primary transition">Terms of Service</a>
            <a href="#" className="text-gray-400 text-xs md:text-sm hover:text-primary transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
