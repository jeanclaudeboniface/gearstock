import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../Logo";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-sm py-3" : "bg-transparent py-5"}`}
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

        <button className="md:hidden text-slate-900">
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
        </button>
      </div>
    </nav>
  );
}
