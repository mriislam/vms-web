import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../widgets/widgets.dart';
import 'active_trip_screen.dart';
import 'dispatch_detail_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});
  @override State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  List<Dispatch> _dispatches = [];
  bool           _loading    = true;
  bool           _tracking   = false;
  String?        _lastEvent;
  Timer?         _timer;

  @override void initState() { super.initState(); _load(); }
  @override void dispose()   { _stopTracking(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.get('/driver/dispatches/today');
      setState(() => _dispatches = (res['data'] as List? ?? [])
        .map((j) => Dispatch.fromJson(j as Map<String,dynamic>)).toList());
    } catch (_) {}
    setState(() => _loading = false);
  }

  // ── GPS Tracking ─────────────────────────────────────────────────────────────
  Future<void> _toggleTracking(bool on) async {
    if (on) {
      final perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission required')));
        return;
      }
      setState(() => _tracking = true);
      _sendLocation(); // immediate
      _timer = Timer.periodic(const Duration(seconds: 15), (_) => _sendLocation());
    } else {
      _stopTracking();
    }
  }

  void _stopTracking() { _timer?.cancel(); setState(() => _tracking = false); }

  Future<void> _sendLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);
      final res = await ApiClient.post('/driver/location', {
        'lat':      pos.latitude,
        'lng':      pos.longitude,
        'speed':    pos.speed * 3.6,  // m/s → km/h
        'heading':  pos.heading,
        'accuracy': pos.accuracy,
      });
      final data  = res['data'] as Map<String,dynamic>? ?? {};
      final event = data['geofenceEvent'] as String?;
      if (event != null && mounted) {
        setState(() => _lastEvent = data['message'] as String?);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(data['message'] as String? ?? 'Geofence triggered'),
          backgroundColor: event == 'TRIP_COMPLETED' ? AppColors.emerald : AppColors.primary,
          duration: const Duration(seconds: 4)));
        _load();
      }
    } catch (_) {}
  }

  // ── Manual start / end ─────────────────────────────────────────────────────
  Future<void> _startDispatch(Dispatch d) async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(title: const Text('Start Trip'),
        content: Text('Start dispatch ${d.dispatchNo}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Start', style: TextStyle(color: AppColors.emerald))),
        ]));
    if (ok != true) return;
    try {
      await ApiClient.post('/driver/dispatches/${d.id}/start', {});
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _endDispatch(Dispatch d) async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(title: const Text('End Trip'),
        content: Text('Mark ${d.dispatchNo} as completed?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('End Trip', style: TextStyle(color: AppColors.rose))),
        ]));
    if (ok != true) return;
    try {
      await ApiClient.post('/driver/dispatches/${d.id}/end', {});
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: GradientHeader(
      title: "Today's Trips",
      subtitle: '${_dispatches.length} dispatches',
      color1: const Color(0xFF0891B2), color2: AppColors.primary,
      trailing: IconButton(icon: const Icon(Icons.refresh, color: Colors.white),
        onPressed: _load),
    ),
    body: Column(children: [
      // GPS toggle bar
      Container(color: AppColors.white, padding: const EdgeInsets.symmetric(
        horizontal: 18, vertical: 12),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_tracking ? '🟢 GPS Tracking Active' : '⚪ GPS Tracking Off',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            Text(_tracking ? 'Auto-starts/ends trips via geofence'
              : 'Enable to auto-detect trip start/end',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ])),
          Switch(value: _tracking, onChanged: _toggleTracking,
            activeColor: AppColors.emerald),
        ]),
      ),

      // Geofence event banner
      if (_lastEvent != null) Container(
        margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.primaryBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x406366F1))),
        child: Row(children: [
          const Icon(Icons.location_on, color: AppColors.primary, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(_lastEvent!,
            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600))),
        ]),
      ),

      // Trip list
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator())
        : _dispatches.isEmpty
        ? const EmptyState(emoji: '🚗', title: "No trips today",
            subtitle: 'Your approved trips will appear here')
        : RefreshIndicator(onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: _dispatches.length,
              itemBuilder: (_, i) => _buildCard(_dispatches[i])))),
    ]),
  );

  Widget _buildCard(Dispatch d) {
    final isActive = d.status == 'in_progress';
    final canStart = d.status == 'approved' || d.status == 'pending';
    return GestureDetector(
      onTap: () async {
        await Navigator.push(context, MaterialPageRoute(
          builder: (_) => DispatchDetailScreen(id: d.id)));
        _load();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.white, borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0x1F6366F1)),
          borderLeft: Border(left: BorderSide(
            color: AppColors.statusColor(d.status), width: 4))),
        child: Padding(padding: const EdgeInsets.all(16), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(d.dispatchNo, style: const TextStyle(fontWeight: FontWeight.w800,
                fontSize: 15, color: AppColors.text)),
              if (d.date != null) Text(DateFormat('dd MMM yyyy')
                .format(DateTime.parse(d.date!)),
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ]),
            StatusBadge(d.status),
          ]),
          const SizedBox(height: 10),
          RouteConnector(from: d.origin, to: d.destination),
          if (d.purpose?.isNotEmpty == true) ...[
            const SizedBox(height: 6),
            Text(d.purpose!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 12),
          Row(children: [
            if (canStart) Expanded(child: _btn('▶  Start Trip', AppColors.emerald,
              () => _startDispatch(d))),
            if (isActive) ...[
              Expanded(child: _btn('🗺  Live Map', AppColors.primary,
                () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => ActiveTripScreen(dispatch: d))))),
              const SizedBox(width: 8),
              Expanded(child: _btn('■  End Trip', AppColors.rose,
                () => _endDispatch(d))),
            ],
          ]),
        ])),
      ),
    );
  }

  Widget _btn(String label, Color color, VoidCallback onTap) =>
    GestureDetector(onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 9),
        margin: const EdgeInsets.only(right: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
        child: Text(label, style: const TextStyle(color: Colors.white,
          fontWeight: FontWeight.w700, fontSize: 13)),
      ));
}

// Custom border decoration
extension _BoxDecEx on BoxDecoration {
  BoxDecoration copyWithBorderLeft(BorderSide side) => BoxDecoration(
    color: color, image: image, border: Border(
      left:   side,
      top:    (border as Border?)?.top    ?? BorderSide.none,
      right:  (border as Border?)?.right  ?? BorderSide.none,
      bottom: (border as Border?)?.bottom ?? BorderSide.none),
    borderRadius: borderRadius, boxShadow: boxShadow, gradient: gradient);
}
