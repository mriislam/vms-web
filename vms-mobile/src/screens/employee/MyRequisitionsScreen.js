import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, Alert, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { requisitionApi } from '../../api/services';
import { useAuthStore } from '../../stores/authStore';
import { Card, StatusBadge, Empty, GradientHeader } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function MyRequisitionsScreen({ navigation }) {
  const [data,       setData]       = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [tab,        setTab]        = useState('all');
  const user = useAuthStore(s => s.user);

  const tabs = ['all', 'pending', 'approved', 'in_progress', 'completed'];

  async function load() {
    try {
      const res  = await requisitionApi.getAll();
      const all  = (res.data.data ?? []).filter(r => r.requestedBy === user?.fullName);
      setData(all.reverse());
    } catch { }
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  function applyFilter(list = data, q = search, t = tab) {
    let out = list;
    if (t !== 'all') out = out.filter(r => r.status === t);
    if (q.trim()) {
      const lq = q.toLowerCase();
      out = out.filter(r =>
        r.reqNo?.toLowerCase().includes(lq) ||
        r.purpose?.toLowerCase().includes(lq) ||
        r.fromLocation?.toLowerCase().includes(lq) ||
        r.toLocation?.toLowerCase().includes(lq));
    }
    setFiltered(out);
  }

  React.useEffect(() => { applyFilter(data, search, tab); }, [data, search, tab]);

  function onSearch(q) { setSearch(q); applyFilter(data, q, tab); }
  function onTab(t)    { setTab(t);    applyFilter(data, search, t); }

  async function cancel(r) {
    Alert.alert('Cancel Booking', `Cancel ${r.reqNo}?`, [
      { text: 'No' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await requisitionApi.remove(r.id); load(); }
        catch { Alert.alert('Error', 'Could not cancel this booking.'); }
      }},
    ]);
  }

  function renderItem({ item: r }) {
    return (
      <Card onPress={() => navigation.navigate('RequisitionDetail', { id: r.id })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={s.reqNo}>{r.reqNo}</Text>
          <StatusBadge status={r.status} />
        </View>
        <Text style={s.purpose} numberOfLines={1}>{r.purpose}</Text>
        <View style={s.route}>
          <View style={s.routeDot} />
          <Text style={[s.routeText, { color: C.primary }]} numberOfLines={1}>{r.fromLocation ?? 'From not set'}</Text>
        </View>
        <View style={[s.route, { marginTop: 4 }]}>
          <View style={[s.routeDot, { backgroundColor: C.emerald, borderRadius: 2 }]} />
          <Text style={[s.routeText, { color: C.emerald }]} numberOfLines={1}>{r.toLocation ?? 'To not set'}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.metaText}>📅 {r.fromDatetime ? dayjs(r.fromDatetime).format('DD MMM YYYY HH:mm') : dayjs(r.date).format('DD MMM YYYY')}</Text>
          <Text style={s.metaText}>👥 {r.passengers ?? 1} pax</Text>
          {r.distanceKm && <Text style={s.metaText}>📍 {r.distanceKm} km</Text>}
        </View>
        {r.status === 'pending' && (
          <TouchableOpacity onPress={() => cancel(r)} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancel Request</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GradientHeader title="My Bookings" subtitle={`${filtered.length} requisitions`} />

      {/* Search */}
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by purpose, location…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={onSearch}
        />
      </View>

      {/* Status tabs */}
      <View style={s.tabs}>
        {tabs.map(t => (
          <TouchableOpacity key={t} onPress={() => onTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={!loading && <Empty icon="📋" title="No bookings" subtitle="Tap + to make a new vehicle request" />}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NewRequisition')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  searchBar:     { backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  searchInput:   { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: C.text },
  tabs:          { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  tab:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 4 },
  tabActive:     { backgroundColor: C.primaryBg },
  tabText:       { fontSize: 12, color: C.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  tabTextActive: { color: C.primary },
  reqNo:         { fontWeight: '800', fontSize: 14, color: C.primary },
  purpose:       { fontSize: 14, color: C.text, marginBottom: 10, fontWeight: '500' },
  route:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot:      { width: 9, height: 9, borderRadius: 99, backgroundColor: C.primary },
  routeText:     { fontSize: 13, flex: 1 },
  meta:          { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  metaText:      { fontSize: 12, color: C.textMuted },
  cancelBtn:     { marginTop: 10, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: C.rose, borderRadius: 10 },
  cancelText:    { color: C.rose, fontWeight: '700', fontSize: 13 },
  fab:           { position: 'absolute', bottom: 28, right: 24, width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 8 },
  fabText:       { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 34 },
});
