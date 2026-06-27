import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Alert } from 'react-native';
import { requisitionApi } from '../../api/services';
import { ScreenHeader, Card, StatusBadge, InfoRow, SectionHeader, Btn } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function RequisitionDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requisitionApi.getById(id)
      .then(r => { setData(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading || !data) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.textMuted }}>Loading…</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={data.reqNo} subtitle="Booking Details" onBack={() => navigation.goBack()}
        right={<StatusBadge status={data.status} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        <Card>
          <SectionHeader title="Trip Information" color={C.primary} />
          <InfoRow label="Requested By" value={data.requestedBy} />
          <InfoRow label="Department"   value={data.department} />
          <InfoRow label="Purpose"      value={data.purpose} />
          <InfoRow label="Priority"     value={data.priority?.toUpperCase()} color={data.priority === 'urgent' ? C.rose : data.priority === 'high' ? C.amber : C.emerald} />
          <InfoRow label="Passengers"   value={data.passengers ?? 1} />
        </Card>

        <Card>
          <SectionHeader title="Route" color={C.cyan} />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <View style={s.dotA} /><View style={s.line} /><View style={s.dotB} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>Pickup</Text>
              <Text style={[s.routeAddr, { color: C.primary }]}>{data.fromLocation ?? 'Not set'}</Text>
              {data.fromLat && <Text style={s.coords}>{data.fromLat?.toFixed(5)}, {data.fromLng?.toFixed(5)}</Text>}
              <View style={{ height: 20 }} />
              <Text style={s.routeLabel}>Destination</Text>
              <Text style={[s.routeAddr, { color: C.emerald }]}>{data.toLocation ?? 'Not set'}</Text>
              {data.toLat && <Text style={s.coords}>{data.toLat?.toFixed(5)}, {data.toLng?.toFixed(5)}</Text>}
            </View>
          </View>
          {data.distanceKm && (
            <View style={s.distBadge}>
              <Text style={s.distText}>📍 {data.distanceKm} km route distance</Text>
            </View>
          )}
        </Card>

        <Card>
          <SectionHeader title="Schedule" color={C.violet} />
          <InfoRow label="Request Date"  value={dayjs(data.date).format('DD MMM YYYY')} />
          <InfoRow label="Departure"     value={data.fromDatetime ? dayjs(data.fromDatetime).format('DD MMM YYYY HH:mm') : '—'} />
          <InfoRow label="Return"        value={data.toDatetime   ? dayjs(data.toDatetime).format('DD MMM YYYY HH:mm') : '—'} />
          <InfoRow label="Geofence"      value={`${data.geofenceRadiusM ?? 500} m radius`} />
        </Card>

        {data.approvedBy && (
          <Card>
            <SectionHeader title="Approval" color={C.emerald} />
            <InfoRow label="Approved By" value={data.approvedBy} color={C.emerald} />
            <InfoRow label="Vehicle"     value={data.vehicleReg ?? 'Not assigned'} />
          </Card>
        )}

        {data.remarks && (
          <Card>
            <SectionHeader title="Notes" color={C.pink} />
            <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{data.remarks}</Text>
          </Card>
        )}

        {data.status === 'pending' && (
          <Btn label="Cancel Request" outline color={C.rose}
            onPress={() => Alert.alert('Cancel', 'Cancel this request?', [
              { text: 'No' },
              { text: 'Yes', style: 'destructive', onPress: async () => {
                await requisitionApi.remove(id);
                navigation.goBack();
              }},
            ])} />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  dotA:      { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary, borderWidth: 2, borderColor: C.primaryBg },
  dotB:      { width: 11, height: 11, borderRadius: 3, backgroundColor: C.emerald, borderWidth: 2, borderColor: C.emeraldBg },
  line:      { width: 2, flex: 1, minHeight: 36, backgroundColor: C.primary, opacity: 0.25, marginVertical: 4 },
  routeLabel:{ fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeAddr: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  coords:    { fontSize: 11, color: C.textMuted, marginTop: 2 },
  distBadge: { marginTop: 14, backgroundColor: C.primaryBg, borderRadius: 10, padding: 10, alignItems: 'center' },
  distText:  { color: C.primary, fontWeight: '700', fontSize: 14 },
});
