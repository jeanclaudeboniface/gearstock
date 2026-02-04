import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthLayout from './AuthLayout';

export default function GarageSelector() {
  const { memberships, setActiveTenantId } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSelect = (tenantId) => {
    setActiveTenantId(tenantId);
    navigate('/spareparts');
  };

  return (
    <AuthLayout 
      title="Choose a garage" 
      subtitle="Select the garage you want to manage today."
    >
      <div className="space-y-3">
        {memberships.length > 0 ? (
          memberships.map((m) => (
            <button
              key={m.tenantId}
              onClick={() => handleSelect(m.tenantId)}
              className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all group group-hover:shadow-md"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">{m.tenantName}</p>
                  <p className="text-xs text-slate-500 font-medium">@{m.tenantSlug}</p>
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  m.role === 'OWNER' ? 'bg-indigo-100 text-indigo-700' : 
                  m.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {m.role}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-6">You don't belong to any garages yet.</p>
            <button
              onClick={() => navigate('/create-garage')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              Create a Garage
            </button>
          </div>
        )}
      </div>
      
      {memberships.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button 
            onClick={() => navigate('/create-garage')}
            className="text-sm font-bold text-blue-600 hover:text-blue-500 flex items-center justify-center mx-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Register another garage
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
