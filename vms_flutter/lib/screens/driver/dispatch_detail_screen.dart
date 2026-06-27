import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../widgets/widgets.dart';
import 'active_trip_screen.dart';

class DispatchDetailScreen extends StatefulWidget {
  final int id;
  const DispatchDetailScreen({super.key, required this.id});
  @override State<DispatchDetailScreen> createState() => _DispatchDetailScreenState();
}

class _DispatchDetailScreenState extends State<DispatchDetailScreen> {
  Dispatch? _d;
  bool _loading = true, _starting = false, _ending = false;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient.get('/driver/dispatches/${widget.id}');
      setState(() => _d = Dispatch.fromJson(res['data'] as Map<String,dynamic>));
    } catch (_) {}
    setState(() => _loading = false);
  }

  String _fmt(String? dt) {
    if (dt == null) return '—';
    try { return DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(dt)); }
    catch (_) { return dt; }
  }

  Future<void> _start() async {
    setState(() => _starting = true);
    try {
      await ApiClient.post('/driver/dispatches/${_d!.id}/start', {});
      await _load();
      if (!mounted) return;
      final goLive = await showDialog<bool>(context: context,
        builder: (_) => AlertDialog(title: const Text('Trip Started ▶'),
          content: const Text('Trip is now in progress. Open live map?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Later')),
            TextButton(onPressed: () => Navigator.pop(context, true),
              child: const Text('Open Map', style: TextStyle(color: AppColors.primary))),
          ]));
      if (goLive == true && mounted && _d != null) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ActiveTripScreen(dispatch: _d!)));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally { if (mounted) setState(() => _starting = false); }
  }

  Future<void> _end() async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(title: const Text('End Trip'),
        content: const Text('Mark as completed?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Complete', style: TextStyle(color: AppColors.rose))),
        ]));
    if (ok != true) return;
    setState(() => _ending = true);
    try {
      await ApiClient.post('/driver/dispatches/${_d!.id}/end', {});
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally { if (mounted) setState(() => _ending = false); }
  }

  @override
  Widget build(BuildContext context) {
    final canStart = _d?.status == 'approved' || _d?.status == 'pending';
    final isActive = _d?.status == 'in_progress';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: Text(_d?.dispatchNo ?? 'Trip Detail'),
        actions: [if (_d != null) Padding(padding: const EdgeInsets.only(right: 16),
          child: StatusBadge(_d!.status))]),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _d == null ? const EmptyState(emoji: '❌', title: 'Not found')
        : ListView(padding: const EdgeInsets.all(16), children: [
          AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SectionLabel('Route', color: AppColors.cyan),
            RouteConnector(from: _d!.origin, to: _d!.destination),
          ])),
          AppCard(child: Column(children: [
            const SectionLabel('Trip Details'),
            InfoRow(label: 'Vehicle',     value: _d!.vehicleReg, valueColor: AppColors.cyan),
            InfoRow(label: 'Driver',      value: _d!.driverName),
            InfoRow(label: 'Date',        value: _fmt(_d!.date)),
            if (_d!.purpose != null) InfoRow(label: 'Purpose', value: _d!.purpose!),
            if (_d!.approvedBy != null) InfoRow(label: 'Approved By', value: _d!.approvedBy!),
            if (_d!.distance != null) InfoRow(label: 'Distance', value: '${_d!.distance} km',
              valueColor: AppColors.primary),
          ])),
          if (_d!.startTime != null || _d!.endTime != null)
            AppCard(child: Column(children: [
              const SectionLabel('Timing', color: AppColors.violet),
              InfoRow(label: 'Started', value: _fmt(_d!.startTime)),
              InfoRow(label: 'Ended',   value: _fmt(_d!.endTime)),
            ])),
          const SizedBox(height: 12),
          if (canStart) GradientButton(label: '▶   Start Trip', icon: Icons.play_arrow,
            colors: const [AppColors.emerald, Color(0xFF059669)],
            onPressed: _start, loading: _starting),
          if (isActive) ...[
            const SizedBox(height: 10),
            GradientButton(label: '🗺   Open Live Map', icon: Icons.map_outlined,
              onPressed: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => ActiveTripScreen(dispatch: _d!)))),
            const SizedBox(height: 10),
            GradientButton(label: '■   End Trip',
              colors: const [AppColors.rose, Color(0xFFE11D48)],
              onPressed: _end, loading: _ending),
          ],
          const SizedBox(height: 40),
        ]),
    );
  }
}
