import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function TypingAnimation() {
  const texts = [
    "Securing digital evidence with SHA-256 hashing...",
    "Tracking immutable chain of custody...",
    "Verifying CID and blockchain integrity...",
    "Transparent justice through decentralized verification..."
  ];
  const [textIndex, setTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    const typingSpeed = isDeleting ? 30 : 50;
    const pauseAfterTyping = 2000;
    const pauseAfterDeleting = 500;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseAfterTyping);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts]);

  return (
    <div className="text-cyan-400 text-lg font-mono h-8 flex items-center justify-center">
      <span>{displayText}</span>
      <span className="animate-pulse ml-1">|</span>
    </div>
  );
}

export default function Landing() {
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
              <Link to="/features">
                <a className="px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  Features
                </a>
              </Link>
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
                <Button 
                  variant="ghost" 
                  className="text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent transition-all duration-300"
                >
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300"
                >
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
              <Link to="/features" onClick={() => setIsMobileMenuOpen(false)}>
                <a className="block px-4 py-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-all duration-300 text-sm font-medium">
                  Features
                </a>
              </Link>
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

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-fade-in animate-delay-100">
            <span className="text-cyan-400 text-sm font-medium tracking-wide">
              AI-Powered Digital Forensics Platform
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in animate-delay-200">
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Tamper-Proof Justice
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-cyan-400/20 blur-xl animate-pulse"></span>
            </span>
            <span className="block mt-2">Infrastructure</span>
          </h2>
          <div className="mb-8 animate-fade-in animate-delay-300">
            <TypingAnimation />
          </div>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-in animate-delay-400">
            A comprehensive platform leveraging blockchain technology and artificial intelligence 
            for modern law enforcement, ensuring evidence integrity and decentralized audit trails.
          </p>
          <div className="flex justify-center space-x-4 animate-fade-in animate-delay-500">
            <Link to="/register">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 px-8"
              >
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                size="lg"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all duration-300 px-8"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <FeatureCard
            title="Blockchain Protected"
            description="Decentralized ledger ensures tamper-proof evidence storage"
            icon="🔗"
          />
          <FeatureCard
            title="Immutable Evidence"
            description="Once recorded, evidence cannot be altered or deleted"
            icon="�️"
          />
          <FeatureCard
            title="SHA-256 Verification"
            description="Cryptographic hashing ensures data integrity"
            icon="🔐"
          />
          <FeatureCard
            title="IPFS Storage"
            description="Distributed file system for secure evidence storage"
            icon="📁"
          />
          <FeatureCard
            title="CID Verification"
            description="Content Identifier ensures file authenticity"
            icon="✅"
          />
          <FeatureCard
            title="Chain of Custody"
            description="Complete audit trail of evidence handling"
            icon="📋"
          />
          <FeatureCard
            title="Decentralized Audit"
            description="Multi-party verification for transparency"
            icon="�"
          />
          <FeatureCard
            title="Smart Contract Validation"
            description="Automated validation through blockchain contracts"
            icon="⚡"
          />
          <FeatureCard
            title="Role-Based Security"
            description="Granular access control for all users"
            icon="👤"
          />
          <FeatureCard
            title="Digital Forensics"
            description="Advanced tools for evidence analysis"
            icon="�"
          />
          <FeatureCard
            title="Appeal Workflow"
            description="Structured process for case appeals"
            icon="⚖️"
          />
          <FeatureCard
            title="Witness Verification"
            description="Secure witness testimony management"
            icon="👁️"
          />
          <FeatureCard
            title="AI Crime Prediction"
            description="ML algorithms for crime pattern analysis"
            icon="🤖"
          />
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          <StatCard label="Evidence Secured" value="99.9%" />
          <StatCard label="Audit Trails" value="Immutable" />
          <StatCard label="Processing Time" value="-70%" />
          <StatCard label="Accuracy Rate" value="94.5%" />
        </div>

        {/* About Section */}
        <div id="about" className="mb-20">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-600/5 blur-3xl"></div>
            <Card className="relative bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
              <CardContent className="p-12">
                <div className="text-center mb-12">
                  <h3 className="text-3xl font-bold text-white mb-4">
                    About the System
                  </h3>
                  <p className="text-slate-400 max-w-3xl mx-auto">
                    A revolutionary platform designed to transform criminal justice through blockchain technology and artificial intelligence
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">🛡️</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Anti-Corruption Objective</h4>
                        <p className="text-slate-400 text-sm">Eliminate corruption through immutable blockchain records and transparent workflows</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">👁️</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Transparent Investigation</h4>
                        <p className="text-slate-400 text-sm">Complete visibility into case progression with real-time audit trails</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">🔒</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Secure Evidence Handling</h4>
                        <p className="text-slate-400 text-sm">Military-grade encryption and decentralized storage for evidence protection</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">🔗</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Decentralized Verification</h4>
                        <p className="text-slate-400 text-sm">Multi-party consensus ensures no single point of failure or manipulation</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">⚖️</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Judicial Integrity</h4>
                        <p className="text-slate-400 text-sm">Maintain judicial independence with tamper-proof case records</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">✨</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Blockchain-Backed Trust</h4>
                        <p className="text-slate-400 text-sm">Cryptographic guarantees ensure data authenticity and integrity</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">📝</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">FIR Lifecycle</h4>
                        <p className="text-slate-400 text-sm">End-to-end tracking from filing to resolution with digital signatures</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">🔐</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Evidence Verification</h4>
                        <p className="text-slate-400 text-sm">SHA-256 hashing and CID verification ensure evidence authenticity</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400">🔬</span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">Forensic Approvals</h4>
                        <p className="text-slate-400 text-sm">Expert validation with role-based access and approval workflows</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How System Works Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              How the System Works
            </h3>
            <p className="text-slate-400 max-w-3xl mx-auto">
              A streamlined workflow ensuring transparency, security, and integrity at every step
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-blue-500/50 to-cyan-500/50 hidden md:block"></div>
            <div className="space-y-8">
              <WorkflowStep
                step="1"
                title="Citizen FIR"
                description="Citizens file First Information Reports online with digital signatures"
                icon="📝"
                position="left"
              />
              <WorkflowStep
                step="2"
                title="Investigation"
                description="Police officers investigate and gather preliminary evidence"
                icon="🔍"
                position="right"
              />
              <WorkflowStep
                step="3"
                title="Evidence Upload"
                description="Digital evidence is uploaded to secure IPFS storage"
                icon="📁"
                position="left"
              />
              <WorkflowStep
                step="4"
                title="Hash + CID Generation"
                description="SHA-256 hash and Content Identifier generated for verification"
                icon="🔐"
                position="right"
              />
              <WorkflowStep
                step="5"
                title="Forensic Verification"
                description="Forensic experts analyze and verify evidence integrity"
                icon="🔬"
                position="left"
              />
              <WorkflowStep
                step="6"
                title="Court Review"
                description="Case reviewed by court officers for judicial processing"
                icon="⚖️"
                position="right"
              />
              <WorkflowStep
                step="7"
                title="Judge Decision"
                description="Judge makes final ruling based on verified evidence"
                icon="👨‍⚖️"
                position="left"
              />
              <WorkflowStep
                step="8"
                title="Appeal Workflow"
                description="Structured appeal process with additional verification"
                icon="📋"
                position="right"
              />
              <WorkflowStep
                step="9"
                title="Immutable Blockchain Audit"
                description="Complete audit trail permanently recorded on blockchain"
                icon="🔗"
                position="left"
                isLast
              />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 blur-3xl"></div>
          <Card className="relative bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <h3 className="text-3xl font-bold text-white mb-4">
                Ready to Transform Criminal Justice?
              </h3>
              <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
                Join thousands of law enforcement agencies leveraging blockchain and AI for secure, efficient case management.
              </p>
              <div className="flex justify-center space-x-4">
                <Link to="/register">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 px-8"
                  >
                    Create Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all duration-300 px-8"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-[#0a0f1a]/80 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Blockchain</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Solutions</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Law Enforcement</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Judiciary</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Forensics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500 text-sm">
              © 2026 Crime Management System. AI-Powered Digital Forensics & Blockchain Evidence Integrity.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <Card className="group bg-slate-900/30 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300">
          <span className="text-3xl">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }) {
  return (
    <Card className="bg-slate-900/50 border border-slate-800">
      <CardContent className="p-6 text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          {value}
        </div>
        <div className="text-slate-400 text-sm">{label}</div>
      </CardContent>
    </Card>
  );
}

function WorkflowStep({ step, title, description, icon, position, isLast }) {
  return (
    <div className={`relative flex items-center ${position === "left" ? "md:flex-row" : "md:flex-row-reverse"}`}>
      <div className={`flex-1 ${position === "left" ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
        <Card className="group bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-500/60 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300">
                <span className="text-2xl">{icon}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                  {title}
                </h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <span className="text-cyan-400 text-sm font-bold">{step}</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:flex w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-4 border-[#0a0f1a] items-center justify-center z-10 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
        <span className="text-white text-lg">↓</span>
      </div>
      <div className="flex-1"></div>
    </div>
  );
}
