import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../Logo";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when clicking anchor links
  const handleMobileNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileMenuOpen ? "bg-white shadow-sm py-3" : "bg-transparent py-5"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Logo size="sm" variant="default" linkTo="/" />

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">
            Features
          </a>
          <a href="#security" className="hover:text-blue-600 transition-colors">
            Security
          </a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">
            Pricing
          </a>
          <Link
            to="/login"
            className="hover:text-blue-600 transition-colors border-l pl-8 border-slate-200"
          >
            Log in
          </Link>
          <Link
            to="/login"
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-all"
          >
            Start free trial
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-slate-900 p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            <a
              href="#features"
              onClick={handleMobileNavClick}
              className="block px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Features
            </a>
            <a
              href="#security"
              onClick={handleMobileNavClick}
              className="block px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Security
            </a>
            <a
              href="#pricing"
              onClick={handleMobileNavClick}
              className="block px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Pricing
            </a>
            <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
              <Link
                to="/login"
                onClick={handleMobileNavClick}
                className="block px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-center"
              >
                Log in
              </Link>
              <Link
                to="/login"
                onClick={handleMobileNavClick}
                className="block bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 transition-all text-center font-semibold"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
