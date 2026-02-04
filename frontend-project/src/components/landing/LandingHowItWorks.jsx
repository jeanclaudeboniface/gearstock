import React from 'react';

export default function LandingHowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Create Your Account',
      description: 'Set up your garage profile in minutes. No credit card required to start your 14-day trial.'
    },
    {
      number: '02',
      title: 'Invite Your Team',
      description: 'Add your mechanics and managers. Assign specific roles to control who sees sensitive stock data.'
    },
    {
      number: '03',
      title: 'Manage in Real Time',
      description: 'Log inventory, create work orders, and track every movement with zero technical training needed.'
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white overflow-hidden font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Set up in minutes, not days.</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">We designed GearStock to be as intuitive as a smartphone app, so your team can start using it between jobs.</p>
        </div>
        
        <div className="relative">
          {/* Connector Line */}
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-slate-100 -z-10" />
          
          <div className="grid lg:grid-cols-3 gap-12">
            {steps.map((s, i) => (
              <div key={i} className="relative group">
                <div className="bg-white">
                  <span className="text-5xl font-black text-slate-100 group-hover:text-blue-50 transition-colors block mb-4">
                    {s.number}
                  </span>
                  <h4 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{s.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
