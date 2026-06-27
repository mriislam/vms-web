import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../widgets/widgets.dart';

class RequestDetailScreen extends StatefulWidget {
  final int id;
  const RequestDetailScreen({super.key, required this.id});
  @override State<RequestDetailScreen> createState() => _RequestDetailScreenState();
}

class _RequestDetailScreenState extends State<RequestDetailScreen> {
  Requisition? _r;
  bool _loading = true;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient.get('/requisitions/${widget.id}');
      setState(() { _r = Requisition.fromJson(res['data'] as Map<String,dynamic>); });
    } catch (_) {}
    setState(() => _loading = false);
  }

  String _fmt(String? dt) {
    if (dt == null) return '—';
    try { return DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(dt)); }
    catch (_) { return dt; }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      title: Text(_r?.reqNo ?? 'Details'),
      actions: [if (_r != null) Padding(padding: const EdgeInsets.only(right: 16),
        child: StatusBadge(_r!.status))],
    ),
    body: _loading
      ? const Center(child: CircularProgressIndicator())
      : _r == null
      ? const EmptyState(emoji: '❌', title: 'Not found')
      : ListView(padding: const EdgeInsets.all(16), children: [

        // Trip info
        AppCard(child: Column(children: [
          const SectionLabel('Trip Information'),
          InfoRow(label: 'Requested By', value: _r!.requestedBy),
          InfoRow(label: 'Department',   value: _r!.department ?? '—'),
          InfoRow(label: 'Purpose',      value: _r!.purpose),
          InfoRow(label: 'Priority',     value: _r!.priority.toUpperCase(),
            valueColor: _r!.priority == 'urgent' ? AppColors.rose
                      : _r!.priority == 'high'   ? AppColors.amber : AppColors.emerald),
          InfoRow(label: 'Passengers',   value: '${_r!.passengers ?? 1}'),
        ])),

        // Route
        AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionLabel('Route', color: AppColors.cyan),
          RouteConnector(
            from: _r!.fromLocation ?? 'Not set',
            to:   _r!.toLocation   ?? 'Not set'),
          if (_r!.distanceKm != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primaryBg, borderRadius: BorderRadius.circular(10)),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.route, color: AppColors.primary, size: 16),
                const SizedBox(width: 6),
                Text('${_r!.distanceKm} km route distance',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
              ]),
            ),
          ],
        ])),

        // Schedule
        AppCard(child: Column(children: [
          const SectionLabel('Schedule', color: AppColors.violet),
          InfoRow(label: 'Request Date', value: _fmt(_r!.date)),
          InfoRow(label: 'Departure',    value: _fmt(_r!.fromDatetime)),
          InfoRow(label: 'Return',       value: _fmt(_r!.toDatetime)),
          InfoRow(label: 'Geofence',     value: '${_r!.geofenceRadiusM ?? 500} m radius'),
        ])),

        // Approval
        if (_r!.approvedBy != null) AppCard(child: Column(children: [
          const SectionLabel('Approval', color: AppColors.emerald),
          InfoRow(label: 'Approved By', value: _r!.approvedBy!,
            valueColor: AppColors.emerald),
          if (_r!.vehicleReg != null)
            InfoRow(label: 'Vehicle', value: _r!.vehicleReg!),
        ])),

        // Remarks
        if (_r!.remarks?.isNotEmpty == true) AppCard(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionLabel('Notes', color: AppColors.orange),
          Text(_r!.remarks!, style: const TextStyle(fontSize: 14,
            color: AppColors.textSub, height: 1.5)),
        ])),

        if (_r!.status == 'pending') ...[
          const SizedBox(height: 8),
          AppOutlineButton(label: 'Cancel Request', color: AppColors.rose,
            onPressed: () async {
              final ok = await showDialog<bool>(context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Cancel Booking'),
                  content: Text('Cancel ${_r!.reqNo}?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                    TextButton(onPressed: () => Navigator.pop(context, true),
                      child: const Text('Yes', style: TextStyle(color: AppColors.rose))),
                  ]));
              if (ok == true && mounted) {
                await ApiClient.delete('/requisitions/${_r!.id}');
                Navigator.pop(context);
              }
            }),
        ],
        const SizedBox(height: 40),
      ]),
  );
}
