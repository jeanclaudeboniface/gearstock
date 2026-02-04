import React from "react";
import { Link } from "react-router-dom";

export default function Logo({
  size = "md",
  variant = "default",
  showText = true,
  linkTo = null,
}) {
  const sizes = {
    sm: { icon: "w-8 h-8", iconInner: "w-5 h-5", text: "text-lg" },
    md: { icon: "w-10 h-10", iconInner: "w-6 h-6", text: "text-xl" },
    lg: { icon: "w-12 h-12", iconInner: "w-8 h-8", text: "text-2xl" },
  };

  const variants = {
    default: {
      bg: "bg-blue-600",
      iconColor: "text-white",
      textColor: "text-slate-900",
    },
    light: {
      bg: "bg-blue-600",
      iconColor: "text-white",
      textColor: "text-white",
    },
    dark: {
      bg: "bg-blue-600",
      iconColor: "text-white",
      textColor: "text-white",
    },
  };

  const currentSize = sizes[size] || sizes.md;
  const currentVariant = variants[variant] || variants.default;

  const LogoContent = () => (
    <div className="flex items-center space-x-2">
      <div
        className={`${currentSize.icon} ${currentVariant.bg} rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20`}
      >
        <svg
          className={`${currentSize.iconInner} ${currentVariant.iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={`${currentSize.text} font-black tracking-tight ${currentVariant.textColor}`}
          >
            GEAR<span className="text-blue-500">STOCK</span>
          </span>
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="hover:opacity-90 transition-opacity">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
