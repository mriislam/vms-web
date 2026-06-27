import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform,
} from 'react-native';
import { C } from '../utils/colors';

// ── Button ─────────────────────────────────────────────────────────────────
export function Btn({ label, onPress, color = C.primary, loading, outline, small, disabled, icon }) {
  const bg      = outline ? 'transparent' : (disabled ? '#cbd5e1' : color);
  const border  = outline ? color : 'transparent';
  const textClr = outline ? color : '#fff';
  const pad     = small ? { paddingHorizontal: 16, paddingVertical: 8 } : { paddingHorizontal: 22, paddingVertical: 13 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.82}
      style={[{
        backgroundColor: bg,
        borderWidth: 1.5, borderColor: border,
        borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        ...pad,
      }]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? color : '#fff'} size="small" />
      ) : (
        <>
          {icon && icon}
          <Text style={{ color: textClr, fontWeight: '700', fontSize: small ? 13 : 15 }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      style={[{
        backgroundColor: C.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: C.borderLight,
        shadowColor: '#6366f1', shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
        elevation: 3,
      }, style]}
    >
      {children}
    </Wrapper>
  );
}

// ── StatusBadge ────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ').toUpperCase() ?? 'UNKNOWN';
  return (
    <View style={{
      backgroundColor: C.statusBg(status),
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color: C.statusColor(status), fontWeight: '700', fontSize: 11 }}>{label}</Text>
    </View>
  );
}

// ── SectionHeader ──────────────────────────────────────────────────────────
export function SectionHeader({ title, color = C.primary, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
      <View style={{ width: 4, height: 18, borderRadius: 3, backgroundColor: color, marginRight: 8 }} />
      <Text style={{ fontSize: 13, fontWeight: '800', color, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

// ── InfoRow ────────────────────────────────────────────────────────────────
export function InfoRow({ label, value, color }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7,
      borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
      <Text style={{ color: C.textMuted, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: color ?? C.text, fontWeight: '600', fontSize: 13, flex: 1, textAlign: 'right' }}>{value ?? '—'}</Text>
    </View>
  );
}

// ── Empty ──────────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', title = 'No data', subtitle }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>{subtitle}</Text>}
    </View>
  );
}

// ── FormInput ──────────────────────────────────────────────────────────────
export function FormInput({ label, required, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 }}>
          {label}{required && <Text style={{ color: C.rose }}> *</Text>}
        </Text>
      )}
      {children}
    </View>
  );
}

// ── TextInput styled ───────────────────────────────────────────────────────
import { TextInput as RNTextInput } from 'react-native';
export function Input({ style, multiline, numberOfLines, ...props }) {
  return (
    <RNTextInput
      placeholderTextColor={C.textMuted}
      style={[{
        borderWidth: 1.5, borderColor: C.border,
        borderRadius: 12, paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 13,
        fontSize: 14, color: C.text,
        backgroundColor: '#fafbff',
        textAlignVertical: multiline ? 'top' : 'center',
      }, style]}
      multiline={multiline}
      numberOfLines={numberOfLines}
      {...props}
    />
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
export function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={{
      backgroundColor: C.white,
      paddingTop: Platform.OS === 'ios' ? 54 : 16,
      paddingBottom: 14, paddingHorizontal: 20,
      borderBottomWidth: 1, borderBottomColor: C.borderLight,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: C.primary }}>←</Text>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

// ── GradientHeader ─────────────────────────────────────────────────────────
export function GradientHeader({ title, subtitle, color1 = C.primary, color2 = '#8b5cf6', right }) {
  return (
    <View style={{
      paddingTop: Platform.OS === 'ios' ? 58 : 20,
      paddingBottom: 20, paddingHorizontal: 24,
      backgroundColor: color1,
      flexDirection: 'row', alignItems: 'center',
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
