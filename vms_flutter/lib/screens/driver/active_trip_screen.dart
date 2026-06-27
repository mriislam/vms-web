import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../widgets/widgets.dart';

class ActiveTripScreen extends StatefulWidget {
  final Dispatch dispatch;
  const ActiveTripScreen({super.key, required this.dispatch});
  @override State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  GoogleMapController? _mapCtrl;
  LatLng?              _myPos;
  List<LatLng>         _trail   = [];
  Set<Marker>          _markers = {};
  Set<Polyline>        _polylines = {};
  Timer?               _timer;
  bool                 _ending  = false;

  static const _dhaka = LatLng(23.8103, 90.4125);

  @override
  void initState() {
    super.initState();
    _startTracking();
  }

  @override void dispose() { _timer?.cancel(); _mapCtrl?.dispose(); super.dispose(); }

  Future<void> _startTracking() async {
    await Geolocator.requestPermission();
    await _updatePosition();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _updatePosition());
  }

  Future<void> _updatePosition() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);
      final latLng = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _myPos = latLng;
        _trail = [..._trail.take(300), latLng];
        _polylines = {
          Polyline(polylineId: const PolylineId('trail'),
            points: _trail, color: AppColors.primary, width: 4)
        };
        _markers = {
          Marker(markerId: const MarkerId('me'), position: latLng,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet)),
        };
      });
      _mapCtrl?.animateCamera(CameraUpdate.newLatLng(latLng));

      // Post to server
      final res = await ApiClient.post('/driver/location', {
        'lat': pos.latitude, 'lng': pos.longitude,
        'speed': pos.speed * 3.6, 'heading': pos.heading,
      });
      final data  = res['data'] as Map<String,dynamic>? ?? {};
      final event = data['geofenceEvent'] as String?;
      if (event == 'TRIP_COMPLETED' && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Trip completed — you reached the destination!'),
            backgroundColor: AppColors.emerald, duration: Duration(seconds: 4)));
        Navigator.pop(context);
      }
    } catch (_) {}
  }

  Future<void> _endTrip() async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(title: const Text('End Trip'),
        content: const Text('Mark this trip as completed?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Complete', style: TextStyle(color: AppColors.rose))),
        ]));
    if (ok != true) return;
    setState(() => _ending = true);
    try {
      await ApiClient.post('/driver/dispatches/${widget.dispatch.id}/end', {});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trip completed!'), backgroundColor: AppColors.emerald));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _ending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(children: [
      // Full-screen map
      GoogleMap(
        initialCameraPosition: CameraPosition(target: _myPos ?? _dhaka, zoom: 14),
        onMapCreated: (c) => _mapCtrl = c,
        myLocationEnabled:       true,
        myLocationButtonEnabled: true,
        zoomControlsEnabled:     true,
        markers:   _markers,
        polylines: _polylines,
        mapType:   MapType.normal,
      ),

      // Header overlay
      Positioned(top: 0, left: 0, right: 0,
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [Colors.black87, Colors.transparent])),
          padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 8, 16, 20),
          child: Row(children: [
            GestureDetector(onTap: () => Navigator.pop(context),
              child: Container(padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.black38,
                  borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.arrow_back_ios, color: Colors.white, size: 18))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.dispatch.dispatchNo,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              Text('${widget.dispatch.origin} → ${widget.dispatch.destination}',
                style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                overflow: TextOverflow.ellipsis),
            ])),
            Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(color: AppColors.emerald,
                borderRadius: BorderRadius.circular(20)),
              child: Row(children: [
                Container(width: 7, height: 7, decoration: const BoxDecoration(
                  color: Colors.white, shape: BoxShape.circle)),
                const SizedBox(width: 5),
                const Text('GPS Live', style: TextStyle(color: Colors.white,
                  fontWeight: FontWeight.w700, fontSize: 12)),
              ])),
          ]),
        )),

      // Bottom sheet
      Positioned(bottom: 0, left: 0, right: 0,
        child: Container(
          decoration: const BoxDecoration(color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, -4))]),
          padding: EdgeInsets.fromLTRB(20, 20, 20,
            MediaQuery.of(context).padding.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            // Route summary
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Origin', style: TextStyle(fontSize: 11, color: AppColors.textMuted,
                  fontWeight: FontWeight.w600)),
                Text(widget.dispatch.origin, style: const TextStyle(fontWeight: FontWeight.w700,
                  fontSize: 13, color: AppColors.primary), overflow: TextOverflow.ellipsis),
              ])),
              const Padding(padding: EdgeInsets.symmetric(horizontal: 8),
                child: Icon(Icons.arrow_forward, color: AppColors.textMuted, size: 18)),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Text('Destination', style: TextStyle(fontSize: 11, color: AppColors.textMuted,
                  fontWeight: FontWeight.w600)),
                Text(widget.dispatch.destination, style: const TextStyle(fontWeight: FontWeight.w700,
                  fontSize: 13, color: AppColors.emerald), overflow: TextOverflow.ellipsis),
              ])),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              _chip(Icons.directions_car, widget.dispatch.vehicleReg),
              const SizedBox(width: 10),
              _chip(Icons.person, widget.dispatch.driverName.split(' ').first),
              const SizedBox(width: 10),
              _chip(Icons.gps_fixed,
                _myPos != null ? '${_myPos!.latitude.toStringAsFixed(4)}, ${_myPos!.longitude.toStringAsFixed(4)}' : 'Locating…'),
            ]),
            const SizedBox(height: 14),
            GradientButton(
              label: '■   End Trip',
              colors: const [AppColors.rose, Color(0xFFE11D48)],
              onPressed: _endTrip,
              loading: _ending,
            ),
          ]),
        )),
    ]),
  );

  Widget _chip(IconData icon, String label) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
    decoration: BoxDecoration(color: AppColors.bg,
      borderRadius: BorderRadius.circular(10)),
    child: Row(children: [
      Icon(icon, size: 13, color: AppColors.primary),
      const SizedBox(width: 4),
      Expanded(child: Text(label, style: const TextStyle(fontSize: 11,
        color: AppColors.text, fontWeight: FontWeight.w600),
        overflow: TextOverflow.ellipsis)),
    ]),
  ));
}
