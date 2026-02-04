import React from "react";
import Logo from "./Logo";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100">
        <div>
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-center text-sm text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
