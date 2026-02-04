import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none overflow-hidden">
         <div className="absolute -top-[20%] left-[10%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50" />
         <div className="absolute top-[10%] -right-[10%] w-[500px] h-[500px] bg-slate-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-6 animate-fade-in">
          <span>Now in early access</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
          Manage Garage Inventory, Jobs, and Stock in One Secure System
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop relying on notebooks and spreadsheets. Track every part, manage every work order, and maintain full accountability across your entire team.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link to="/login" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:scale-105 transform">
            Get Started for Free
          </Link>
          <a href="#features" className="w-full sm:w-auto bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 transition-all">
            See how it works
          </a>
        </div>

        <div className="mt-16 relative group">
          <div className="bg-slate-100 rounded-2xl p-2 shadow-2xl border border-slate-200 overflow-hidden max-w-5xl mx-auto transform transition-all duration-700 group-hover:scale-[1.01]">
            <img 
              src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=1200" 
              alt="GearStock Management Platform Interface" 
              className="rounded-xl w-full object-cover shadow-inner bg-slate-200"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-blue-600/5 rounded-full blur-xl -z-10" />
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-slate-900/5 rounded-full blur-xl -z-10" />
        </div>
      </div>
    </section>
  );
}
