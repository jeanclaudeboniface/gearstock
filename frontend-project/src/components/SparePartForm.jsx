import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import Modal from "./Modal";
import Toast from "./Toast";

const CATEGORIES = [
  "Engine",
  "Brakes",
  "Suspension",
  "Transmission",
  "Electrical",
  "Body",
  "Interior",
  "Other",
];

export default function SparePartForm() {
  const { authAxios, userRole, activeTenantId } = useContext(AuthContext);
  const [spareParts, setSpareParts] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: "",
    sku: "",
    category: "",
    unit_price: "",
    description: "",
    lowStockThreshold: 5,
    status: "ACTIVE",
  });
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    type: "info",
    visible: false,
  });

  const fetchSpareParts = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get("/spareparts");
      setSpareParts(res.data);
    } catch (err) {
      showToast("Failed to fetch spare parts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      fetchSpareParts();
    }
  }, [activeTenantId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type = "info") => {
    setToast({ message, type, visible: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        unit_price: parseFloat(form.unit_price),
        lowStockThreshold: parseInt(form.lowStockThreshold),
      };

      if (form.id) {
        await authAxios.put(`/spareparts/${form.id}`, payload);
        showToast("Spare part updated successfully", "success");
      } else {
        await authAxios.post("/spareparts", payload);
        showToast("Spare part added successfully", "success");
      }

      setForm({
        id: null,
        name: "",
        sku: "",
        category: "",
        unit_price: "",
        description: "",
        lowStockThreshold: 5,
        status: "ACTIVE",
      });
      setIsModalOpen(false);
      fetchSpareParts();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to save spare part",
        "error",
      );
    }
  };

  const handleEdit = (part) => {
    setForm({
      id: part.id || part._id,
      name: part.name,
      sku: part.sku || "",
      category: part.category || "",
      unit_price: part.unit_price,
      description: part.description || "",
      lowStockThreshold: part.lowStockThreshold || 5,
      status: part.status || "ACTIVE",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inventory
          </h2>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Manage your garage spare parts and stock levels.
          </p>
        </div>
        {["OWNER", "MANAGER", "STOREKEEPER"].includes(userRole) && (
          <button
            onClick={() => {
              setForm({
                id: null,
                name: "",
                sku: "",
                category: "",
                unit_price: "",
                description: "",
                lowStockThreshold: 5,
                status: "ACTIVE",
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center w-full sm:w-auto"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">Add New Part</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {spareParts.map((part) => (
          <div
            key={part.id || part._id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-900">{part.name}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {part.sku || "NO-SKU"}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  part.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {part.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                  {part.category || "Uncategorized"}
                </span>
                <span className="font-mono font-semibold text-slate-700">
                  ${Number(part.unit_price).toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => handleEdit(part)}
                className="text-blue-600 hover:text-blue-800 font-bold text-sm py-2 px-3 -mr-2"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
        {spareParts.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <p className="text-slate-400 font-medium">
              No inventory items found.
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Part Info
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Unit Price
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {spareParts.map((part) => (
                <tr
                  key={part.id || part._id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">
                        {part.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono mt-0.5">
                        {part.sku || "NO-SKU"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {part.category || "Uncategorized"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">
                    ${Number(part.unit_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        part.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {part.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(part)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {spareParts.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <p className="text-slate-400 font-medium">
                      No inventory items found.
                    </p>
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
        title={form.id ? "Edit Part" : "Add New Part"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Part Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-sm"
                placeholder="e.g. Brake Pads"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                SKU / Code
              </label>
              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-sm"
                placeholder="e.g. BK-4502"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-base sm:text-sm"
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Unit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="unit_price"
                value={form.unit_price}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Low Stock Threshold
              </label>
              <input
                type="number"
                name="lowStockThreshold"
                value={form.lowStockThreshold}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-base sm:text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="2"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-sm"
              placeholder="Optional notes about this part..."
            />
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 sm:py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all w-full sm:w-auto"
            >
              {form.id ? "Update Part" : "Save Part"}
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
