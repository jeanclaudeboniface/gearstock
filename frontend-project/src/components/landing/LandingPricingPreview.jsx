import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPricingPreview() {
  return (
    <section id="pricing" className="py-24 bg-white font-inter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">Simple, transparent pricing.</h2>
        <p className="text-slate-600 max-w-xl mx-auto mb-12">
          Choose a plan that scales with your business. Whether you have 2 mechanics or 20, we have a solution that fits your volume.
        </p>
        
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-left">
              <h4 className="text-2xl font-bold text-slate-900 mb-2">Start your 14-day free trial</h4>
              <p className="text-slate-600">Full access to all features. No credit card required. Upgrade when you're ready.</p>
            </div>
            <div className="flex-shrink-0">
               <Link to="/login" className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all inline-block shadow-lg">
                Get Started Now
               </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-blue-200 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-600 font-medium">
             <div className="flex items-center space-x-2">
               <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
               <span>Unlimited Work Orders</span>
             </div>
             <div className="flex items-center space-x-2">
               <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
               <span>Role-based Access</span>
             </div>
             <div className="flex items-center space-x-2 col-span-2 md:col-span-1">
               <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
               <span>Priority Support</span>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
