import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { C } from '../utils/colors';

const ROLE_COLOR = { admin: C.rose, manager: C.amber, operator: C.primary, driver: C.cyan, viewer: C.textMuted };

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const role  = user?.role ?? 'operator';
  const color = ROLE_COLOR[role] ?? C.primary;

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      {/* Avatar */}
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={[s.avatar, { backgroundColor: color + '20', borderColor: color }]}>
          <Text style={{ fontSize: 36, fontWeight: '800', color }}>{(user?.fullName ?? user?.username ?? '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{user?.fullName ?? user?.username}</Text>
        <View style={[s.roleBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
          <Text style={[s.roleText, { color }]}>{role.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={s.card}>
        {[
          { label: 'Username',   value: user?.username },
          { label: 'Email',      value: user?.email },
          { label: 'Phone',      value: user?.phone },
          { label: 'Department', value: user?.department },
          { label: 'Role',       value: role },
        ].map(r => (
          <View key={r.label} style={s.row}>
            <Text style={s.rowLabel}>{r.label}</Text>
            <Text style={s.rowValue}>{r.value ?? '—'}</Text>
          </View>
        ))}
      </View>

      {/* App info */}
      <View style={s.card}>
        <View style={s.row}><Text style={s.rowLabel}>Server</Text><Text style={s.rowValue}>demo-vms.nexdecade.com</Text></View>
        <View style={s.row}><Text style={s.rowLabel}>Version</Text><Text style={s.rowValue}>1.0.0</Text></View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  avatar:    { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name:      { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  roleText:  { fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  card:      { backgroundColor: C.white, borderRadius: 16, padding: 4, marginBottom: 14,
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: '#6366f1', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel:  { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  rowValue:  { fontSize: 13, color: C.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  logoutBtn: { backgroundColor: C.rose + '12', borderWidth: 1.5, borderColor: C.rose + '30',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  logoutText:{ color: C.rose, fontWeight: '800', fontSize: 16 },
});
