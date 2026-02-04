import React from 'react';

export default function LandingFeatures() {
  const featureList = [
    {
      title: 'Inventory Control',
      description: 'Track parts from purchase to installation. Set low-stock alerts to never run out of critical consumables.',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
      title: 'Work Orders',
      description: 'Convert customer requests into actionable digital jobs. Attach inventory items directly to specific vehicles.',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    {
      title: 'Roles & Permissions',
      description: 'Control who can view, edit, or delete data. Tailor the interface to mechanics, front-desk staff, and owners.',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      title: 'Movement History',
      description: 'A complete audit trail for every item. Know exactly who checked out a part and which job it went to.',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Multi-Garage Support',
      description: 'Manage multiple locations from a single owner account. Share inventory insights and performance across branches.',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
    },
    {
      title: 'Cloud-Based Access',
      description: 'Access your garage data from anywhere—tablet, mobile, or desktop. Always secure, always backed up.',
      icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'
    }
  ];

  return (
    <section id="features" className="py-24 bg-slate-50 font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to run a profitable shop.</h2>
          <p className="text-slate-600">Built specifically for the workflow of modern garages, from small independent shops to multi-branch service centers.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors shadow-sm group">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
