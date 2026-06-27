import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, RefreshControl, Modal, ScrollView, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { requisitionApi, dispatchApi, lookupApi } from '../../api/services';
import { useAuthStore } from '../../stores/authStore';
import { Card, StatusBadge, Btn, SectionHeader, InfoRow, GradientHeader, Empty } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function PendingApprovalsScreen({ navigation }) {
  const [pending,    setPending]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState(null);  // requisition being actioned
  const [vehicles,   setVehicles]   = useState([]);
  const [drivers,    setDrivers]    = useState([]);
  const [vehicle,    setVehicle]    = useState('');
  const [driver,     setDriver]     = useState('');
  const [approving,  setApproving]  = useState(false);
  const [showApprove,setShowApprove]= useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [editFrom,   setEditFrom]   = useState('');
  const [editTo,     setEditTo]     = useState('');
  const [editRemark, setEditRemark] = useState('');
  const user = useAuthStore(s => s.user);

  async function load() {
    try {
      const [reqRes, vRes, dRes] = await Promise.all([
        requisitionApi.getAll(),
        lookupApi.vehicles(),
        lookupApi.drivers(),
      ]);
      const all = reqRes.data.data ?? [];
      setPending(all.filter(r => r.status === 'pending').reverse());
      setVehicles((vRes.data.data ?? []).filter(v => v.status === 'active'));
      setDrivers(dRes.data.data ?? []);
    } catch { }
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

  function openApprove(r) {
    setSelected(r);
    setVehicle('');
    setDriver('');
    setShowApprove(true);
  }

  function openEdit(r) {
    setSelected(r);
    setEditFrom(r.fromLocation ?? '');
    setEditTo(r.toLocation ?? '');
    setEditRemark(r.remarks ?? '');
    setShowEdit(true);
  }

  async function handleApprove() {
    if (!vehicle) return Alert.alert('Required', 'Please select a vehicle');
    if (!driver)  return Alert.alert('Required', 'Please select a driver');
    setApproving(true);
    try {
      // 1. Mark requisition as approved
      await requisitionApi.setStatus(selected.id, {
        status: 'approved',
        approvedBy: user?.fullName ?? 'Admin',
      });
      // 2. Create dispatch record
      await dispatchApi.create({
        vehicleReg:  vehicle,
        driverName:  driver,
        origin:      (selected.fromLocation ?? 'N/A').slice(0, 100),
        destination: (selected.toLocation   ?? 'N/A').slice(0, 100),
        date:        selected.date ?? selected.fromDate ?? dayjs().format('YYYY-MM-DD'),
        startTime:   selected.fromDatetime ?? null,
        distance:    selected.distanceKm ?? null,
        purpose:     selected.purpose,
        approvedBy:  user?.fullName ?? 'Admin',
        status:      'approved',
      });
      setShowApprove(false);
      Alert.alert('Approved ✓', 'Vehicle assigned and trip dispatch created.');
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Approval failed');
    } finally { setApproving(false); }
  }

  async function handleReject(r) {
    Alert.alert('Reject Request', `Reject ${r.reqNo}?`, [
      { text: 'Cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await requisitionApi.setStatus(r.id, { status: 'rejected', approvedBy: user?.fullName ?? 'Admin' });
          load();
        } catch { Alert.alert('Error', 'Could not reject request'); }
      }},
    ]);
  }

  async function handleSaveEdit() {
    try {
      await requisitionApi.update(selected.id, {
        ...selected,
        fromLocation: editFrom,
        toLocation:   editTo,
        remarks:      editRemark,
      });
      setShowEdit(false);
      Alert.alert('Saved', 'Request updated.');
      load();
    } catch { Alert.alert('Error', 'Could not save changes'); }
  }

  function renderItem({ item: r }) {
    const priorityClr = r.priority === 'urgent' ? C.rose : r.priority === 'high' ? C.amber : C.emerald;
    return (
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={s.reqNo}>{r.reqNo}</Text>
            <Text style={s.name}>{r.requestedBy}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[s.priorityBadge, { backgroundColor: priorityClr + '18', borderColor: priorityClr + '40' }]}>
              <Text style={[s.priorityText, { color: priorityClr }]}>{r.priority?.toUpperCase()}</Text>
            </View>
            {r.department && <Text style={s.dept}>{r.department}</Text>}
          </View>
        </View>

        <Text style={s.purpose} numberOfLines={2}>{r.purpose}</Text>

        <View style={{ gap: 4, marginVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dotA} /><Text style={[s.locText, { color: C.primary }]} numberOfLines={1}>{r.fromLocation ?? '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dotB} /><Text style={[s.locText, { color: C.emerald }]} numberOfLines={1}>{r.toLocation ?? '—'}</Text>
          </View>
        </View>

        <View style={s.meta}>
          <Text style={s.metaText}>📅 {dayjs(r.fromDatetime ?? r.date).format('DD MMM YY HH:mm')}</Text>
          <Text style={s.metaText}>👥 {r.passengers ?? 1} pax</Text>
          {r.distanceKm && <Text style={s.metaText}>📍 {r.distanceKm} km</Text>}
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: C.rose }]} onPress={() => handleReject(r)}>
            <Text style={{ color: C.rose, fontWeight: '700', fontSize: 13 }}>✕ Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: C.amber }]} onPress={() => openEdit(r)}>
            <Text style={{ color: C.amber, fontWeight: '700', fontSize: 13 }}>✎ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.emerald, borderColor: C.emerald, flex: 1 }]} onPress={() => openApprove(r)}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✓ Approve</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GradientHeader
        title="Pending Approvals"
        subtitle={`${pending.length} requests waiting`}
        color1="#059669" color2="#0891b2"
      />

      <FlatList
        data={pending}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={!loading && <Empty icon="✅" title="All clear!" subtitle="No pending approvals right now." />}
      />

      {/* ─── APPROVE MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showApprove} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Approve — {selected?.reqNo}</Text>
              <TouchableOpacity onPress={() => setShowApprove(false)}>
                <Text style={{ fontSize: 24, color: C.textMuted }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Trip summary */}
              <View style={s.summaryCard}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={s.dotA} /><View style={s.lineSm} /><View style={s.dotB} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{selected?.fromLocation}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 8 }}>Pickup</Text>
                    <Text style={{ color: C.emerald, fontWeight: '700', fontSize: 13 }}>{selected?.toLocation}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>Destination</Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={s.metaText}>📅 {selected?.date ? dayjs(selected.date).format('DD MMM') : '—'}</Text>
                    <Text style={s.metaText}>👥 {selected?.passengers ?? 1}</Text>
                    {selected?.distanceKm && <Text style={s.metaText}>📍 {selected.distanceKm} km</Text>}
                  </View>
                </View>
              </View>

              <SectionHeader title="Assign Vehicle" color={C.cyan} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {vehicles.map(v => (
                  <TouchableOpacity key={v.id} onPress={() => setVehicle(v.regNo)}
                    style={[s.selectCard, vehicle === v.regNo && s.selectCardActive]}>
                    <Text style={s.selectCardTitle}>{v.regNo}</Text>
                    <Text style={s.selectCardSub}>{v.make} {v.model}</Text>
                    <Text style={s.selectCardSub}>{v.fuelType}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <SectionHeader title="Assign Driver" color={C.violet} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {drivers.filter(d => d.status === 'active').map(d => (
                  <TouchableOpacity key={d.id} onPress={() => setDriver(d.name)}
                    style={[s.selectCard, driver === d.name && s.selectCardActive]}>
                    <View style={[s.avatar, { backgroundColor: C.violet + '22' }]}>
                      <Text style={{ color: C.violet, fontWeight: '800', fontSize: 16 }}>{d.name[0]}</Text>
                    </View>
                    <Text style={s.selectCardTitle}>{d.name}</Text>
                    <Text style={s.selectCardSub}>{d.licenseNo}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={s.modalFooter}>
              <Btn label="Cancel" onPress={() => setShowApprove(false)} outline color={C.textMuted} />
              <View style={{ flex: 1 }}>
                <Btn label="Approve & Dispatch" onPress={handleApprove} loading={approving} color={C.emerald} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT MODAL ────────────────────────────────────────────────── */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Request — {selected?.reqNo}</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Text style={{ fontSize: 24, color: C.textMuted }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={s.editLabel}>Pickup Location (From)</Text>
              <TextInput style={s.editInput} value={editFrom} onChangeText={setEditFrom} placeholder="Update pickup…" />
              <Text style={s.editLabel}>Destination (To)</Text>
              <TextInput style={s.editInput} value={editTo} onChangeText={setEditTo} placeholder="Update destination…" />
              <Text style={s.editLabel}>Remarks / Instructions</Text>
              <TextInput style={[s.editInput, { height: 80 }]} value={editRemark} onChangeText={setEditRemark}
                placeholder="Add or update instructions…" multiline textAlignVertical="top" />
            </ScrollView>
            <View style={s.modalFooter}>
              <Btn label="Cancel" onPress={() => setShowEdit(false)} outline color={C.textMuted} />
              <View style={{ flex: 1 }}>
                <Btn label="Save Changes" onPress={handleSaveEdit} color={C.primary} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  reqNo:          { fontWeight: '800', fontSize: 15, color: C.primary },
  name:           { fontSize: 13, color: C.textSub, marginTop: 2 },
  dept:           { fontSize: 11, color: C.textMuted, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  priorityText:   { fontSize: 11, fontWeight: '700' },
  purpose:        { fontSize: 14, color: C.text, marginBottom: 8 },
  dotA:           { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  dotB:           { width: 10, height: 10, borderRadius: 2, backgroundColor: C.emerald },
  lineSm:         { width: 2, height: 24, backgroundColor: C.primary, opacity: 0.3, marginVertical: 3 },
  locText:        { fontSize: 13, flex: 1, fontWeight: '500' },
  meta:           { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  metaText:       { fontSize: 12, color: C.textMuted },
  actions:        { flexDirection: 'row', gap: 8 },
  actionBtn:      { flex: 0.9, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  modalTitle:     { fontSize: 16, fontWeight: '800', color: C.text },
  modalFooter:    { flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: C.borderLight },
  summaryCard:    { backgroundColor: C.bg, borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: C.borderLight },
  selectCard:     { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14,
    marginRight: 10, width: 140, alignItems: 'center', backgroundColor: '#fafbff' },
  selectCardActive:{ borderColor: C.primary, backgroundColor: C.primaryBg },
  selectCardTitle: { fontWeight: '700', fontSize: 13, color: C.text, textAlign: 'center', marginTop: 4 },
  selectCardSub:   { fontSize: 11, color: C.textMuted, textAlign: 'center' },
  avatar:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  editLabel:      { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6, marginTop: 12 },
  editInput:      { borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, backgroundColor: '#fafbff' },
});
