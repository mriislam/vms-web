import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { requisitionApi } from '../../api/services';
import { useAuthStore } from '../../stores/authStore';
import { Btn, FormInput, Input, ScreenHeader, SectionHeader } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

const DEPTS    = ['HQ','HR','Finance','Operations','IT','Admin','Logistics'];
const PRIORITY = [
  { value: 'normal', label: '🟢 Normal' },
  { value: 'high',   label: '🟠 High'   },
  { value: 'urgent', label: '🔴 Urgent' },
];

export default function NewRequisitionScreen({ navigation }) {
  const user = useAuthStore(s => s.user);

  const [form,     setForm]     = useState({
    requestedBy: user?.fullName ?? '',
    department:  user?.department ?? '',
    purpose:     '',
    priority:    'normal',
    fromLocation:'',
    toLocation:  '',
    passengers:  '1',
    remarks:     '',
  });
  const [depart,    setDepart]    = useState(null);
  const [returnDt,  setReturnDt]  = useState(null);
  const [showDep,   setShowDep]   = useState(false);
  const [showRet,   setShowRet]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function submit() {
    if (!form.purpose.trim())      return Alert.alert('Required', 'Purpose is required');
    if (!form.fromLocation.trim()) return Alert.alert('Required', 'Pickup location is required');
    if (!form.toLocation.trim())   return Alert.alert('Required', 'Destination is required');
    if (!depart)                   return Alert.alert('Required', 'Departure date & time is required');

    setSaving(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      await requisitionApi.create({
        requestedBy:  form.requestedBy,
        department:   form.department,
        purpose:      form.purpose,
        priority:     form.priority,
        fromLocation: form.fromLocation,
        toLocation:   form.toLocation,
        passengers:   parseInt(form.passengers) || 1,
        remarks:      form.remarks || null,
        date:         today,
        fromDate:     dayjs(depart).format('YYYY-MM-DD'),
        toDate:       returnDt ? dayjs(returnDt).format('YYYY-MM-DD') : dayjs(depart).format('YYYY-MM-DD'),
        fromDatetime: dayjs(depart).format('YYYY-MM-DDTHH:mm:ss'),
        toDatetime:   returnDt ? dayjs(returnDt).format('YYYY-MM-DDTHH:mm:ss') : null,
        status:       'pending',
        geofenceRadiusM: 500,
      });
      Alert.alert('Submitted!', 'Your vehicle request has been submitted for approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to submit request');
    } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="New Vehicle Request"
        subtitle="Fill in your trip details"
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>

        {/* WHO */}
        <SectionHeader title="Who is Travelling?" color={C.primary} />
        <FormInput label="Employee / Requester" required>
          <Input value={form.requestedBy} onChangeText={v => set('requestedBy', v)} placeholder="Your full name…" />
        </FormInput>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Department">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {DEPTS.map(d => (
                    <TouchableOpacity key={d} onPress={() => set('department', d)}
                      style={[s.chip, form.department === d && s.chipActive]}>
                      <Text style={[s.chipText, form.department === d && s.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </FormInput>
          </View>
        </View>

        <FormInput label="Purpose of Trip" required>
          <Input value={form.purpose} onChangeText={v => set('purpose', v)}
            placeholder="e.g. Site visit, Client meeting…" />
        </FormInput>

        <FormInput label="Priority">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {PRIORITY.map(p => (
              <TouchableOpacity key={p.value} onPress={() => set('priority', p.value)}
                style={[s.chip, form.priority === p.value && s.chipActive, { flex: 1, justifyContent: 'center' }]}>
                <Text style={[s.chipText, form.priority === p.value && s.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormInput>

        {/* WHERE */}
        <SectionHeader title="Where To?" color={C.cyan} />

        {/* Route connector visual */}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center', paddingTop: 36, width: 20 }}>
            <View style={s.dotA} />
            <View style={s.line} />
            <View style={s.dotB} />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Pickup Location (From)" required>
              <Input value={form.fromLocation} onChangeText={v => set('fromLocation', v)}
                placeholder="Enter pickup address…" />
            </FormInput>
            <FormInput label="Drop-off Destination (To)" required>
              <Input value={form.toLocation} onChangeText={v => set('toLocation', v)}
                placeholder="Enter destination address…" />
            </FormInput>
          </View>
        </View>

        <FormInput label="No. of Passengers">
          <Input value={form.passengers} onChangeText={v => set('passengers', v)}
            keyboardType="number-pad" placeholder="1" />
        </FormInput>

        {/* WHEN */}
        <SectionHeader title="When?" color={C.violet} />
        <FormInput label="Departure Date & Time" required>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowDep(true)}>
            <Text style={depart ? s.dateBtnText : s.dateBtnPlaceholder}>
              {depart ? dayjs(depart).format('DD MMM YYYY, HH:mm') : 'Select departure…'}
            </Text>
            <Text>📅</Text>
          </TouchableOpacity>
        </FormInput>
        {showDep && (
          <DateTimePicker value={depart ?? new Date()} mode="datetime" display="default"
            minimumDate={new Date()}
            onChange={(e, d) => { setShowDep(false); if (d) setDepart(d); }} />
        )}

        <FormInput label="Return Date & Time (optional)">
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowRet(true)}>
            <Text style={returnDt ? s.dateBtnText : s.dateBtnPlaceholder}>
              {returnDt ? dayjs(returnDt).format('DD MMM YYYY, HH:mm') : 'Select return (optional)…'}
            </Text>
            <Text>📅</Text>
          </TouchableOpacity>
        </FormInput>
        {showRet && (
          <DateTimePicker value={returnDt ?? depart ?? new Date()} mode="datetime" display="default"
            minimumDate={depart ?? new Date()}
            onChange={(e, d) => { setShowRet(false); if (d) setReturnDt(d); }} />
        )}

        {/* NOTES */}
        <SectionHeader title="Notes" color={C.pink} />
        <FormInput label="Special Instructions (optional)">
          <Input value={form.remarks} onChangeText={v => set('remarks', v)}
            placeholder="Pickup notes, access codes…" multiline numberOfLines={3} />
        </FormInput>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Btn label="Cancel" onPress={() => navigation.goBack()} outline color={C.textMuted} />
        <View style={{ flex: 1 }}>
          <Btn label="Submit Request" onPress={submit} loading={saving} color={C.primary} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:              { flex: 1, backgroundColor: C.bg, padding: 16 },
  chip:                { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fafbff' },
  chipActive:          { backgroundColor: C.primaryBg, borderColor: C.primary },
  chipText:            { fontSize: 13, color: C.textSub, fontWeight: '600' },
  chipTextActive:      { color: C.primary },
  dotA:                { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary,
    borderWidth: 2, borderColor: C.primaryBg, marginBottom: 4 },
  dotB:                { width: 12, height: 12, borderRadius: 3, backgroundColor: C.emerald,
    borderWidth: 2, borderColor: C.emeraldBg, marginTop: 4 },
  line:                { width: 2, flex: 1, minHeight: 40, backgroundColor: C.primary, opacity: 0.3 },
  dateBtn:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#fafbff' },
  dateBtnText:         { fontSize: 14, color: C.text, fontWeight: '500' },
  dateBtnPlaceholder:  { fontSize: 14, color: C.textMuted },
  footer:              { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.borderLight },
});
