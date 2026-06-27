import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { authApi, driverApi } from '../../api/services';
import { C } from '../../utils/colors';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const login = useAuthStore(s => s.login);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const res  = await authApi.login({ username: username.trim(), password });
      const data = res.data.data;
      if (!data?.token) throw new Error(res.data.message ?? 'Login failed');

      // Fetch driver profile to determine if user has a linked driver record
      let user = data.user ?? { username: username.trim(), role: data.role };
      try {
        const me = await driverApi.me();
        if (me.data.data?.driverId) user = { ...user, isDriver: true };
      } catch { /* not a driver or endpoint not available */ }

      await login(data.token, user);
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message ?? err.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoBox}>
          <View style={s.logoIcon}>
            <Text style={{ fontSize: 32 }}>🚗</Text>
          </View>
          <Text style={s.logoTitle}>VMS</Text>
          <Text style={s.logoSub}>Fleet Manager</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome back</Text>
          <Text style={s.cardSub}>Sign in to your account</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              placeholder="Enter username…"
              placeholderTextColor={C.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="Enter password…"
              placeholderTextColor={C.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        {/* Role hint */}
        <View style={s.hint}>
          <Text style={s.hintTitle}>Access by Role</Text>
          {[
            { role: 'Employee',       desc: 'Submit vehicle requests',           icon: '👤' },
            { role: 'Admin/Manager',  desc: 'Approve, assign & manage trips',    icon: '🛡️' },
            { role: 'Driver',         desc: 'View trips, start & end with GPS',  icon: '🚌' },
          ].map(r => (
            <View key={r.role} style={s.hintRow}>
              <Text style={s.hintIcon}>{r.icon}</Text>
              <View>
                <Text style={s.hintRole}>{r.role}</Text>
                <Text style={s.hintDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.footer}>© Nexdecade Technology</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flexGrow: 1, backgroundColor: C.bg, padding: 24, paddingTop: Platform.OS === 'ios' ? 72 : 48 },
  logoBox:    { alignItems: 'center', marginBottom: 32 },
  logoIcon:   { width: 80, height: 80, borderRadius: 24, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 8 },
  logoTitle:  { fontSize: 32, fontWeight: '900', color: C.primary, letterSpacing: -1 },
  logoSub:    { fontSize: 13, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  card:       { backgroundColor: C.white, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 4,
    marginBottom: 24 },
  cardTitle:  { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  cardSub:    { fontSize: 14, color: C.textMuted, marginBottom: 24 },
  fieldWrap:  { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.text, backgroundColor: '#fafbff' },
  btn:        { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnText:    { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint:       { backgroundColor: C.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.borderLight, marginBottom: 24 },
  hintTitle:  { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  hintRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  hintIcon:   { fontSize: 22 },
  hintRole:   { fontWeight: '700', fontSize: 14, color: C.text },
  hintDesc:   { fontSize: 12, color: C.textMuted },
  footer:     { textAlign: 'center', color: C.textMuted, fontSize: 12, marginBottom: 16 },
});
