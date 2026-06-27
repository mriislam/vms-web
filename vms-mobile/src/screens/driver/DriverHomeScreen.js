import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, RefreshControl, Platform, Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { driverApi } from '../../api/services';
import { useAuthStore } from '../../stores/authStore';
import { Card, StatusBadge, GradientHeader, Empty } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

const LOCATION_INTERVAL_MS = 15_000; // send GPS every 15 seconds while tracking is on

export default function DriverHomeScreen({ navigation }) {
  const [dispatches,   setDispatches]   = useState([]);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [tracking,     setTracking]     = useState(false);
  const [lastGeoEvent, setLastGeoEvent] = useState(null);
  const trackingRef = useRef(false);
  const intervalRef = useRef(null);
  const user = useAuthStore(s => s.user);

  // ── Data load ────────────────────────────────────────────────────────
  async function load() {
    try {
      const [discRes, profRes] = await Promise.all([
        driverApi.todayDispatches(),
        driverApi.me(),
      ]);
      setDispatches(discRes.data.data ?? []);
      setProfile(profRes.data.data);
    } catch { }
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  // ── GPS tracking loop ────────────────────────────────────────────────
  async function startTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required to auto-track your trips.');
      return;
    }
    trackingRef.current = true;
    setTracking(true);

    async function sendLocation() {
      if (!trackingRef.current) return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const res = await driverApi.updateLocation({
          lat:      loc.coords.latitude,
          lng:      loc.coords.longitude,
          speed:    loc.coords.speed != null ? loc.coords.speed * 3.6 : null, // m/s → km/h
          heading:  loc.coords.heading,
          accuracy: loc.coords.accuracy,
        });
        const event = res.data.data;
        if (event?.geofenceTriggered) {
          setLastGeoEvent(event);
          Alert.alert('Geofence Alert 📍', event.message ?? 'Trip status changed');
          load(); // refresh trip list
        }
      } catch { /* silently retry */ }
    }

    await sendLocation();
    intervalRef.current = setInterval(sendLocation, LOCATION_INTERVAL_MS);
  }

  function stopTracking() {
    trackingRef.current = false;
    setTracking(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  useEffect(() => { return () => stopTracking(); }, []);

  async function toggleTracking(val) {
    if (val) await startTracking();
    else stopTracking();
  }

  // ── Manual start / end ────────────────────────────────────────────────
  async function manualStart(d) {
    Alert.alert('Start Trip', `Start dispatch ${d.dispatchNo}?`, [
      { text: 'Cancel' },
      { text: 'Start', onPress: async () => {
        try { await driverApi.startDispatch(d.id); load(); }
        catch (e) { Alert.alert('Error', e.response?.data?.message ?? 'Failed'); }
      }},
    ]);
  }

  async function manualEnd(d) {
    Alert.alert('End Trip', `Mark dispatch ${d.dispatchNo} as completed?`, [
      { text: 'Cancel' },
      { text: 'End Trip', style: 'destructive', onPress: async () => {
        try { await driverApi.endDispatch(d.id, {}); load(); }
        catch (e) { Alert.alert('Error', e.response?.data?.message ?? 'Failed'); }
      }},
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function renderDispatch({ item: d }) {
    const isActive = d.status === 'in_progress';
    const canStart = d.status === 'approved' || d.status === 'pending';
    const border   = isActive ? C.primary : C.statusColor(d.status);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('DispatchDetail', { id: d.id })}
        style={[s.card, { borderLeftColor: border, borderLeftWidth: 4 }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View>
            <Text style={s.dispatchNo}>{d.dispatchNo}</Text>
            {d.date && <Text style={s.dateText}>{dayjs(d.date).format('DD MMM YYYY')}</Text>}
          </View>
          <StatusBadge status={d.status} />
        </View>

        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dotA} />
            <Text style={[s.locText, { color: C.primary }]} numberOfLines={1}>{d.origin}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dotB} />
            <Text style={[s.locText, { color: C.emerald }]} numberOfLines={1}>{d.destination}</Text>
          </View>
        </View>

        {d.purpose && <Text style={s.purpose} numberOfLines={1}>{d.purpose}</Text>}

        <View style={s.actions}>
          {canStart && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.emerald }]} onPress={() => manualStart(d)}>
              <Text style={s.actionBtnText}>▶ Start Trip</Text>
            </TouchableOpacity>
          )}
          {isActive && (
            <>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate('ActiveTrip', { id: d.id })}>
                <Text style={s.actionBtnText}>🗺 Live Map</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.rose }]} onPress={() => manualEnd(d)}>
                <Text style={s.actionBtnText}>■ End Trip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  const todaySummary = profile?.tripStats;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GradientHeader
        title={`Hello, ${user?.fullName?.split(' ')[0] ?? 'Driver'} 👋`}
        subtitle="Today's trip schedule"
        color1="#0891b2" color2="#6366f1"
      />

      {/* GPS tracking toggle */}
      <View style={s.trackingBar}>
        <View>
          <Text style={s.trackingTitle}>{tracking ? '🟢 GPS Tracking Active' : '⚪ GPS Tracking Off'}</Text>
          <Text style={s.trackingDesc}>{tracking ? 'Auto-starts/ends trips based on location' : 'Turn on to enable geofence auto-detection'}</Text>
        </View>
        <Switch
          value={tracking}
          onValueChange={toggleTracking}
          trackColor={{ true: C.emerald, false: C.border }}
          thumbColor={tracking ? '#fff' : C.textMuted}
        />
      </View>

      {/* Last geofence event */}
      {lastGeoEvent?.geofenceTriggered && (
        <View style={[s.eventBanner, { backgroundColor: lastGeoEvent.geofenceEvent === 'TRIP_COMPLETED' ? C.emeraldBg : C.primaryBg }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: lastGeoEvent.geofenceEvent === 'TRIP_COMPLETED' ? C.emerald : C.primary }}>
            {lastGeoEvent.geofenceEvent === 'TRIP_STARTED' ? '▶ Trip auto-started' :
             lastGeoEvent.geofenceEvent === 'TRIP_COMPLETED' ? '✓ Trip auto-completed' :
             '📍 Approaching destination'}
          </Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{lastGeoEvent.message}</Text>
        </View>
      )}

      {/* Stats row */}
      {todaySummary && (
        <View style={s.statsRow}>
          {[
            { label: 'Approved', value: todaySummary.approved, color: C.emerald },
            { label: 'Active',   value: todaySummary.inProgress, color: C.primary },
            { label: 'Done',     value: todaySummary.completed, color: C.textMuted },
          ].map(st => (
            <View key={st.label} style={s.statCell}>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.sectionLabel}>Today's Dispatches</Text>

      <FlatList
        data={dispatches}
        keyExtractor={i => String(i.id)}
        renderItem={renderDispatch}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={!loading && (
          <Empty icon="🚗" title="No trips today" subtitle="Your approved trips will appear here" />
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  trackingBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.white, padding: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: C.borderLight },
  trackingTitle:{ fontSize: 14, fontWeight: '700', color: C.text },
  trackingDesc: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  eventBanner:  { margin: 12, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.borderLight },
  statsRow:     { flexDirection: 'row', backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.borderLight },
  statCell:     { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue:    { fontSize: 22, fontWeight: '900' },
  statLabel:    { fontSize: 11, color: C.textMuted, marginTop: 2, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  card:         { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  dispatchNo:   { fontWeight: '800', fontSize: 15, color: C.text },
  dateText:     { fontSize: 12, color: C.textMuted, marginTop: 1 },
  dotA:         { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  dotB:         { width: 9, height: 9, borderRadius: 2, backgroundColor: C.emerald },
  locText:      { fontSize: 13, flex: 1, fontWeight: '500' },
  purpose:      { fontSize: 12, color: C.textMuted, marginTop: 8 },
  actions:      { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn:    { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  actionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
});
