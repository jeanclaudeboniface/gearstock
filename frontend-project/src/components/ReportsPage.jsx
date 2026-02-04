import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../App";

export default function ReportsPage() {
  const { authAxios, activeTenantId } = useContext(AuthContext);
  const [dailyStockOut, setDailyStockOut] = useState([]);
  const [stockStatus, setStockStatus] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dailyReportRef = useRef();
  const stockStatusRef = useRef();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [dailyRes, statusRes] = await Promise.all([
        authAxios.get("/reports/daily-stockout"),
        authAxios.get("/reports/stock-status"),
      ]);
      setDailyStockOut(dailyRes.data);
      setStockStatus(statusRes.data);
    } catch (err) {
      setError("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      fetchReports();
    }
  }, [activeTenantId]);

  const printSection = (ref) => {
    if (!ref.current) return;
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-slate-100 pb-6 sm:pb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Financial & Stock Reports
          </h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Audit-ready documentation for your garage operations.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">
            Part Consumption Summary (OUT)
          </h3>
          <button
            onClick={() => printSection(dailyReportRef)}
            className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-all w-full sm:w-auto text-center"
          >
            Download / Print List
          </button>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3" ref={dailyReportRef}>
          {dailyStockOut.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800">
                  {item.spare_part_name}
                </h4>
                <span className="font-mono font-bold text-red-600">
                  -{item.total_quantity}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>{item.stock_out_date}</span>
                <span className="font-mono font-semibold">
                  ${Number(item.total_price).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          {dailyStockOut.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <p className="text-slate-400">
                No consumption data found for this period.
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-0">
          <table
            className="w-full text-left border-collapse"
            ref={dailyReportRef}
          >
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Spare Part
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                  Qty Consumed
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                  Value ($)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dailyStockOut.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    {item.stock_out_date}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {item.spare_part_name}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-red-600">
                    -{item.total_quantity}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold">
                    ${Number(item.total_price).toFixed(2)}
                  </td>
                </tr>
              ))}
              {dailyStockOut.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-400">
                    No consumption data found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">
            Critical Stock Status
          </h3>
          <button
            onClick={() => printSection(stockStatusRef)}
            className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-all w-full sm:w-auto text-center"
          >
            Download / Print List
          </button>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3" ref={stockStatusRef}>
          {stockStatus.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800">
                    {item.spare_part_name}
                  </h4>
                  <span className="font-mono font-bold text-slate-700">
                    Qty: {item.remaining_quantity}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                    item.lowStock
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {item.lowStock ? "REPLENISH" : "OPTIMAL"}
                </span>
              </div>
            </div>
          ))}
          {stockStatus.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <p className="text-slate-400">Inventory is empty.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-0">
          <table
            className="w-full text-left border-collapse"
            ref={stockStatusRef}
          >
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Part Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                  On Hand
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                  Alert Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stockStatus.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {item.spare_part_name}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                    {item.remaining_quantity}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        item.lowStock
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.lowStock ? "REPLENISH" : "OPTIMAL"}
                    </span>
                  </td>
                </tr>
              ))}
              {stockStatus.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-10 text-center text-slate-400">
                    Inventory is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="bg-blue-900/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-blue-100 text-blue-900">
        <h4 className="font-bold text-lg mb-2">Automated Compliance</h4>
        <p className="text-sm text-blue-800/80 leading-relaxed">
          These reports are generated directly from the stock movement audit
          log. Every record is timestamped and attributed to a staff member to
          ensure 100% accountability for your garage assets.
        </p>
      </div>
    </div>
  );
}
