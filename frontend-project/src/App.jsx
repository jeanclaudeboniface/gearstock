import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import CreateGarage from "./components/CreateGarage";
import GarageSelector from "./components/GarageSelector";
import InviteAccept from "./components/InviteAccept";
import Dashboard from "./components/Dashboard";
import SparePartForm from "./components/SparePartForm";
import InventoryMovement from "./components/InventoryMovement";
import WorkOrders from "./components/WorkOrders";
import ReportsPage from "./components/ReportsPage";
import TeamManagement from "./components/TeamManagement";
import Layout from "./components/Layout";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import { API_BASE_URL } from "./config";

export const AuthContext = React.createContext();

function App() {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("token");
    return t && t !== "null" && t !== "undefined" ? t : "";
  });
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u && u !== "null" && u !== "undefined" ? JSON.parse(u) : null;
  });
  const [memberships, setMemberships] = useState(() => {
    const m = localStorage.getItem("memberships");
    return m && m !== "null" && m !== "undefined" ? JSON.parse(m) : [];
  });
  const [activeTenantId, setActiveTenantId] = useState(() => {
    const at = localStorage.getItem("activeTenantId");
    return at && at !== "null" && at !== "undefined" ? at : "";
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      fetchUserData();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("memberships");
      localStorage.removeItem("activeTenantId");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (memberships.length > 0) {
      localStorage.setItem("memberships", JSON.stringify(memberships));

      if (memberships.length === 1) {
        setActiveTenantId(memberships[0].tenantId);
      } else if (!activeTenantId) {
        navigate("/select-garage");
      }
    }
  }, [memberships]);

  useEffect(() => {
    if (activeTenantId) {
      localStorage.setItem("activeTenantId", activeTenantId);
    }
  }, [activeTenantId]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data.user);
      setMemberships(res.data.memberships);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        logout();
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("memberships");
    localStorage.removeItem("activeTenantId");

    setToken("");
    setUser(null);
    setMemberships([]);
    setActiveTenantId("");
    navigate("/login");
  };

  const authAxios = axios.create({
    baseURL: API_BASE_URL,
  });

  authAxios.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeTenantId) {
      config.headers["X-Tenant-Id"] = activeTenantId;
    }
    return config;
  });

  authAxios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 403) {
        alert(error.response.data.message || "Forbidden");
      }
      return Promise.reject(error);
    },
  );

  const activeMembership = memberships.find(
    (m) => m.tenantId === activeTenantId,
  );
  const userRole = activeMembership ? activeMembership.role : null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setToken,
        logout,
        authAxios,
        memberships,
        activeTenantId,
        setActiveTenantId,
        userRole,
        fetchUserData,
      }}
    >
      {!token ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/select-garage" element={<GarageSelector />} />
          <Route path="/create-garage" element={<CreateGarage />} />
          <Route
            path="*"
            element={
              !activeTenantId ? (
                <Navigate to="/select-garage" />
              ) : (
                <Layout logout={logout}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/spareparts" element={<SparePartForm />} />
                    <Route
                      path="/inventory/move"
                      element={<InventoryMovement />}
                    />
                    <Route path="/workorders" element={<WorkOrders />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/team" element={<TeamManagement />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Layout>
              )
            }
          />
        </Routes>
      )}
    </AuthContext.Provider>
  );
}

export default App;
