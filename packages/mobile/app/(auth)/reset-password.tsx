import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiRequest, ApiRequestError } from "../../src/lib/api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.title}>Invalid Link</Text>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Invalid reset link. Request a new one.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/(auth)/forgot-password" as never)}
        >
          <Text style={styles.buttonText}>Request New Link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleReset() {
    setError(null);

    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 400) {
          if (err.message.toLowerCase().includes("expired")) {
            setError("This reset link has expired. Please request a new one.");
          } else if (err.message.toLowerCase().includes("invalid")) {
            setError("Invalid reset link. Please request a new one.");
          } else {
            setError(err.message);
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setError("Network error. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

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
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <>
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  Password reset! You can now log in.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace("/(auth)/login" as never)}
              >
                <Text style={styles.buttonText}>Go to Login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 8 characters"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                editable={!loading}
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your new password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                onSubmitEditing={handleReset}
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {!success ? (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password" as never)}
            >
              <Text style={styles.backLink}>Request a new reset link</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
  centerContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: { fontSize: 15, color: "#6b7280" },
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
    padding: 16,
    marginBottom: 16,
  },
  successText: { color: "#16a34a", fontSize: 15, textAlign: "center" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: 16,
  },
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
  backLink: { fontSize: 14, color: "#22c55e", fontWeight: "500" },
});
