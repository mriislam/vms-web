import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { requisitionApi } from '../../api/services';
import { Card, StatusBadge, GradientHeader, Empty } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function AllTripsScreen() {
  const [data, setData] = useState([]);
  const [tab,  setTab]  = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await requisitionApi.getAll();
      setData((res.data.data ?? []).reverse());
    } catch { }
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = tab === 'all' ? data : data.filter(r => r.status === tab);
  const tabs = ['all','pending','approved','in_progress','completed','rejected'];

  function renderItem({ item: r }) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <View>
            <Text style={s.reqNo}>{r.reqNo}</Text>
            <Text style={s.who}>{r.requestedBy} · {r.department}</Text>
          </View>
          <StatusBadge status={r.status} />
        </View>
        <Text style={s.purpose} numberOfLines={1}>{r.purpose}</Text>
        <View style={s.meta}>
          <Text style={s.metaText}>📅 {dayjs(r.fromDatetime ?? r.date).format('DD MMM YY')}</Text>
          <Text style={s.metaText}>👥 {r.passengers ?? 1}</Text>
          {r.distanceKm && <Text style={s.metaText}>📍 {r.distanceKm} km</Text>}
          {r.approvedBy && <Text style={s.metaText}>✓ {r.approvedBy}</Text>}
        </View>
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GradientHeader title="All Requisitions" subtitle={`${filtered.length} total`} color1="#374151" color2="#1e293b" />
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
        ListEmptyComponent={<Empty icon="📋" title="No requisitions" />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  tabs:         { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.white,
    padding: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight, gap: 4 },
  tab:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  tabActive:    { backgroundColor: C.primaryBg },
  tabText:      { fontSize: 12, color: C.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  tabTextActive:{ color: C.primary },
  reqNo:        { fontWeight: '800', fontSize: 14, color: C.primary },
  who:          { fontSize: 12, color: C.textMuted, marginTop: 1 },
  purpose:      { fontSize: 13, color: C.textSub, marginBottom: 8 },
  meta:         { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText:     { fontSize: 12, color: C.textMuted },
});
