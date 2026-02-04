import React from 'react';

export default function LandingSecuritySection() {
  return (
    <section id="security" className="py-24 bg-slate-900 text-white font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-8">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-6">Built to be a serious tool for your business.</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              We know your garage data is sensitive. That's why GearStock is built on industry-standard cloud infrastructure with multiple layers of protection.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="border border-slate-800 p-5 rounded-xl hover:bg-slate-800/50 transition-colors">
                <h5 className="font-bold mb-2">Isolated Data</h5>
                <p className="text-sm text-slate-400">Each garage's data is isolated and protected, ensuring your business records stay private.</p>
              </div>
              <div className="border border-slate-800 p-5 rounded-xl hover:bg-slate-800/50 transition-colors">
                <h5 className="font-bold mb-2">Full Audit Logs</h5>
                <p className="text-sm text-slate-400">Every single stock adjustment is logged with a timestamp and the user who made the change.</p>
              </div>
              <div className="border border-slate-800 p-5 rounded-xl hover:bg-slate-800/50 transition-colors">
                <h5 className="font-bold mb-2">Secure Backups</h5>
                <p className="text-sm text-slate-400">Automated hourly backups ensure you never lose a job record, even if your local hardware fails.</p>
              </div>
              <div className="border border-slate-800 p-5 rounded-xl hover:bg-slate-800/50 transition-colors">
                <h5 className="font-bold mb-2">Always Available</h5>
                <p className="text-sm text-slate-400">Access your platform 24/7 on any device. We handle all the updates and maintenance.</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-blue-600/10 rounded-full blur-3xl absolute -top-12 -right-12 w-full h-full -z-10" />
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-mono text-slate-300">SYSTEM STATUS: OPERATIONAL</span>
                </div>
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Recent Activity</span>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Stock Adjustment: Brake Pads</span>
                      <span className="text-blue-400">Logged by user #82</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">New Work Order: #5512</span>
                      <span className="text-blue-400">14:02 UTC</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Daily Backup</span>
                      <span className="text-green-400">Verified</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 italic">
                  * Visual representation of security monitoring. Your actual data remains private and isolated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
