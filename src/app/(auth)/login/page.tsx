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

  // 手机号发送验证码
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
      setError(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setLoading(false);
    }
  };

  // 手机号验证 OTP
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
      setError(err instanceof Error ? err.message : "验证码错误");
    } finally {
      setLoading(false);
    }
  };

  // 邮箱密码登录
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
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  // 邮箱注册
  const emailSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      // 需要邮箱确认，显示提示
      setStep("check-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F6] px-4">
      <div className="w-full max-w-sm space-y-8 rounded-2xl bg-white p-8 border border-[#E8EAED]">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">优培科技辅导学习平台</h1>
          <p className="mt-2 text-sm text-[#B4BCC8]">请登录或注册</p>
        </div>

        {/* 切换登录方式 */}
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
            邮箱登录
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
            手机号登录
          </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 邮箱登录 */}
        {method === "email" && step !== "check-email" && (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-base text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            />
            <input
              type="password"
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-base text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            />
            <Button
              onClick={isSignUp ? emailSignUp : emailLogin}
              disabled={loading || !email || password.length < 6}
              className="w-full py-3 text-base"
            >
              {loading ? "处理中..." : isSignUp ? "注册" : "登录"}
            </Button>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="w-full text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors duration-150"
            >
              {isSignUp ? "已有账号？去登录" : "没有账号？去注册"}
            </button>
          </div>
        )}

        {/* 手机号登录 */}
        {method === "phone" && step === "input" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-3 text-base text-[#B4BCC8]">
                +86
              </span>
              <input
                type="tel"
                placeholder="手机号"
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
              {loading ? "发送中..." : "获取验证码"}
            </Button>
          </div>
        )}

        {/* 邮箱确认提示 */}
        {step === "check-email" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
              ✉
            </div>
            <p className="text-base font-medium text-[#2E3338]">
              确认邮件已发送
            </p>
            <p className="text-sm text-[#B4BCC8]">
              请查看 <span className="font-medium text-[#4D5766]">{email}</span> 的收件箱，点击确认链接完成注册
            </p>
            <button
              onClick={() => {
                setStep("input");
                setIsSignUp(false);
                setError("");
              }}
              className="w-full text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors duration-150"
            >
              返回登录
            </button>
          </div>
        )}

        {/* 手机号 OTP 验证 */}
        {method === "phone" && step === "otp" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-[#B4BCC8]">
              验证码已发送至 +86 {phone}
            </p>
            <input
              type="text"
              placeholder="6位验证码"
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
              {loading ? "验证中..." : "登录"}
            </Button>
            <button
              onClick={() => {
                setStep("input");
                setOtp("");
              }}
              className="w-full text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors duration-150"
            >
              返回修改手机号
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
