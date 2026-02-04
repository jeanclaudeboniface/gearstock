import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../App";
import AuthLayout from "./AuthLayout";

const GARAGE_TYPES = [
  { id: "GENERAL", label: "General Repair" },
  { id: "BODY_SHOP", label: "Body Shop" },
  { id: "TIRE_SHOP", label: "Tire & Wheel" },
  { id: "DETAIL_CENTER", label: "Detailing Center" },
  { id: "SPARES_ONLY", label: "Spares/Parts Shop" },
];

export default function CreateGarage() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "GENERAL",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { authAxios, fetchUserData } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authAxios.post("/tenants", formData);
      await fetchUserData();
      navigate("/select-garage");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create garage. Please check try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Register a new garage"
      subtitle="Expand your operations by adding another garage location."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl flex items-center">
            <svg
              className="w-5 h-5 mr-3"
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

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-semibold text-slate-700 mb-2"
              htmlFor="name"
            >
              Garage Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g. Downtown Service Center"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold text-slate-700 mb-2"
              htmlFor="address"
            >
              Garage Address (Optional)
            </label>
            <input
              id="address"
              name="address"
              type="text"
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="123 Street, City"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold text-slate-700 mb-2"
              htmlFor="type"
            >
              Specialization/Type
            </label>
            <select
              id="type"
              name="type"
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
              value={formData.type}
              onChange={handleChange}
            >
              {GARAGE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.name}
          className="w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Garage"}
        </button>

        <div className="text-center">
          <Link
            to="/select-garage"
            className="text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Cancel and return
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
