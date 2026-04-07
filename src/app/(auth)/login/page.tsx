"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type LoginMethod = "phone" | "email";
type Step = "input" | "otp" | "check-email";

export default function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>("email");
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("86")) return `+${digits}`;
    return `+86${digits}`;
  };

  const checkProfileAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (!profile) {
      router.push("/setup");
    } else {
      const defaultPage =
        profile.role === "parent" || profile.role === "student"
          ? `/${profile.role}/tasks`
          : `/${profile.role}/dashboard`;
      router.push(defaultPage);
      router.refresh();
    }
  };

  // TODO: phone OTP login is currently hardcoded to +86 (China). Either remove
  // phone login entirely or add country-code selection before going live to a
  // non-Chinese audience.

  // Send SMS verification code
  const sendCode = async () => {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatPhone(phone),
      });
      if (error) throw error;
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // Verify SMS OTP
  const verifyCode = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatPhone(phone),
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      if (data.user) await checkProfileAndRedirect(data.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  // Email + password sign in
  const emailLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) await checkProfileAndRedirect(data.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // Email sign up
  const emailSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      // Email confirmation required — show the check-email screen.
      setStep("check-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4" style={{ background: "#F9FDF4" }}>
      {/* Top-left logo link */}
      <a href="/" className="absolute top-5 left-6 flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src="/logo.png" alt="Firefly" className="w-8 h-8 object-contain" />
        <span className="text-base font-black text-[#2D2D2D] tracking-tight">Firefly</span>
      </a>

      <div className="w-full max-w-sm space-y-8 rounded-3xl bg-white p-8 border-2 border-b-4 border-[#E8F5D6]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/logo.png" alt="Firefly" className="w-12 h-12 object-contain" />
            <h1 className="text-2xl font-black text-[#2D2D2D] tracking-tight">Firefly</h1>
          </div>
          <p className="mt-1 text-sm text-[#6B7280]">AI learning platform · Sign in or create an account</p>
        </div>

        {/* Toggle between email and phone */}
        {step !== "check-email" && (
          <div className="grid grid-cols-2 gap-2 rounded-full bg-[#F4F5F6] p-1">
          <button
            onClick={() => {
              setMethod("email");
              setError("");
              setStep("input");
            }}
            className={`rounded-full py-2 text-sm font-medium transition-colors duration-150 ${
              method === "email"
                ? "bg-white text-[#2E3338] shadow-sm"
                : "text-[#B4BCC8] hover:text-[#4D5766]"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => {
              setMethod("phone");
              setError("");
              setStep("input");
            }}
            className={`rounded-full py-2 text-sm font-medium transition-colors duration-150 ${
              method === "phone"
                ? "bg-white text-[#2E3338] shadow-sm"
                : "text-[#B4BCC8] hover:text-[#4D5766]"
            }`}
          >
            Phone
          </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Email sign in */}
        {method === "email" && step !== "check-email" && (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-base text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            />
            <input
              type="password"
              placeholder="Password (at least 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-base text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            />
            <Button
              onClick={isSignUp ? emailSignUp : emailLogin}
              disabled={loading || !email || password.length < 6}
              className="w-full py-3 text-base"
            >
              {loading ? "Working..." : isSignUp ? "Sign up" : "Sign in"}
            </Button>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="w-full text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors duration-150"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        )}

        {/* Phone sign in */}
        {method === "phone" && step === "input" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-3 text-base text-[#B4BCC8]">
                +86
              </span>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-base text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
                maxLength={11}
              />
            </div>
            <Button
              onClick={sendCode}
              disabled={loading || phone.replace(/\D/g, "").length < 11}
              className="w-full py-3 text-base"
            >
              {loading ? "Sending..." : "Send code"}
            </Button>
          </div>
        )}

        {/* Email confirmation screen */}
        {step === "check-email" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
              ✉
            </div>
            <p className="text-base font-medium text-[#2E3338]">
              Confirmation email sent
            </p>
            <p className="text-sm text-[#B4BCC8]">
              Check the inbox at <span className="font-medium text-[#4D5766]">{email}</span> and click the confirmation link to finish signing up.
            </p>
            <button
              onClick={() => {
                setStep("input");
                setIsSignUp(false);
                setError("");
              }}
              className="w-full text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors duration-150"
            >
              Back to sign in
            </button>
          </div>
        )}

        {/* Phone OTP verification */}
        {method === "phone" && step === "otp" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-[#B4BCC8]">
              Code sent to +86 {phone}
            </p>
            <input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-center text-2xl tracking-widest text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              maxLength={6}
            />
            <Button
              onClick={verifyCode}
              disabled={loading || otp.length < 6}
              className="w-full py-3 text-base"
            >
              {loading ? "Verifying..." : "Sign in"}
            </Button>
            <button
              onClick={() => {
                setStep("input");
                setOtp("");
              }}
              className="w-full text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors duration-150"
            >
              Use a different phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
