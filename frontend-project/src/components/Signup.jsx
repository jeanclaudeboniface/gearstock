import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { AuthContext } from "../App";
import AuthLayout from "./AuthLayout";

const GARAGE_TYPES = [
  { id: "GENERAL", label: "General Repair" },
  { id: "BODY_SHOP", label: "Body Shop" },
  { id: "TIRE_SHOP", label: "Tire & Wheel" },
  { id: "DETAIL_CENTER", label: "Detailing Center" },
  { id: "SPARES_ONLY", label: "Spares/Parts Shop" },
];

export default function Signup() {
  const [formData, setFormData] = useState({
    garageName: "",
    ownerName: "",
    email: "",
    password: "",
    address: "",
    type: "GENERAL",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/signup`, formData);
      setToken(response.data.token);
      navigate("/spareparts");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Signup failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Scale your garage business"
      subtitle="Join hundreds of garages managing parts and performance with GearStock."
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

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Company Details
          </label>
          <div className="grid grid-cols-1 gap-3">
            <input
              name="garageName"
              type="text"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Garage Name"
              value={formData.garageName}
              onChange={handleChange}
            />
            <input
              name="address"
              type="text"
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Garage Address (Optional)"
              value={formData.address}
              onChange={handleChange}
            />
            <select
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

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Admin Account
          </label>
          <div className="space-y-3">
            <input
              name="ownerName"
              type="text"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Full Name"
              value={formData.ownerName}
              onChange={handleChange}
            />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Work Email"
              value={formData.email}
              onChange={handleChange}
            />
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Create Password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Get Started Now"}
          </button>
          <p className="mt-4 text-center text-[10px] text-slate-400 font-medium">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="text-center pt-2 border-t border-slate-50 mt-4">
          <p className="text-sm text-slate-600 font-medium">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-bold text-blue-600 hover:text-blue-500 transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
