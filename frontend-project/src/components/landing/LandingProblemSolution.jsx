import React from 'react';

export default function LandingProblemSolution() {
  return (
    <section className="py-24 bg-white font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">
              Why the old way isn’t working anymore.
            </h2>
            <div className="space-y-8">
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Missing Inventory</h4>
                  <p className="text-slate-600 mt-1">Parts are used but never recorded, leading to stock-outs and delayed customer jobs.</p>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Zero Accountability</h4>
                  <p className="text-slate-600 mt-1">When stock levels don't match reality, you have no way to trace who made changes or why.</p>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Disorganized Job Tracking</h4>
                  <p className="text-slate-600 mt-1">Paper work orders get lost, grease-stained, or misread, causing billing errors and unhappy customers.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-10 lg:p-12 text-white shadow-2xl">
            <div className="inline-flex items-center space-x-2 text-blue-400 font-semibold mb-6">
              <span className="text-sm uppercase tracking-wider">The GearStock Solution</span>
            </div>
            <h3 className="text-2xl font-bold mb-8">Full operational control in one clean dashboard.</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <svg className="w-6 h-6 text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="block font-semibold">Real-time Stock Levels</span>
                  <p className="text-slate-400 mt-1">Instantly see what's on the shelf vs what's committed to current jobs.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <svg className="w-6 h-6 text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="block font-semibold">Digital Work Orders</span>
                  <p className="text-slate-400 mt-1">Assign mechanics, attach parts, and track labor in a single, unlosable record.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <svg className="w-6 h-6 text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="block font-semibold">Permission Controls</span>
                  <p className="text-slate-400 mt-1">Ensure mechanics can update jobs while only managers can approve inventory resets.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
