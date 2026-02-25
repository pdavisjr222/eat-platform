import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../src/lib/auth";
import { apiRequest, ApiRequestError } from "../../src/lib/api";

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email: paramEmail } = useLocalSearchParams<{ email: string }>();
  const { user } = useAuthStore();

  const email = paramEmail ?? user?.email ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(RESEND_COOLDOWN);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (!email) {
      setError("No email address found. Please go back and sign up again.");
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await apiRequest<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
      startCountdown();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 404) {
          setError("No account found with that email address.");
        } else if (err.status === 400 && err.message.toLowerCase().includes("already verified")) {
          setError("This email is already verified. Try logging in.");
        } else if (err.status === 429) {
          setError("Too many requests. Please wait before trying again.");
          startCountdown();
        } else {
          setError(err.message);
        }
      } else {
        setError("Network error. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const resendDisabled = loading || countdown > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.emailIcon}>📧</Text>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to your email address. Click it to
            activate your account.
          </Text>
          {email ? (
            <Text style={styles.emailDisplay}>{email}</Text>
          ) : null}
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Email resent! Check your inbox.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, resendDisabled && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={resendDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {countdown > 0
                  ? `Resend Email (${countdown}s)`
                  : "Resend Email"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push("/(auth)/login" as never)}>
            <Text style={styles.backLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  emailIcon: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  emailDisplay: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginTop: 4,
  },
  form: { width: "100%" },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 14 },
  successBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: "#16a34a", fontSize: 14, textAlign: "center" },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  backLink: { fontSize: 15, color: "#22c55e", fontWeight: "600" },
});
