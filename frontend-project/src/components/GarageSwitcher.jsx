import React, { useContext } from "react";
import { AuthContext } from "../App";

export default function GarageSwitcher() {
  const { memberships, activeTenantId, setActiveTenantId } =
    useContext(AuthContext);

  if (!memberships || memberships.length === 0) return null;

  return (
    <div className="p-4 border-b border-gray-700">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Active garage
      </label>
      <select
        value={activeTenantId || ""}
        onChange={(e) => setActiveTenantId(e.target.value)}
        className="w-full bg-gray-800 text-white text-sm border border-gray-700 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>
          Select Garage
        </option>
        {memberships.map((m) => (
          <option key={m.tenantId} value={m.tenantId}>
            {m.tenantName}
          </option>
        ))}
      </select>
    </div>
  );
}
