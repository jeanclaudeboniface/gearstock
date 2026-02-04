import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../App";
import GarageSwitcher from "./GarageSwitcher";
import Logo from "./Logo";

export default function Sidebar({ logout, closeSidebar }) {
  const { userRole } = useContext(AuthContext);

  const navLinks = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      name: "Inventory",
      path: "/spareparts",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    },
    {
      name: "Stock Moves",
      path: "/inventory/move",
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
    },
    {
      name: "Work Orders",
      path: "/workorders",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    },
    {
      name: "Reports",
      path: "/reports",
      icon: "M9 17v-2m3 2v-4m3 2v-6m-9 9h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z",
    },
  ];

  if (userRole === "OWNER" || userRole === "MANAGER") {
    navLinks.push({
      name: "Team Settings",
      path: "/team",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    });
  }

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col shadow-2xl">
      <div className="px-8 py-10 flex justify-between items-center">
        <div>
          <Logo size="md" variant="light" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
            Garage Operating System
          </p>
        </div>
        <button
          onClick={closeSidebar}
          className="lg:hidden text-slate-400 hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="px-6 mb-6">
        <GarageSwitcher />
      </div>

      <nav className="flex-grow px-6 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <svg
                className={`w-5 h-5 mr-3 transition-colors ${link.path === "/dashboard" ? "group-hover:text-blue-400" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={link.icon}
                />
              </svg>
              <span className="text-sm font-bold tracking-tight">
                {link.name}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-6 border-t border-slate-800">
        <button
          onClick={() => {
            logout();
            closeSidebar();
          }}
          className="w-full flex items-center justify-center space-x-2 px-4 py-4 rounded-2xl bg-slate-800 hover:bg-red-600 transition-all duration-300 group"
        >
          <svg
            className="w-5 h-5 text-slate-400 group-hover:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="text-sm font-bold text-slate-300 group-hover:text-white">
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}
