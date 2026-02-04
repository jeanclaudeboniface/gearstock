import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { AuthContext } from "../App";
import AuthLayout from "./AuthLayout";

// OTP Input Component
function OtpInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length > 1) {
      // Handle paste
      const newValue = val.slice(0, 6).split("");
      const currentValue = value.split("");
      newValue.forEach((digit, i) => {
        currentValue[i] = digit;
      });
      onChange(currentValue.join("").slice(0, 6));
      const nextIndex = Math.min(val.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newValue = value.split("");
    newValue[index] = val;
    onChange(newValue.join(""));

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={6}
          disabled={disabled}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-14 text-center text-2xl font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        />
      ))}
    </div>
  );
}

// Countdown Timer Component
function CountdownTimer({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        onExpire?.();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  return (
    <span
      className={timeLeft === "Expired" ? "text-red-500" : "text-slate-500"}
    >
      {timeLeft}
    </span>
  );
}

export default function InviteAccept() {
  const { token } = useParams();
  const { setToken, setActiveTenantId } = useContext(AuthContext);
  const navigate = useNavigate();

  // UI State
  const [step, setStep] = useState("loading"); // loading, preview, otp, account, success, error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Invite Data
  const [inviteData, setInviteData] = useState(null);

  // OTP State
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [remainingSends, setRemainingSends] = useState(3);
  const [verificationToken, setVerificationToken] = useState("");

  // Account Form State
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchInvitePreview();
  }, [token]);

  const fetchInvitePreview = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/invites/${token}/preview`);
      setInviteData(res.data);

      if (res.data.isLocked) {
        setError(
          "This invite is temporarily locked due to too many failed attempts. Please try again later.",
        );
        setStep("error");
      } else {
        setStep("preview");
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const message =
        err.response?.data?.message || "Invalid or expired invite";

      if (code === "INVITE_EXPIRED") {
        setError(
          "This invitation has expired. Please ask your garage manager to send a new invite.",
        );
      } else if (code === "INVITE_USED") {
        setError(
          "This invitation has already been used. If you need access, please ask your garage manager.",
        );
      } else {
        setError(message);
      }
      setStep("error");
    }
  };

  const handleSendCode = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/invites/${token}/send-code`,
      );
      setOtpExpiresAt(res.data.expiresAt);
      setRemainingSends(res.data.remainingSends);
      setOtpCode("");
      setStep("otp");
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "OTP_SEND_LIMIT_EXCEEDED") {
        setError(
          `Too many codes requested. Please try again in ${err.response.data.retryAfterMinutes} minutes.`,
        );
      } else if (code === "RATE_LIMIT_EXCEEDED") {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError(
          err.response?.data?.message || "Failed to send verification code",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/invites/${token}/verify-code`,
        {
          code: otpCode,
        },
      );
      setVerificationToken(res.data.verificationToken);
      setStep("account");
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "INVALID_OTP") {
        setError(
          `Incorrect code. ${err.response.data.remainingAttempts} attempts remaining.`,
        );
      } else if (code === "OTP_EXPIRED") {
        setError("Code expired. Please request a new code.");
        setStep("preview");
      } else if (code === "INVITE_LOCKED") {
        setError("Too many failed attempts. Please try again in 1 hour.");
        setStep("error");
      } else {
        setError(err.response?.data?.message || "Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE_URL}/invites/${token}/accept`, {
        verificationToken,
        name: name.trim(),
        password,
      });

      // Set auth token and active tenant
      setToken(res.data.token);
      if (setActiveTenantId) {
        setActiveTenantId(res.data.tenantId);
      }
      localStorage.setItem("activeTenantId", res.data.tenantId);

      setStep("success");

      // Redirect after brief success message
      setTimeout(() => {
        navigate("/app");
      }, 1500);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "VERIFICATION_REQUIRED" || code === "VERIFICATION_EXPIRED") {
        setError("Verification expired. Please verify your email again.");
        setStep("preview");
      } else {
        setError(err.response?.data?.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (step === "loading") {
    return (
      <AuthLayout title="Verifying Invitation...">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </AuthLayout>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <AuthLayout title="Invitation Error">
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-center">
          {error}
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 font-bold hover:underline"
          >
            Return to Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <AuthLayout title="Welcome to the team!">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-slate-600">
            You've joined <strong>{inviteData?.garageName}</strong>
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Redirecting to dashboard...
          </p>
        </div>
      </AuthLayout>
    );
  }

  // Preview state - show invite details and send code button
  if (step === "preview") {
    return (
      <AuthLayout
        title="Join the Garage"
        subtitle={`You've been invited to ${inviteData?.garageName}`}
      >
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 mb-6">
          <p>
            <strong>Garage:</strong> {inviteData?.garageName}
          </p>
          <p>
            <strong>Role:</strong> {inviteData?.role}
          </p>
          <p>
            <strong>Email:</strong> {inviteData?.email}
          </p>
        </div>

        <p className="text-sm text-slate-600 mb-6 text-center">
          To verify your email and accept this invitation, we'll send a
          verification code to your email address.
        </p>

        <button
          onClick={handleSendCode}
          disabled={loading}
          className="w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              Sending...
            </span>
          ) : (
            "Send Verification Code"
          )}
        </button>
      </AuthLayout>
    );
  }

  // OTP verification state
  if (step === "otp") {
    return (
      <AuthLayout
        title="Enter verification code"
        subtitle={`We sent a 6-digit code to ${inviteData?.email}`}
      >
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <OtpInput value={otpCode} onChange={setOtpCode} disabled={loading} />
        </div>

        <div className="text-center text-sm text-slate-500 mb-6">
          Code expires in{" "}
          <CountdownTimer
            expiresAt={otpExpiresAt}
            onExpire={() => {
              setError("Code expired. Please request a new code.");
              setStep("preview");
            }}
          />
        </div>

        <button
          onClick={handleVerifyCode}
          disabled={loading || otpCode.length !== 6}
          className="w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={handleSendCode}
            disabled={loading || remainingSends === 0}
            className="text-sm text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
          >
            {remainingSends > 0
              ? `Resend code (${remainingSends} remaining)`
              : "No more resends available"}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Account creation state
  if (step === "account") {
    return (
      <AuthLayout
        title="Create your account"
        subtitle={`Complete your profile to join ${inviteData?.garageName}`}
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl">
              {error}
            </div>
          )}

          <div className="bg-green-50 border border-green-100 p-3 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Email verified: {inviteData?.email}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
            />
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm text-slate-600">
            <p>
              You will join as:{" "}
              <strong className="text-slate-900">{inviteData?.role}</strong>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account & Join"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return null;
}
