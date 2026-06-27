import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Alert, StyleSheet } from 'react-native';
import { driverApi } from '../../api/services';
import { ScreenHeader, Card, StatusBadge, InfoRow, SectionHeader, Btn } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function DispatchDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [dispatch, setDispatch] = useState(null);
  const [starting, setStarting] = useState(false);
  const [ending,   setEnding]   = useState(false);

  useEffect(() => {
    driverApi.dispatchDetail(id).then(r => setDispatch(r.data.data)).catch(() => {});
  }, [id]);

  async function start() {
    setStarting(true);
    try {
      await driverApi.startDispatch(id);
      Alert.alert('Trip Started ▶', 'Your trip is now in progress.', [
        { text: 'Open Live Map', onPress: () => navigation.replace('ActiveTrip', { id }) },
        { text: 'OK' },
      ]);
      driverApi.dispatchDetail(id).then(r => setDispatch(r.data.data));
    } catch (e) { Alert.alert('Error', e.response?.data?.message ?? 'Failed'); }
    finally { setStarting(false); }
  }

  async function end() {
    Alert.alert('End Trip', 'Mark as completed?', [
      { text: 'Cancel' },
      { text: 'Complete', style: 'destructive', onPress: async () => {
        setEnding(true);
        try {
          await driverApi.endDispatch(id, {});
          Alert.alert('Done!', 'Trip completed.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (e) { Alert.alert('Error', e.response?.data?.message ?? 'Failed'); }
        finally { setEnding(false); }
      }},
    ]);
  }

  if (!dispatch) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.textMuted }}>Loading…</Text>
    </View>
  );

  const canStart = ['approved','pending'].includes(dispatch.status);
  const isActive = dispatch.status === 'in_progress';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader
        title={dispatch.dispatchNo}
        subtitle="Dispatch Details"
        onBack={() => navigation.goBack()}
        right={<StatusBadge status={dispatch.status} />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Card>
          <SectionHeader title="Route" color={C.cyan} />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center' }}>
              <View style={s.dotA} /><View style={s.line} /><View style={s.dotB} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>Origin</Text>
              <Text style={[s.routeAddr, { color: C.primary }]}>{dispatch.origin}</Text>
              <View style={{ height: 18 }} />
              <Text style={s.routeLabel}>Destination</Text>
              <Text style={[s.routeAddr, { color: C.emerald }]}>{dispatch.destination}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Trip Info" color={C.primary} />
          <InfoRow label="Vehicle"     value={dispatch.vehicleReg} color={C.cyan} />
          <InfoRow label="Driver"      value={dispatch.driverName} />
          <InfoRow label="Date"        value={dayjs(dispatch.date).format('DD MMM YYYY')} />
          <InfoRow label="Purpose"     value={dispatch.purpose} />
          <InfoRow label="Approved By" value={dispatch.approvedBy ?? '—'} />
          {dispatch.distance && <InfoRow label="Distance" value={`${dispatch.distance} km`} color={C.primary} />}
          {dispatch.fuelUsed && <InfoRow label="Fuel Used" value={`${dispatch.fuelUsed} L`} color={C.amber} />}
        </Card>

        {(dispatch.startTime || dispatch.endTime) && (
          <Card>
            <SectionHeader title="Timing" color={C.violet} />
            <InfoRow label="Started" value={dispatch.startTime ? dayjs(dispatch.startTime).format('DD MMM HH:mm') : '—'} />
            <InfoRow label="Ended"   value={dispatch.endTime   ? dayjs(dispatch.endTime).format('DD MMM HH:mm') : '—'} />
          </Card>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={s.footer}>
        {canStart && (
          <View style={{ flex: 1 }}>
            <Btn label="▶  Start Trip" onPress={start} loading={starting} color={C.emerald} />
          </View>
        )}
        {isActive && (
          <>
            <View style={{ flex: 1 }}>
              <Btn label="🗺  Live Map" onPress={() => navigation.navigate('ActiveTrip', { id })} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn label="■  End Trip" onPress={end} loading={ending} color={C.rose} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dotA:       { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary, borderWidth: 2, borderColor: C.primaryBg },
  dotB:       { width: 11, height: 11, borderRadius: 3, backgroundColor: C.emerald, borderWidth: 2, borderColor: C.emeraldBg },
  line:       { width: 2, flex: 1, minHeight: 30, backgroundColor: C.primary, opacity: 0.25, marginVertical: 4 },
  routeLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeAddr:  { fontSize: 15, fontWeight: '700', marginTop: 2 },
  footer:     { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.borderLight },
});
