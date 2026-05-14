import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { signIn } from "../lib/auth";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) { setError("Enter email and password"); return; }
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.title}>Vineyard School</Text>
          <Text style={styles.subtitle}>Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@vineyardschool.com"
              placeholderTextColor="#484f58"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#484f58"
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleSignIn} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0D1117" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Vineyard School © {new Date().getFullYear()}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "#4ADE8020", borderWidth: 2, borderColor: "#4ADE80",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  logoText: { fontSize: 32, fontWeight: "700", color: "#4ADE80" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: "#8b949e", marginTop: 4 },
  card: {
    backgroundColor: "#161B22", borderRadius: 16,
    borderWidth: 1, borderColor: "#30363D", padding: 24,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 20 },
  errorBox: {
    backgroundColor: "#F8717120", borderWidth: 1, borderColor: "#F87171",
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  errorText: { color: "#F87171", fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: "#8b949e", marginBottom: 6 },
  input: {
    backgroundColor: "#0D1117", borderWidth: 1, borderColor: "#30363D",
    borderRadius: 8, padding: 12, color: "#fff", fontSize: 14,
  },
  btn: {
    backgroundColor: "#4ADE80", borderRadius: 8,
    padding: 14, alignItems: "center", marginTop: 8,
  },
  btnText: { color: "#0D1117", fontWeight: "700", fontSize: 15 },
  footer: { textAlign: "center", color: "#484f58", fontSize: 12, marginTop: 32 },
});
