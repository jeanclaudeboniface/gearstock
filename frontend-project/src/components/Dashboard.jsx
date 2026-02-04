import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { authAxios, activeTenantId, userRole } = useContext(AuthContext);
  const [stats, setStats] = useState({
    inventoryCount: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTenantId) fetchDashboardData();
  }, [activeTenantId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [partsRes, movementsRes, ordersRes] = await Promise.all([
        authAxios.get("/reports/stock-status"),
        authAxios.get("/inventory/movements"),
        authAxios.get("/workorders"),
      ]);

      const lowStock = partsRes.data.filter((p) => p.lowStock).length;
      const pendingWo = ordersRes.data.filter(
        (o) => o.status === "PENDING" || o.status === "IN_PROGRESS",
      ).length;

      setStats({
        inventoryCount: partsRes.data.length,
        lowStockCount: lowStock,
        pendingOrders: pendingWo,
        recentActivity: movementsRes.data.slice(0, 5),
      });
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse">Loading Dashboard...</div>
    );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Dashboard Overview
        </h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Real-time pulse of your garage performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Parts
          </p>
          <div className="flex justify-between items-end">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {stats.inventoryCount}
            </span>
            <Link
              to="/spareparts"
              className="text-sm font-bold text-blue-600 hover:text-blue-500 py-2 -mr-2 px-2"
            >
              View →
            </Link>
          </div>
        </div>

        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border shadow-sm ${stats.lowStockCount > 0 ? "bg-red-50 border-red-100" : "bg-white border-slate-100"}`}
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Low Stock Alerts
          </p>
          <div className="flex justify-between items-end">
            <span
              className={`text-3xl sm:text-4xl font-extrabold ${stats.lowStockCount > 0 ? "text-red-600" : "text-slate-900"}`}
            >
              {stats.lowStockCount}
            </span>
            {stats.lowStockCount > 0 && (
              <Link
                to="/reports"
                className="text-sm font-bold text-red-600 hover:text-red-500 underline decoration-2 py-2 -mr-2 px-2"
              >
                Restock →
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Open Jobs
          </p>
          <div className="flex justify-between items-end">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {stats.pendingOrders}
            </span>
            <Link
              to="/workorders"
              className="text-sm font-bold text-blue-600 hover:text-blue-500 py-2 -mr-2 px-2"
            >
              Manage →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center">
            <svg
              className="w-5 h-5 mr-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Recent Stock Activity
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {stats.recentActivity.map((m) => (
              <div
                key={m.id || m._id}
                className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0"
              >
                <div className="flex flex-col min-w-0 flex-1 mr-3">
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {m.sparePartId?.name}
                  </span>
                  <span className="text-xs text-slate-400 italic">
                    {m.reason.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center text-sm font-mono font-bold">
                  <span
                    className={
                      m.quantity > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </span>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <p className="text-center py-10 text-slate-400">
                No recent transactions.
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg sm:text-xl font-bold mb-2">Quick Actions</h3>
            <p className="text-slate-400 text-sm mb-4 sm:mb-6">
              Standard operations for garage staff.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Link
                to="/inventory/move"
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 p-4 rounded-xl sm:rounded-2xl transition-all group min-h-[72px]"
              >
                <p className="font-bold text-sm mb-1 group-hover:text-blue-400">
                  Restock Parts
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Record incoming stock
                </p>
              </Link>
              <Link
                to="/workorders"
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 p-4 rounded-xl sm:rounded-2xl transition-all group min-h-[72px]"
              >
                <p className="font-bold text-sm mb-1 group-hover:text-blue-400">
                  New Work Order
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Dispatch mechanics
                </p>
              </Link>
              {userRole === "OWNER" && (
                <Link
                  to="/team"
                  className="bg-indigo-600/50 hover:bg-indigo-600 active:bg-indigo-700 p-4 rounded-xl sm:rounded-2xl transition-all group min-h-[72px]"
                >
                  <p className="font-bold text-sm mb-1">Manage Team</p>
                  <p className="text-[10px] text-slate-300 hidden sm:block">
                    Staff & permissions
                  </p>
                </Link>
              )}
              <Link
                to="/reports"
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 p-4 rounded-xl sm:rounded-2xl transition-all group min-h-[72px]"
              >
                <p className="font-bold text-sm mb-1 group-hover:text-blue-400">
                  View Reports
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Revenue & Inventory status
                </p>
              </Link>
            </div>
          </div>
          {}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
        </div>
      </div>
    </div>
  );
}
