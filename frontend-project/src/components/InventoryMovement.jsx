import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import Modal from "./Modal";
import Toast from "./Toast";

const MOVEMENT_REASONS = {
  IN: ["PURCHASE", "RESTOCK", "RETURN", "INITIAL_STOCK"],
  OUT: ["DAMAGED", "LOST", "SOLD", "EXPIRED"],
  ADJUST: [
    "AUDIT_CORRECTION",
    "COUNT_DISCREPANCY",
    "SYSTEM_ERROR_FIX",
    "OTHER",
  ],
};

export default function InventoryMovement() {
  const { authAxios, userRole, activeTenantId } = useContext(AuthContext);
  const [movements, setMovements] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    type: "info",
    visible: false,
  });

  const [form, setForm] = useState({
    sparePartId: "",
    type: "IN",
    quantity: "",
    reason: "",
    notes: "",
    unitCost: "",
    referenceNumber: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movRes, partRes] = await Promise.all([
        authAxios.get("/inventory/movements"),
        authAxios.get("/spareparts"),
      ]);
      setMovements(movRes.data);
      setSpareParts(partRes.data);
    } catch (err) {
      showToast("Failed to sync data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) fetchData();
  }, [activeTenantId]);

  const showToast = (message, type = "info") => {
    setToast({ message, type, visible: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalQty = parseInt(form.quantity);
      if (form.type === "OUT") finalQty = -Math.abs(finalQty);

      await authAxios.post("/inventory/move", {
        ...form,
        quantity: finalQty,
        unitCost: form.unitCost ? parseFloat(form.unitCost) : 0,
      });

      showToast("Inventory movement recorded", "success");
      setIsModalOpen(false);
      setForm({
        sparePartId: "",
        type: "IN",
        quantity: "",
        reason: "",
        notes: "",
        unitCost: "",
        referenceNumber: "",
      });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Movement failed", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Stock Movements
          </h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Full audit trail of all inventory changes.
          </p>
        </div>
        {userRole !== "VIEWER" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center w-full sm:w-auto"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span className="hidden sm:inline">Record Movement</span>
            <span className="sm:hidden">Record</span>
          </button>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {movements.map((m) => (
          <div
            key={m.id || m._id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  {m.sparePartId?.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {m.sparePartId?.sku}
                </p>
              </div>
              <span
                className={`font-mono font-bold text-lg ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  m.type === "IN"
                    ? "bg-green-100 text-green-700"
                    : m.type === "OUT"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {m.type} - {m.reason}
              </span>
              {m.referenceNumber && (
                <span className="text-[10px] text-slate-400 uppercase">
                  Ref: {m.referenceNumber}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-50">
              <span>{m.performedByUserId?.name || "System"}</span>
              <div className="flex items-center gap-2">
                <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                  Bal: {m.balanceAfter}
                </span>
              </div>
            </div>
          </div>
        ))}
        {movements.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <p className="text-slate-400">No stock history yet.</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Part
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  Activity
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                  Qty Change
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                  By
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movements.map((m) => (
                <tr
                  key={m.id || m._id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(m.createdAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">
                        {m.sparePartId?.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {m.sparePartId?.sku}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block w-fit ${
                          m.type === "IN"
                            ? "bg-green-100 text-green-700"
                            : m.type === "OUT"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {m.type} - {m.reason}
                      </span>
                      {m.referenceNumber && (
                        <span className="text-[10px] text-slate-400 mt-1 uppercase">
                          Ref: {m.referenceNumber}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-mono font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    {m.performedByUserId?.name || "System"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded text-sm">
                      {m.balanceAfter}
                    </span>
                  </td>
                </tr>
              ))}
              {movements.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No stock history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Inventory Movement"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Select Spare Part
            </label>
            <select
              name="sparePartId"
              value={form.sparePartId}
              onChange={(e) =>
                setForm({ ...form, sparePartId: e.target.value })
              }
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none bg-white font-medium"
            >
              <option value="">-- Search Part --</option>
              {spareParts.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Movement Type
              </label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                {["IN", "OUT", "ADJUST"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t, reason: "" })}
                    className={`flex-1 py-3 sm:py-2 text-xs font-bold rounded-lg transition-all ${
                      form.type === t
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Quantity
              </label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
                min="1"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 outline-none font-mono text-base sm:text-sm"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Reason
              </label>
              <select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 outline-none bg-white font-medium text-base sm:text-sm"
              >
                <option value="">-- Select Reason --</option>
                {MOVEMENT_REASONS[form.type].map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Ref Number (Optional)
              </label>
              <input
                value={form.referenceNumber}
                onChange={(e) =>
                  setForm({ ...form, referenceNumber: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 outline-none text-base sm:text-sm"
                placeholder="PO#, Invoice#, etc."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Internal Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows="2"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 outline-none text-base sm:text-sm"
              placeholder="Provide more context for this change..."
            />
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 sm:py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 w-full sm:w-auto"
            >
              Confirm Record
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}
