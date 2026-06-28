import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../core/constants.dart';

class LocationPickerScreen extends StatefulWidget {
  final String title;
  final LatLng? initialPosition;

  const LocationPickerScreen({super.key, required this.title, this.initialPosition});

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  GoogleMapController? _mapCtrl;
  LatLng _selected = const LatLng(23.8103, 90.4125); // Dhaka default
  String _address   = '';
  bool   _loading   = false;

  // Places autocomplete
  final _searchCtrl    = TextEditingController();
  List<Map<String, dynamic>> _suggestions = [];
  bool _showSuggestions = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialPosition != null) {
      _selected = widget.initialPosition!;
      // Pre-load address only if re-editing an existing location
      _reverseGeocode(widget.initialPosition!);
    }
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      final latLng = LatLng(pos.latitude, pos.longitude);
      // Only center the map — do NOT auto-set address (user must tap to confirm)
      if (widget.initialPosition == null) {
        setState(() => _selected = latLng);
      }
      _mapCtrl?.animateCamera(CameraUpdate.newLatLngZoom(
        widget.initialPosition ?? latLng, 14));
    } catch (_) {}
  }

  Future<void> _reverseGeocode(LatLng pos) async {
    setState(() => _loading = true);
    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/geocode/json'
        '?latlng=${pos.latitude},${pos.longitude}&key=$kGoogleMapsKey'
      );
      final res  = await http.get(url);
      final data = jsonDecode(res.body);
      if (data['status'] == 'OK' && data['results'].isNotEmpty) {
        setState(() => _address = data['results'][0]['formatted_address']);
        _searchCtrl.text = _address;
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _searchPlaces(String query) async {
    if (query.length < 3) { setState(() => _suggestions = []); return; }
    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json'
        '?input=${Uri.encodeComponent(query)}&key=$kGoogleMapsKey'
        '&types=geocode&components=country:bd'
      );
      final res  = await http.get(url);
      final data = jsonDecode(res.body);
      if (data['status'] == 'OK') {
        setState(() {
          _suggestions     = List<Map<String, dynamic>>.from(data['predictions']);
          _showSuggestions = _suggestions.isNotEmpty;
        });
      }
    } catch (_) {}
  }

  Future<void> _selectPlace(String placeId, String description) async {
    setState(() { _showSuggestions = false; _loading = true; _searchCtrl.text = description; });
    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/details/json'
        '?place_id=$placeId&fields=geometry,formatted_address&key=$kGoogleMapsKey'
      );
      final res  = await http.get(url);
      final data = jsonDecode(res.body);
      if (data['status'] == 'OK') {
        final loc = data['result']['geometry']['location'];
        final pos = LatLng(loc['lat'], loc['lng']);
        setState(() {
          _selected = pos;
          _address  = data['result']['formatted_address'] ?? description;
          _searchCtrl.text = _address;
        });
        _mapCtrl?.animateCamera(CameraUpdate.newLatLngZoom(pos, 16));
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  void _confirm() {
    if (_address.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a location from the map or search')));
      return;
    }
    Navigator.pop(context, {
      'address': _address,
      'lat':     _selected.latitude,
      'lng':     _selected.longitude,
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(children: [
      // ── Google Map ──────────────────────────────────────────────────
      GoogleMap(
        initialCameraPosition: CameraPosition(target: _selected, zoom: 14),
        onMapCreated: (c) { _mapCtrl = c; },
        myLocationEnabled:       true,
        myLocationButtonEnabled: false,
        zoomControlsEnabled:     false,
        markers: {
          Marker(
            markerId: const MarkerId('selected'),
            position: _selected,
            draggable: true,
            onDragEnd: (pos) async {
              setState(() => _selected = pos);
              await _reverseGeocode(pos);
            },
          ),
        },
        onTap: (pos) async {
          setState(() { _selected = pos; _showSuggestions = false; });
          FocusScope.of(context).unfocus();
          await _reverseGeocode(pos);
        },
      ),

      // ── Search bar + suggestions ────────────────────────────────────
      SafeArea(child: Column(children: [
        // Top bar
        Container(
          margin: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15),
              blurRadius: 12, offset: const Offset(0, 4))]),
          child: Row(children: [
            IconButton(onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back_ios, size: 20)),
            Expanded(child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search location — ${widget.title}',
                hintStyle: const TextStyle(fontSize: 14),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                suffixIcon: _searchCtrl.text.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 18),
                      onPressed: () { _searchCtrl.clear(); setState(() { _suggestions = []; _showSuggestions = false; }); })
                  : null,
              ),
              onChanged: (v) => _searchPlaces(v),
              onTap: () => setState(() => _showSuggestions = _suggestions.isNotEmpty),
            )),
            if (_loading) const Padding(padding: EdgeInsets.only(right: 12),
              child: SizedBox(width: 18, height: 18,
                child: CircularProgressIndicator(strokeWidth: 2))),
          ]),
        ),

        // Suggestions list
        if (_showSuggestions) Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12),
              blurRadius: 8, offset: const Offset(0, 4))]),
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: _suggestions.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final s = _suggestions[i];
              return ListTile(
                dense: true,
                leading: const Icon(Icons.location_on_outlined, color: Color(0xFF6366F1), size: 20),
                title: Text(s['structured_formatting']?['main_text'] ?? s['description'] ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text(s['structured_formatting']?['secondary_text'] ?? '',
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
                onTap: () => _selectPlace(s['place_id'], s['description'] ?? ''),
              );
            },
          ),
        ),
      ])),

      // ── Center crosshair hint ───────────────────────────────────────
      const Center(child: SizedBox(
        width: 24, height: 24,
        child: Icon(Icons.add, color: Colors.transparent),
      )),

      // ── Bottom confirm bar ──────────────────────────────────────────
      Positioned(bottom: 0, left: 0, right: 0,
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 16, offset: Offset(0, -4))]),
          padding: EdgeInsets.fromLTRB(20, 16, 20,
            MediaQuery.of(context).padding.bottom + 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            // Handle
            Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),

            // Selected address
            if (_address.isNotEmpty) Row(children: [
              const Icon(Icons.location_pin, color: Color(0xFF6366F1), size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(_address,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                maxLines: 2, overflow: TextOverflow.ellipsis)),
            ]),
            if (_address.isNotEmpty) const SizedBox(height: 12),

            // Coordinates
            Row(children: [
              const Icon(Icons.my_location, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text('${_selected.latitude.toStringAsFixed(5)}, ${_selected.longitude.toStringAsFixed(5)}',
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ]),
            const SizedBox(height: 14),

            // Confirm button
            SizedBox(width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _confirm,
                icon: const Icon(Icons.check_circle_outline, size: 20),
                label: Text('Confirm — ${widget.title}',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              )),
          ]),
        )),
    ]),
  );
}
