import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingFinalCTA() {
  return (
    <section className="py-24 bg-blue-600 relative overflow-hidden font-inter">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-blue-500 rounded-full opacity-50 blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-blue-700 rounded-full opacity-50 blur-3xl" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 text-white">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-8 tracking-tight">
          Ready to take full control of your garage?
        </h2>
        <p className="text-blue-100 text-xl mb-12 max-w-2xl mx-auto">
          Join the garages that have ditched the paper notebooks for a more professional, accountable, and organized operation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link to="/login" className="w-full sm:w-auto bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-blue-50 transition-all shadow-xl transform hover:scale-105">
            Create Your Garage Account
          </Link>
          <a href="#" className="w-full sm:w-auto bg-blue-700 text-white border border-blue-500 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-blue-800 transition-all">
            Talk to Sales
          </a>
        </div>
        <p className="mt-8 text-blue-200 text-sm font-medium">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}
