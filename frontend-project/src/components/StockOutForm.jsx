import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import Modal from "./Modal";
import Toast from "./Toast";

export default function StockOutForm() {
  const { authAxios, userRole, activeTenantId } = useContext(AuthContext);
  const [spareParts, setSpareParts] = useState([]);
  const [stockOuts, setStockOuts] = useState([]);
  const [form, setForm] = useState({
    id: null,
    spare_part_id: "",
    stock_out_quantity: "",
    stock_out_unit_price: "",
    stock_out_total_price: "",
    stock_out_date: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    type: "info",
    visible: false,
  });

  const fetchSpareParts = async () => {
    try {
      const res = await authAxios.get("/spareparts");
      setSpareParts(res.data);
    } catch (err) {
      setError("Failed to fetch spare parts");
      showToast("Failed to fetch spare parts", "error");
    }
  };

  const fetchStockOuts = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get("/stockout");
      setStockOuts(res.data);
    } catch (err) {
      setError("Failed to fetch stock out records");
      showToast("Failed to fetch stock out records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      fetchSpareParts();
      fetchStockOuts();
    }
  }, [activeTenantId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };
      if (name === "stock_out_quantity" || name === "stock_out_unit_price") {
        const quantity = parseFloat(newForm.stock_out_quantity) || 0;
        const unitPrice = parseFloat(newForm.stock_out_unit_price) || 0;
        newForm.stock_out_total_price = (quantity * unitPrice).toFixed(2);
      }
      return newForm;
    });
  };

  const showToast = (message, type = "info") => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        spare_part_id: form.spare_part_id,
        stock_out_quantity: parseInt(form.stock_out_quantity),
        stock_out_unit_price: parseFloat(form.stock_out_unit_price),
        stock_out_total_price: parseFloat(form.stock_out_total_price),
        stock_out_date: form.stock_out_date,
      };
      if (form.id) {
        await authAxios.put(`/stockout/${form.id}`, payload);
        showToast("Stock out record updated successfully", "success");
      } else {
        await authAxios.post("/stockout", payload);
        showToast("Stock out record added successfully", "success");
      }
      setForm({
        id: null,
        spare_part_id: "",
        stock_out_quantity: "",
        stock_out_unit_price: "",
        stock_out_total_price: "",
        stock_out_date: "",
      });
      setIsModalOpen(false);
      fetchStockOuts();
    } catch (err) {
      setError("Failed to save stock out record");
      showToast("Failed to save stock out record", "error");
    }
  };

  const handleEdit = (record) => {
    setForm({
      id: record.id,
      spare_part_id: record.spare_part_id,
      stock_out_quantity: record.stock_out_quantity,
      stock_out_unit_price: record.stock_out_unit_price,
      stock_out_total_price: record.stock_out_total_price,
      stock_out_date: record.stock_out_date,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this stock out record?")
    )
      return;
    try {
      await authAxios.delete(`/stockout/${id}`);
      showToast("Stock out record deleted successfully", "success");
      fetchStockOuts();
    } catch (err) {
      setError("Failed to delete stock out record");
      showToast("Failed to delete stock out record", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Stock Out
        </h2>
        <p className="text-slate-500 mt-1">Track parts sold or used in jobs.</p>
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

      {userRole !== "VIEWER" && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-4"
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
            name="stock_out_quantity"
            placeholder="Quantity"
            value={form.stock_out_quantity}
            onChange={handleChange}
            min="1"
            required
            className="border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            name="stock_out_unit_price"
            placeholder="Unit Price"
            value={form.stock_out_unit_price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            className="border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            name="stock_out_total_price"
            placeholder="Total Price"
            value={form.stock_out_total_price}
            readOnly
            className="border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-500"
          />
          <input
            type="date"
            name="stock_out_date"
            value={form.stock_out_date}
            onChange={handleChange}
            required
            className="border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-xl px-6 py-2.5 font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            {form.id ? "Update" : "Add"}
          </button>
        </form>
      )}

      {}
      <div className="md:hidden space-y-4">
        {stockOuts.map((so) => (
          <div
            key={so.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  {so.spare_part_name}
                </h3>
                <span className="text-xs text-slate-400">
                  {new Date(so.stock_out_date).toLocaleDateString()}
                </span>
              </div>
              {userRole !== "VIEWER" && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(so)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(so.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-slate-50 pt-3 mt-2">
              <span className="text-sm text-slate-500">Quantity Out</span>
              <span className="font-mono font-bold text-red-600">
                -{so.stock_out_quantity}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-sm text-slate-500">Total Price</span>
              <span className="font-mono font-semibold text-slate-700">
                ${Number(so.stock_out_total_price).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
        {stockOuts.length === 0 && (
          <div className="text-center text-slate-400 py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
            No stock out records yet.
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
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Unit Price
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Total Price
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {stockOuts.map((so) => (
              <tr
                key={so.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-slate-800">
                  {so.spare_part_name}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-red-600">
                  -{so.stock_out_quantity}
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-600">
                  ${Number(so.stock_out_unit_price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">
                  ${Number(so.stock_out_total_price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(so.stock_out_date).toLocaleDateString()}
                </td>
                {userRole !== "VIEWER" && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(so)}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(so.id)}
                      className="text-sm font-bold text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {stockOuts.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-slate-400"
                >
                  No stock out records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Update Stock Out" : "Add Stock Out"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Spare Part
            </label>
            <select
              name="spare_part_id"
              value={form.spare_part_id}
              onChange={handleChange}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Spare Part</option>
              {spareParts.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Quantity
              </label>
              <input
                type="number"
                name="stock_out_quantity"
                placeholder="Quantity"
                value={form.stock_out_quantity}
                onChange={handleChange}
                min="1"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Unit Price ($)
              </label>
              <input
                type="number"
                name="stock_out_unit_price"
                placeholder="Unit Price"
                value={form.stock_out_unit_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Total Price
              </label>
              <input
                type="number"
                name="stock_out_total_price"
                placeholder="Total Price"
                value={form.stock_out_total_price}
                readOnly
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Date
              </label>
              <input
                type="date"
                name="stock_out_date"
                value={form.stock_out_date}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 transition-colors"
            >
              {form.id ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}
    </div>
  );
}
