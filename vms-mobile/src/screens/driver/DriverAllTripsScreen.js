import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { driverApi } from '../../api/services';
import { Card, StatusBadge, GradientHeader, Empty } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function DriverAllTripsScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [tab,  setTab]  = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await driverApi.myDispatches();
      setData((res.data.data ?? []).reverse());
    } catch { }
    setRefreshing(false);
  }
  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = tab === 'all' ? data : data.filter(d => d.status === tab);
  const tabs = ['all','approved','in_progress','completed'];

  function renderItem({ item: d }) {
    const isActive = d.status === 'in_progress';
    return (
      <Card onPress={() => navigation.navigate('DispatchDetail', { id: d.id })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={s.no}>{d.dispatchNo}</Text>
          <StatusBadge status={d.status} />
        </View>
        <View style={{ gap: 3, marginBottom: 8 }}>
          <Text style={[s.loc, { color: C.primary }]} numberOfLines={1}>▲ {d.origin}</Text>
          <Text style={[s.loc, { color: C.emerald }]} numberOfLines={1}>▼ {d.destination}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.metaText}>📅 {dayjs(d.date).format('DD MMM YY')}</Text>
          {d.distance && <Text style={s.metaText}>📍 {d.distance} km</Text>}
          {d.fuelUsed && <Text style={s.metaText}>⛽ {d.fuelUsed} L</Text>}
        </View>
        {isActive && (
          <Text onPress={() => navigation.navigate('ActiveTrip', { id: d.id })}
            style={s.activeLink}>🗺 View Live Map →</Text>
        )}
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GradientHeader title="All My Trips" subtitle={`${filtered.length} dispatches`} color1="#0891b2" color2="#6366f1" />
      <View style={s.tabs}>
        {tabs.map(t => (
          <View key={t} style={[s.tab, tab === t && s.tabActive]}>
            <Text onPress={() => setTab(t)} style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.replace('_', ' ')}
            </Text>
          </View>
        ))}
      </View>
      <FlatList
        data={filtered} keyExtractor={i => String(i.id)} renderItem={renderItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Empty icon="🚗" title="No dispatches" />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  tabs:         { flexDirection: 'row', backgroundColor: C.white, padding: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: C.borderLight },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tabActive:    { backgroundColor: 'rgba(6,182,212,0.1)' },
  tabText:      { fontSize: 12, color: C.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  tabTextActive:{ color: C.cyan },
  no:           { fontWeight: '800', fontSize: 15, color: C.text },
  loc:          { fontSize: 13, fontWeight: '500' },
  meta:         { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText:     { fontSize: 12, color: C.textMuted },
  activeLink:   { marginTop: 8, color: C.primary, fontWeight: '700', fontSize: 13 },
});
