import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { driverApi } from '../../api/services';
import { Btn, ScreenHeader, StatusBadge } from '../../components';
import { C } from '../../utils/colors';
import dayjs from 'dayjs';

export default function ActiveTripScreen({ route, navigation }) {
  const { id } = route.params;
  const [dispatch, setDispatch] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [route_, setRoute_] = useState([]);  // breadcrumb trail
  const [ending,  setEnding]  = useState(false);
  const intervalRef = useRef(null);
  const mapRef      = useRef(null);

  async function load() {
    try {
      const res = await driverApi.dispatchDetail(id);
      setDispatch(res.data.data);
    } catch { }
  }

  useEffect(() => {
    load();
    startTracking();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function startTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    async function update() {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setMyLocation(pos);
        setRoute_(prev => [...prev.slice(-200), pos]); // keep last 200 points

        const res = await driverApi.updateLocation({
          lat: pos.latitude, lng: pos.longitude,
          speed: loc.coords.speed != null ? loc.coords.speed * 3.6 : null,
        });
        const event = res.data.data;
        if (event?.geofenceTriggered && event.geofenceEvent === 'TRIP_COMPLETED') {
          Alert.alert('Trip Completed ✓', 'You have reached the destination!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch { }
    }

    await update();
    intervalRef.current = setInterval(update, 10_000);
  }

  async function endTrip() {
    Alert.alert('End Trip', 'Mark this trip as completed?', [
      { text: 'Cancel' },
      { text: 'End', style: 'destructive', onPress: async () => {
        setEnding(true);
        try {
          await driverApi.endDispatch(id, {});
          Alert.alert('Done!', 'Trip marked as completed.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message ?? 'Failed');
        } finally { setEnding(false); }
      }},
    ]);
  }

  // Map region
  const region = myLocation ? {
    latitude:       myLocation.latitude,
    longitude:      myLocation.longitude,
    latitudeDelta:  0.04,
    longitudeDelta: 0.04,
  } : { latitude: 23.8103, longitude: 90.4125, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  if (!dispatch) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted }}>Loading trip…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <ScreenHeader
        title={dispatch.dispatchNo}
        subtitle={`${dispatch.origin} → ${dispatch.destination}`}
        onBack={() => navigation.goBack()}
        right={<StatusBadge status={dispatch.status} />}
      />

      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={region}
        showsUserLocation
        showsMyLocationButton
        mapType="standard"
      >
        {/* Driver position trail */}
        {route_.length > 1 && (
          <Polyline
            coordinates={route_}
            strokeColor={C.primary}
            strokeWidth={4}
          />
        )}

        {/* Current position marker */}
        {myLocation && (
          <Marker coordinate={myLocation} title="You are here">
            <View style={s.driverMarker}>
              <Text style={{ fontSize: 20 }}>🚗</Text>
            </View>
          </Marker>
        )}

        {/* Geofence circles (if dispatch has linked requisition with coords) */}
        {geofence?.pickup && (
          <>
            <Marker coordinate={{ latitude: geofence.pickup.lat, longitude: geofence.pickup.lng }}
              title="Pickup">
              <View style={[s.geoMarker, { backgroundColor: C.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>A</Text>
              </View>
            </Marker>
            <Circle
              center={{ latitude: geofence.pickup.lat, longitude: geofence.pickup.lng }}
              radius={geofence.radiusM ?? 500}
              fillColor="rgba(99,102,241,0.1)"
              strokeColor="rgba(99,102,241,0.4)"
              strokeWidth={2}
            />
          </>
        )}
        {geofence?.destination && (
          <>
            <Marker coordinate={{ latitude: geofence.destination.lat, longitude: geofence.destination.lng }}
              title="Destination">
              <View style={[s.geoMarker, { backgroundColor: C.emerald }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>B</Text>
              </View>
            </Marker>
            <Circle
              center={{ latitude: geofence.destination.lat, longitude: geofence.destination.lng }}
              radius={geofence.radiusM ?? 500}
              fillColor="rgba(16,185,129,0.1)"
              strokeColor="rgba(16,185,129,0.4)"
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Bottom info sheet */}
      <View style={s.bottomSheet}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={s.label}>Origin</Text>
            <Text style={s.value} numberOfLines={1}>{dispatch.origin}</Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 20 }}>→</Text>
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={s.label}>Destination</Text>
            <Text style={[s.value, { textAlign: 'right' }]} numberOfLines={1}>{dispatch.destination}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          {dispatch.startTime && (
            <View style={s.chip}>
              <Text style={s.chipLabel}>Started</Text>
              <Text style={s.chipValue}>{dayjs(dispatch.startTime).format('HH:mm')}</Text>
            </View>
          )}
          {dispatch.distance && (
            <View style={s.chip}>
              <Text style={s.chipLabel}>Distance</Text>
              <Text style={s.chipValue}>{dispatch.distance} km</Text>
            </View>
          )}
          <View style={s.chip}>
            <Text style={s.chipLabel}>GPS</Text>
            <Text style={[s.chipValue, { color: C.emerald }]}>● Live</Text>
          </View>
        </View>

        <Btn
          label="■  End Trip"
          onPress={endTrip}
          loading={ending}
          color={C.rose}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  driverMarker:  { width: 40, height: 40, backgroundColor: C.white, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 6 },
  geoMarker:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4 },
  bottomSheet:   { backgroundColor: C.white, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: -4 }, shadowRadius: 16, elevation: 10 },
  label:         { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:         { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 2, maxWidth: 160 },
  chip:          { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 10, alignItems: 'center' },
  chipLabel:     { fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  chipValue:     { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 2 },
});
