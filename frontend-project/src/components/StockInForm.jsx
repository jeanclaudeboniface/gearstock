import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";

export default function StockInForm() {
  const { authAxios, userRole, activeTenantId } = useContext(AuthContext);
  const [spareParts, setSpareParts] = useState([]);
  const [stockIns, setStockIns] = useState([]);
  const [form, setForm] = useState({
    spare_part_id: "",
    stock_in_quantity: "",
    stock_in_date: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSpareParts = async () => {
    try {
      const res = await authAxios.get("/spareparts");
      setSpareParts(res.data);
    } catch (err) {
      setError("Failed to fetch spare parts");
    }
  };

  const fetchStockIns = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get("/stockin");
      setStockIns(res.data);
    } catch (err) {
      setError("Failed to fetch stock in records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      fetchSpareParts();
      fetchStockIns();
    }
  }, [activeTenantId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await authAxios.post("/stockin", {
        spare_part_id: form.spare_part_id,
        stock_in_quantity: parseInt(form.stock_in_quantity),
        stock_in_date: form.stock_in_date,
      });
      setForm({ spare_part_id: "", stock_in_quantity: "", stock_in_date: "" });
      fetchStockIns();
    } catch (err) {
      setError("Failed to add stock in record");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Stock In
        </h2>
        <p className="text-slate-500 mt-1">
          Record incoming inventory from suppliers.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl flex items-center">
          <svg
            className="w-5 h-5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      {userRole !== "VIEWER" && userRole !== "MECHANIC" && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <select
            name="spare_part_id"
            value={form.spare_part_id}
            onChange={handleChange}
            required
            className="border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Spare Part</option>
            {spareParts.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="stock_in_quantity"
            placeholder="Quantity"
            value={form.stock_in_quantity}
            onChange={handleChange}
            min="1"
            required
            className="border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="date"
            name="stock_in_date"
            value={form.stock_in_date}
            onChange={handleChange}
            required
            className="border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            className="bg-green-600 text-white rounded-xl px-6 py-2.5 font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
          >
            Add Stock
          </button>
        </form>
      )}
      {loading ? (
        <div className="py-12 text-center text-slate-400 animate-pulse">
          Loading records...
        </div>
      ) : (
        <>
          {}
          <div className="md:hidden space-y-4">
            {stockIns.map((si) => (
              <div
                key={si.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-900">
                    {si.spare_part_name}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {new Date(si.stock_in_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-50">
                  <span className="text-sm text-slate-500">Quantity Added</span>
                  <span className="font-mono font-bold text-green-600">
                    +{si.stock_in_quantity}
                  </span>
                </div>
              </div>
            ))}
            {stockIns.length === 0 && (
              <div className="text-center text-slate-400 py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                No stock in records yet.
              </div>
            )}
          </div>

          {}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Spare Part
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stockIns.map((si) => (
                  <tr
                    key={si.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {si.spare_part_name}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                      +{si.stock_in_quantity}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(si.stock_in_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {stockIns.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No stock in records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
