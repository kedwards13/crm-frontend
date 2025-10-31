// src/components/Auth/Login.js
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import api from "../../apiClient";
import { setActiveTenant, normalizeIndustry } from "../../helpers/tenantHelpers";
import { FcGoogle } from "react-icons/fc";
import "./Auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const domain = email.split("@")[1];

      const { data } = await api.post(
        "/accounts/auth/login/",
        { email, password },
        { headers: { "X-Tenant-Domain": domain } }
      );

      const access = data?.access;
      const refresh = data?.refresh;
      const expiry = new Date(Date.now() + 3600 * 1000).toISOString();

      const rawTenant = data?.activeTenant || {};
      const user = data?.user || {};

      const nameHint = (rawTenant.name || "").toLowerCase().includes("pest")
        ? "pest_control"
        : "general";

      const industry = normalizeIndustry(
        rawTenant.industry || rawTenant.vertical || rawTenant.segment || nameHint
      );

      const normalizedTenant = {
        id: rawTenant.id ?? "tenant",
        name: rawTenant.name ?? "Your Company",
        domain: rawTenant.domain,
        industry,
        setupComplete: data?.tenantSetupComplete ?? rawTenant.setupComplete ?? true,
        role: user?.role || "Member",
        plan: rawTenant.plan || "base",
        locale: rawTenant.locale || "en-US",
      };

      // ✅ Save tokens + context
      localStorage.setItem("token", access || "");
      localStorage.setItem("access_token", access || "");
      if (refresh) localStorage.setItem("refresh", refresh);
      localStorage.setItem("token_expiry", expiry);
      localStorage.setItem("user", JSON.stringify(user));

      setActiveTenant(normalizedTenant);
      login(access, refresh, expiry, normalizedTenant, user); // ✅ Added user

      console.log("✅ Logged in as:", user);
      console.log("✅ Tenant context:", normalizedTenant);

      navigate(
        normalizedTenant.setupComplete ? "/dashboard" : "/settings/team",
        { replace: true }
      );
    } catch (err) {
      const detail = err?.response?.data?.detail || "";
      const errorMsg =
        detail.includes("No active account")
          ? "User not found or incorrect password."
          : detail ||
            err?.response?.data?.error ||
            err?.message ||
            "Login failed. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Google login coming soon!");
  };

  return (
    <div className="auth-page">
      <div className="login-left">
        <h1 className="brand-title">ABON</h1>
        <p className="brand-tagline">
          Welcome to your AI-powered business command center
        </p>
      </div>

      <div className="auth-container">
        <h2 className="form-title">Sign in to your workspace</h2>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging In…" : "Login"}
          </button>

          <div className="alt-login">
            <span>or</span>
            <button
              type="button"
              className="google-login-btn"
              onClick={handleGoogleLogin}
            >
              <FcGoogle /> Sign in with Google
            </button>
          </div>

          <div className="auth-links">
            <a href="/forgot-password">Forgot Password?</a>
            <span>·</span>
            <a href="/signup">Sign Up</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;