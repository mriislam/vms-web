import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';
import '../location_picker_screen.dart';

class NewRequestScreen extends StatefulWidget {
  const NewRequestScreen({super.key});
  @override State<NewRequestScreen> createState() => _NewRequestScreenState();
}

class _NewRequestScreenState extends State<NewRequestScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _fromCtrl  = TextEditingController();
  final _toCtrl    = TextEditingController();
  // Map-picked location data
  Map<String, dynamic>? _fromLocation;
  Map<String, dynamic>? _toLocation;
  final _purposeCtrl = TextEditingController();
  final _remarksCtrl = TextEditingController();
  final _paxCtrl   = TextEditingController(text: '1');

  String  _priority = 'normal';
  String? _dept;
  DateTime? _depart;
  DateTime? _return_;
  bool _saving = false;

  final _depts = ['HQ','HR','Finance','Operations','IT','Admin','Logistics'];
  Map<String, dynamic>? _routeInfo;   // {points, distanceText, distanceM, durationText}
  bool _routeLoading = false;
  @override void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user?.department != null) _dept = user!.department;
  }
  double? get _distanceKm {
    if (_fromLocation == null || _toLocation == null) return null;
    final meters = Geolocator.distanceBetween(
      _fromLocation!['lat'], _fromLocation!['lng'],
      _toLocation!['lat'],   _toLocation!['lng'],
    );
    return meters / 1000;
  }
  Future<void> _pickDate({required bool isDepart}) async {
    final now  = DateTime.now();
    // Depart: must be now or future. Return: must be after depart (or now).
    final firstDate = isDepart ? now : (_depart ?? now);
    final init      = isDepart
      ? (_depart ?? now.add(const Duration(hours: 1)))
      : (_return_ ?? (_depart?.add(const Duration(hours: 1)) ?? now.add(const Duration(hours: 2))));

    final date = await showDatePicker(context: context,
      initialDate: init.isBefore(firstDate) ? firstDate : init,
      firstDate:   firstDate,
      lastDate:    now.add(const Duration(days: 365)));
    if (date == null || !mounted) return;

    final time = await showTimePicker(context: context,
      initialTime: TimeOfDay.fromDateTime(init));
    if (time == null || !mounted) return;

    final dt = DateTime(date.year, date.month, date.day, time.hour, time.minute);

    // Validation
    if (isDepart && dt.isBefore(DateTime.now())) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Departure time cannot be in the past'),
        backgroundColor: Colors.orange));
      return;
    }
    if (!isDepart && _depart != null && !dt.isAfter(_depart!)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Return time must be after departure time'),
        backgroundColor: Colors.orange));
      return;
    }

    setState(() {
      if (isDepart) {
        _depart = dt;
        // Reset return if it's now before new departure
        if (_return_ != null && !_return_!.isAfter(dt)) _return_ = null;
      } else {
        _return_ = dt;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if ((_fromLocation == null) && _fromCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Please select a pickup location on the map'),
        backgroundColor: Colors.orange)); return;
    }
    if ((_toLocation == null) && _toCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Please select a destination on the map'),
        backgroundColor: Colors.orange)); return;
    }
    if (_depart == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Please select departure date & time'),
        backgroundColor: Colors.orange));
      return;
    }
    if (_depart!.isBefore(DateTime.now())) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Departure time cannot be in the past'),
        backgroundColor: Colors.orange)); return;
    }
    if (_return_ != null && !_return_!.isAfter(_depart!)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('⚠️ Return time must be after departure time'),
        backgroundColor: Colors.orange)); return;
    }
    setState(() => _saving = true);
    try {
      final user  = context.read<AuthProvider>().user;
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final fmt   = (DateTime? dt) => dt != null
        ? DateFormat('yyyy-MM-dd').format(dt) : today;
      final fmtDt = (DateTime? dt) => dt != null
        ? DateFormat("yyyy-MM-dd'T'HH:mm:ss").format(dt) : null;

      await ApiClient.post('/requisitions', {
        'requestedBy':   user?.displayName ?? '',
        'department':    _dept ?? '',
        'purpose':       _purposeCtrl.text.trim(),
        'priority':      _priority,
        'fromLocation':  _fromLocation?['address'] ?? _fromCtrl.text.trim(),
        'toLocation':    _toLocation?['address']   ?? _toCtrl.text.trim(),
        'fromLat':       _fromLocation?['lat'],
        'fromLng':       _fromLocation?['lng'],
        'toLat':         _toLocation?['lat'],
        'toLng':         _toLocation?['lng'],
        'passengers':    int.tryParse(_paxCtrl.text) ?? 1,
        'remarks':       _remarksCtrl.text.trim().isEmpty ? null : _remarksCtrl.text.trim(),
        'date':          today,
        'fromDate':      fmt(_depart),
        'toDate':        fmt(_return_),
        'fromDatetime':  fmtDt(_depart),
        'toDatetime':    fmtDt(_return_),
        'status':        'pending',
        'geofenceRadiusM': 500,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Request submitted successfully'),
          backgroundColor: AppColors.emerald));
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.rose));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
  List<LatLng> _decodePolyline(String encoded) {
    List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return points;
  }
  Future<Map<String, dynamic>?> _fetchRoute(LatLng from, LatLng to) async {
    try {
      final url = Uri.parse(
          'https://maps.googleapis.com/maps/api/directions/json'
              '?origin=${from.latitude},${from.longitude}'
              '&destination=${to.latitude},${to.longitude}'
              '&key=$kGoogleMapsKey'
      );
      final res  = await http.get(url);
      final data = jsonDecode(res.body);
      if (data['status'] == 'OK' && (data['routes'] as List).isNotEmpty) {
        final route = data['routes'][0];
        final leg   = route['legs'][0];
        return {
          'points':       _decodePolyline(route['overview_polyline']['points']),
          'distanceText': leg['distance']['text'],
          'distanceM':    leg['distance']['value'],
          'durationText': leg['duration']['text'],
        };
      }
    } catch (_) {}
    return null;
  }
  void _showFullScreenRouteMap() {
    if (_fromLocation == null || _toLocation == null) return;

    Map<String, dynamic> from = Map.from(_fromLocation!);
    Map<String, dynamic> to   = Map.from(_toLocation!);
    Map<String, dynamic>? route; // null while loading
    bool loadingRoute = true;

    showDialog(
      context: context,
      barrierColor: Colors.black,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) {

          void loadRoute() {
            setDialogState(() => loadingRoute = true);
            _fetchRoute(
              LatLng(from['lat'], from['lng']),
              LatLng(to['lat'], to['lng']),
            ).then((result) {
              setDialogState(() { route = result; loadingRoute = false; });
            });
          }

          // Trigger initial load once
          if (route == null && loadingRoute == true) {
            // Use a microtask-safe flag pattern: only fire once per from/to combo
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (route == null) loadRoute();
            });
          }

          Future<void> pickFrom() async {
            final result = await Navigator.push<Map<String, dynamic>>(dialogContext,
                MaterialPageRoute(builder: (_) => LocationPickerScreen(
                  title: 'Pickup Location',
                  initialPosition: LatLng(from['lat'], from['lng']),
                )));
            if (result != null) {
              setDialogState(() { from = result; route = null; });
              loadRoute();
            }
          }

          Future<void> pickTo() async {
            final result = await Navigator.push<Map<String, dynamic>>(dialogContext,
                MaterialPageRoute(builder: (_) => LocationPickerScreen(
                  title: 'Destination',
                  initialPosition: LatLng(to['lat'], to['lng']),
                )));
            if (result != null) {
              setDialogState(() { to = result; route = null; });
              loadRoute();
            }
          }

          final fromLatLng = LatLng(from['lat'], from['lng']);
          final toLatLng   = LatLng(to['lat'],   to['lng']);
          final List<LatLng> polylinePoints = route?['points'] ?? [fromLatLng, toLatLng];

          return Dialog.fullscreen(
            backgroundColor: Colors.black,
            child: Stack(children: [
              GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: LatLng((fromLatLng.latitude + toLatLng.latitude) / 2,
                      (fromLatLng.longitude + toLatLng.longitude) / 2),
                  zoom: 12,
                ),
                onMapCreated: (c) {
                  final south = fromLatLng.latitude < toLatLng.latitude ? fromLatLng.latitude : toLatLng.latitude;
                  final north = fromLatLng.latitude < toLatLng.latitude ? toLatLng.latitude : fromLatLng.latitude;
                  final west  = fromLatLng.longitude < toLatLng.longitude ? fromLatLng.longitude : toLatLng.longitude;
                  final east  = fromLatLng.longitude < toLatLng.longitude ? toLatLng.longitude : fromLatLng.longitude;
                  c.animateCamera(CameraUpdate.newLatLngBounds(
                    LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
                    80,
                  ));
                },
                markers: {
                  Marker(
                    markerId: const MarkerId('from'),
                    position: fromLatLng,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
                    infoWindow: InfoWindow(title: 'From', snippet: from['address']),
                  ),
                  Marker(
                    markerId: const MarkerId('to'),
                    position: toLatLng,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                    infoWindow: InfoWindow(title: 'To', snippet: to['address']),
                  ),
                },
                polylines: {
                  Polyline(
                    polylineId: const PolylineId('route'),
                    points: polylinePoints,
                    color: AppColors.primary,
                    width: 5,
                    // Solid line when it's a real road route, dashed if it's just the straight fallback
                    patterns: route != null ? [] : [PatternItem.dash(14), PatternItem.gap(10)],
                  ),
                },
              ),

              if (loadingRoute)
                const Positioned(
                  top: 70, left: 0, right: 0,
                  child: Center(child: CircularProgressIndicator()),
                ),

              SafeArea(child: Align(
                alignment: Alignment.topLeft,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _fromLocation = from;
                        _fromCtrl.text = from['address'] ?? '';
                        _toLocation = to;
                        _toCtrl.text = to['address'] ?? '';
                        _routeInfo = route; // sync whatever route the dialog already fetched
                      });
                      Navigator.pop(dialogContext);
                      // If the dialog's route is stale/null (still loading), force a fresh fetch
                      if (route == null) _loadRoute();
                    },
                    borderRadius: BorderRadius.circular(100),
                    child: Container(
                      width: 41, height: 41,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.9),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 8)],
                      ),
                      child: const Icon(Icons.close, color: Colors.black87),
                    ),
                  ),
                ),
              )),

              Positioned(
                left: 0, right: 0, bottom: 0,
                child: SafeArea(
                  child: Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 4))],
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      InkWell(
                        onTap: pickFrom,
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(children: [
                            Container(width: 10, height: 10,
                                decoration: const BoxDecoration(color: Color(0xFF4285F4), shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Expanded(child: Text(from['address'] ?? '',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                maxLines: 1, overflow: TextOverflow.ellipsis)),
                            const Icon(Icons.edit_location_alt_outlined, size: 16, color: Colors.grey),
                          ]),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(left: 4),
                        child: SizedBox(height: 10, child: VerticalDivider(width: 2, thickness: 2, color: Color(0xFFDDDDDD))),
                      ),
                      InkWell(
                        onTap: pickTo,
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(children: [
                            Container(width: 10, height: 10,
                                decoration: BoxDecoration(color: const Color(0xFFEA4335), borderRadius: BorderRadius.circular(2))),
                            const SizedBox(width: 8),
                            Expanded(child: Text(to['address'] ?? '',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                maxLines: 1, overflow: TextOverflow.ellipsis)),
                            const Icon(Icons.edit_location_alt_outlined, size: 16, color: Colors.grey),
                          ]),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.straighten, size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            loadingRoute
                                ? 'Calculating route…'
                                : route != null
                                ? '${route!['distanceText']} • ${route!['durationText']}'
                                : '${(Geolocator.distanceBetween(from['lat'], from['lng'], to['lat'], to['lng']) / 1000).toStringAsFixed(1)} km (straight line — route unavailable)',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
                          ),
                        ]),
                      ),
                    ]),
                  ),
                ),
              ),
            ]),
          );
        },
      ),
    );
  }
  Future<void> _loadRoute() async {
    if (_fromLocation == null || _toLocation == null) return;
    setState(() => _routeLoading = true);
    final result = await _fetchRoute(
      LatLng(_fromLocation!['lat'], _fromLocation!['lng']),
      LatLng(_toLocation!['lat'],   _toLocation!['lng']),
    );
    if (!mounted) return;
    setState(() {
      _routeInfo   = result;
      _routeLoading = false;
    });
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: const GradientHeader(title: 'New Vehicle Request',
      subtitle: 'Fill in your trip details', showBack: true),
    body: Form(key: _formKey,
      child: ListView(padding: const EdgeInsets.all(16), children: [

        // ── WHO ─────────────────────────────────────────────────────────────
        const SectionLabel('Who is Travelling?'),
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
          TextFormField(
            initialValue: context.read<AuthProvider>().user?.displayName ?? '',
            decoration: const InputDecoration(labelText: 'Employee / Requester',
              prefixIcon: Icon(Icons.person_outline, color: AppColors.primary)),
            validator: (v) => v?.isEmpty == true ? 'Required' : null,
            onChanged: (_) {},
          ),
          const SizedBox(height: 12),
          // Department chips
          const Align(alignment: Alignment.centerLeft,
            child: Text('Department', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 6, children: _depts.map((d) =>
            GestureDetector(
              onTap: () => setState(() => _dept = d),
              child: Chip(
                label: Text(d, style: TextStyle(
                  color: _dept == d ? AppColors.primary : AppColors.textSub,
                  fontWeight: FontWeight.w600, fontSize: 12)),
                backgroundColor: _dept == d ? AppColors.primaryBg : AppColors.bg,
                side: BorderSide(color: _dept == d ? AppColors.primary : AppColors.border),
                visualDensity: VisualDensity.compact,
              )),
          ).toList()),
          const SizedBox(height: 12),
          TextFormField(
            controller: _purposeCtrl,
            decoration: const InputDecoration(labelText: 'Purpose of Trip *',
              prefixIcon: Icon(Icons.work_outline, color: AppColors.primary),
              hintText: 'e.g. Site visit, Client meeting…'),
            validator: (v) => v?.isEmpty == true ? 'Required' : null,
          ),
          const SizedBox(height: 12),
          // Priority
          const Align(alignment: Alignment.centerLeft,
            child: Text('Priority', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
          const SizedBox(height: 8),
          Row(children: [
            for (final p in [('normal','🟢 Normal'), ('high','🟠 High'), ('urgent','🔴 Urgent')])
              Expanded(child: Padding(padding: const EdgeInsets.only(right: 6),
                child: GestureDetector(
                  onTap: () => setState(() => _priority = p.$1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _priority == p.$1 ? AppColors.primaryBg : AppColors.bg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _priority == p.$1 ? AppColors.primary : AppColors.border)),
                    child: Text(p.$2, style: TextStyle(fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _priority == p.$1 ? AppColors.primary : AppColors.textSub)),
                  ),
                ))),
          ]),
        ]))),

        // ── WHERE — Google Maps style card ────────────────────────────────────
        const SectionLabel('Where To?', color: AppColors.cyan),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08),
              blurRadius: 8, offset: const Offset(0, 2))],
          ),
          child: Column(children: [
            // ── FROM field ──────────────────────────────────────────────
            InkWell(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              onTap: () async {
                final result = await Navigator.push<Map<String, dynamic>>(context,
                    MaterialPageRoute(builder: (_) => LocationPickerScreen(
                      title: 'Pickup Location',
                      initialPosition: _fromLocation != null
                          ? LatLng(_fromLocation!['lat'], _fromLocation!['lng']) : null,
                    )));
                if (result != null) {
                  setState(() {
                    _fromLocation = result;
                    _fromCtrl.text = result['address'] ?? '';
                    _routeInfo = null;
                  });
                  _loadRoute();
                }
              },
              child: Padding(
                padding: const EdgeInsets.only(left: 16, right: 10, top: 10),
                child: Row(children: [
                  // Blue dot
                  Container(width: 12, height: 12,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4285F4), shape: BoxShape.circle)),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('From', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(
                      (_fromLocation?['address'] ?? _fromCtrl.text).isNotEmpty
                        ? (_fromLocation?['address'] ?? _fromCtrl.text)
                        : 'Choose starting point',
                      style: TextStyle(
                        fontSize: 15,
                        color: (_fromLocation?['address'] ?? _fromCtrl.text).isNotEmpty
                          ? Colors.black87 : Colors.grey[400],
                        fontWeight: (_fromLocation?['address'] ?? _fromCtrl.text).isNotEmpty
                          ? FontWeight.w500 : FontWeight.normal),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ])),
                  // Clear button
                  if ((_fromLocation?['address'] ?? _fromCtrl.text).isNotEmpty)
                    GestureDetector(
                        onTap: () => setState(() { _fromLocation = null; _fromCtrl.clear(); _routeInfo = null; }),
                        child: const Icon(Icons.close, size: 18, color: Colors.grey)),
                ]),
              ),
            ),

            // ── Divider with connector line ─────────────────────────────
            Row(children: [
              const SizedBox(width: 22),
              Container(width: 2, height: 1, color: Colors.transparent),
              // Vertical dashed line between dots
              Padding(
                padding: const EdgeInsets.only(left: 5),
                child: Container(width: 2, height: 20,
                  color: const Color(0xFFDDDDDD)),
              ),
              const Expanded(child: Divider(height: 1, color: Color(0xFFEEEEEE))),
            ]),

            // ── TO field ────────────────────────────────────────────────
            InkWell(
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
              onTap: () async {
                final result = await Navigator.push<Map<String, dynamic>>(context,
                    MaterialPageRoute(builder: (_) => LocationPickerScreen(
                      title: 'Destination',
                      initialPosition: _toLocation != null
                          ? LatLng(_toLocation!['lat'], _toLocation!['lng']) : null,
                    )));
                if (result != null) {
                  setState(() {
                    _toLocation = result;
                    _toCtrl.text = result['address'] ?? '';
                    _routeInfo = null;
                  });
                  _loadRoute();
                }
              },
              child: Padding(
                padding: const EdgeInsets.only(left: 16, right: 10, bottom: 10),
                child: Row(children: [
                  // Red pin square
                  Container(width: 12, height: 12,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEA4335),
                      borderRadius: BorderRadius.circular(2))),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('To', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(
                      (_toLocation?['address'] ?? _toCtrl.text).isNotEmpty
                        ? (_toLocation?['address'] ?? _toCtrl.text)
                        : 'Choose destination',
                      style: TextStyle(
                        fontSize: 15,
                        color: (_toLocation?['address'] ?? _toCtrl.text).isNotEmpty
                          ? Colors.black87 : Colors.grey[400],
                        fontWeight: (_toLocation?['address'] ?? _toCtrl.text).isNotEmpty
                          ? FontWeight.w500 : FontWeight.normal),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ])),
                  // Clear button
                  if ((_toLocation?['address'] ?? _toCtrl.text).isNotEmpty)
                    GestureDetector(
                        onTap: () => setState(() { _toLocation = null; _toCtrl.clear(); _routeInfo = null; }),
                        child: const Icon(Icons.close, size: 18, color: Colors.grey)),
                ]),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 19),
        if (_fromLocation != null && _toLocation != null) ...[
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _showFullScreenRouteMap,
            child: Stack(
              children: [
                Container(
                  height: 180,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08),
                        blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                  child: Stack(children: [
                    GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(
                          (_fromLocation!['lat'] + _toLocation!['lat']) / 2,
                          (_fromLocation!['lng'] + _toLocation!['lng']) / 2,
                        ),
                        zoom: 12,
                      ),
                      onMapCreated: (c) {
                        final south = _fromLocation!['lat'] < _toLocation!['lat'] ? _fromLocation!['lat'] : _toLocation!['lat'];
                        final north = _fromLocation!['lat'] < _toLocation!['lat'] ? _toLocation!['lat'] : _fromLocation!['lat'];
                        final west  = _fromLocation!['lng'] < _toLocation!['lng'] ? _fromLocation!['lng'] : _toLocation!['lng'];
                        final east  = _fromLocation!['lng'] < _toLocation!['lng'] ? _toLocation!['lng'] : _fromLocation!['lng'];
                        c.animateCamera(CameraUpdate.newLatLngBounds(
                          LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
                          48,
                        ));
                      },
                      zoomControlsEnabled: false,
                      scrollGesturesEnabled: false,
                      rotateGesturesEnabled: false,
                      tiltGesturesEnabled: false,
                      zoomGesturesEnabled: false,
                      liteModeEnabled: true,
                      markers: {
                        Marker(
                          markerId: const MarkerId('from'),
                          position: LatLng(_fromLocation!['lat'], _fromLocation!['lng']),
                          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
                        ),
                        Marker(
                          markerId: const MarkerId('to'),
                          position: LatLng(_toLocation!['lat'], _toLocation!['lng']),
                          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                        ),
                      },
                      polylines: {
                        Polyline(
                          polylineId: const PolylineId('route'),
                          points: _routeInfo != null
                              ? List<LatLng>.from(_routeInfo!['points'])
                              : [
                            LatLng(_fromLocation!['lat'], _fromLocation!['lng']),
                            LatLng(_toLocation!['lat'], _toLocation!['lng']),
                          ],
                          color: AppColors.primary,
                          width: 4,
                          // Solid when it's a real road route, dashed for straight-line fallback
                          patterns: _routeInfo != null ? [] : [PatternItem.dash(12), PatternItem.gap(8)],
                        ),
                      },
                    ),

                    // Loading spinner while fetching the route
                    if (_routeLoading)
                      const Positioned(
                        top: 8, left: 8,
                        child: SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.4),
                        ),
                      ),

                    // Distance / duration badge
                    Positioned(
                      bottom: 8, right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15),
                              blurRadius: 6, offset: const Offset(0, 2))],
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.straighten, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            _routeLoading
                                ? 'Calculating…'
                                : _routeInfo != null
                                ? '${_routeInfo!['distanceText']} • ${_routeInfo!['durationText']}'
                                : '${_distanceKm!.toStringAsFixed(1)} km',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                                color: AppColors.primary),
                          ),
                        ]),
                      ),
                    ),
                  ]),
                ),
                Positioned(
                  top: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.45),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.fullscreen, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text('Tap to expand', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 19),
        TextFormField(controller: _paxCtrl, keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'No. of Passengers',
            prefixIcon: Icon(Icons.people_outline, color: AppColors.violet))),

        // ── WHEN ──────────────────────────────────────────────────────────────
        const SectionLabel('When?', color: AppColors.violet),
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
          ListTile(contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today, color: AppColors.violet),
            title: const Text('Departure Date & Time *',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(_depart == null ? 'Tap to select…'
              : DateFormat('dd MMM yyyy, HH:mm').format(_depart!),
              style: TextStyle(color: _depart == null ? AppColors.textMuted : AppColors.text,
                fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _pickDate(isDepart: true),
          ),
          const Divider(height: 1),
          ListTile(contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.event_available, color: AppColors.cyan),
            title: const Text('Return Date & Time (optional)',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(_return_ == null ? 'Tap to select…'
              : DateFormat('dd MMM yyyy, HH:mm').format(_return_!),
              style: TextStyle(color: _return_ == null ? AppColors.textMuted : AppColors.text,
                fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _pickDate(isDepart: false),
          ),
        ]))),

        // ── NOTES ─────────────────────────────────────────────────────────────
        const SectionLabel('Notes', color: AppColors.orange),
        TextFormField(controller: _remarksCtrl, maxLines: 3,
          decoration: const InputDecoration(labelText: 'Special instructions (optional)',
            hintText: 'Pickup notes, access codes…',
            alignLabelWithHint: true)),

        const SizedBox(height: 20),
        Row(children: [
          Expanded(child: AppOutlineButton(label: 'Cancel',
            onPressed: () => Navigator.pop(context))),
          const SizedBox(width: 12),
          Expanded(flex: 2, child: GradientButton(
            label: 'Submit Request', onPressed: _submit,
            loading: _saving, icon: Icons.send)),
        ]),
        const SizedBox(height: 40),
      ]),
    ),
  );
}

