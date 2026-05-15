import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: "🔗",
    title: "Blockchain Protected",
    description: "Decentralized ledger ensures tamper-proof evidence storage with cryptographic guarantees",
    details: "All evidence is stored on a distributed blockchain network, making it impossible for any single entity to alter or delete records without detection."
  },
  {
    icon: "🛡️",
    title: "Immutable Evidence",
    description: "Once recorded, evidence cannot be altered or deleted",
    details: "Evidence records are permanently etched into the blockchain with timestamps and digital signatures, ensuring complete immutability."
  },
  {
    icon: "🔐",
    title: "SHA-256 Verification",
    description: "Cryptographic hashing ensures data integrity",
    details: "Every piece of evidence is hashed using SHA-256 algorithm, providing a unique fingerprint that can be verified at any time."
  },
  {
    icon: "📁",
    title: "IPFS Storage",
    description: "Distributed file system for secure evidence storage",
    details: "Large evidence files are stored on the InterPlanetary File System (IPFS), providing decentralized and redundant storage."
  },
  {
    icon: "✅",
    title: "CID Verification",
    description: "Content Identifier ensures file authenticity",
    details: "Each file receives a unique Content Identifier (CID) that can be used to verify its authenticity and integrity."
  },
  {
    icon: "📋",
    title: "Chain of Custody",
    description: "Complete audit trail of evidence handling",
    details: "Track every movement and access to evidence with a comprehensive, timestamped audit trail."
  },
  {
    icon: "🔍",
    title: "Decentralized Audit",
    description: "Multi-party verification for transparency",
    details: "Audit trails are verified by multiple independent parties, ensuring transparency and preventing manipulation."
  },
  {
    icon: "⚡",
    title: "Smart Contract Validation",
    description: "Automated validation through blockchain contracts",
    details: "Smart contracts automatically validate evidence and case progression according to predefined rules."
  },
  {
    icon: "👤",
    title: "Role-Based Security",
    description: "Granular access control for all users",
    details: "Users are assigned specific roles with carefully defined permissions to ensure proper access control."
  },
  {
    icon: "🔬",
    title: "Digital Forensics",
    description: "Advanced tools for evidence analysis",
    details: "Comprehensive forensic analysis tools for examining digital evidence and extracting critical information."
  },
  {
    icon: "⚖️",
    title: "Appeal Workflow",
    description: "Structured process for case appeals",
    details: "Standardized appeal process with proper documentation and blockchain verification at each step."
  },
  {
    icon: "👁️",
    title: "Witness Verification",
    description: "Secure witness testimony management",
    details: "Witness statements are recorded with digital signatures and stored securely on the blockchain."
  },
  {
    icon: "🤖",
    title: "AI Crime Prediction",
    description: "ML algorithms for crime pattern analysis",
    details: "Advanced machine learning models analyze historical data to predict crime patterns and hotspots."
  }
];

export default function Features() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#0a0f1a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-500/60 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300">
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent animate-pulse">
                    CMS
                  </span>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight hidden sm:block">
                Criminal Justice Management System
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/">
                <a className="px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  Home
                </a>
              </Link>
              <a className="px-4 py-2 text-cyan-400 bg-cyan-500/10 rounded-lg transition-all duration-300 text-sm font-medium border border-cyan-500/30">
                Features
              </a>
              <Link to="/#about">
                <a className="px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  About
                </a>
              </Link>
              <Link to="/contact">
                <a className="px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  Contact
                </a>
              </Link>
              <div className="w-px h-6 bg-slate-700 mx-2"></div>
              <Link to="/login">
                <Button variant="ghost" className="text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent transition-all duration-300">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300">
                  Register
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800/50 py-4 space-y-2 animate-fade-in">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                <a className="block px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  Home
                </a>
              </Link>
              <a className="block px-4 py-2 text-cyan-400 bg-cyan-500/10 rounded-lg transition-all duration-300 text-sm font-medium border border-cyan-500/30">
                Features
              </a>
              <Link to="/#about" onClick={() => setIsMobileMenuOpen(false)}>
                <a className="block px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  About
                </a>
              </Link>
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                <a className="block px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  Contact
                </a>
              </Link>
              <div className="border-t border-slate-800/50 my-2"></div>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent transition-all duration-300">
                  Login
                </Button>
              </Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 mt-2">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Features Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Platform Features
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto">
            Comprehensive suite of tools designed to transform criminal justice through blockchain technology and artificial intelligence
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureDetailCard key={index} {...feature} />
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <h3 className="text-3xl font-bold text-white mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
                Join thousands of law enforcement agencies leveraging blockchain and AI for secure, efficient case management.
              </p>
              <div className="flex justify-center space-x-4">
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 px-8">
                    Create Account
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all duration-300 px-8">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-[#0a0f1a]/80 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-500 text-sm">
            © 2026 Crime Management System. AI-Powered Digital Forensics & Blockchain Evidence Integrity.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureDetailCard({ icon, title, description, details }) {
  return (
    <Card className="group bg-slate-900/30 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300">
            <span className="text-4xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
              {title}
            </h3>
            <p className="text-slate-400 text-sm mb-3 leading-relaxed">
              {description}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              {details}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
