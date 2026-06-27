import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});
  @override State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
  List<Requisition> _pending  = [];
  List<Vehicle>     _vehicles = [];
  List<Driver>      _drivers  = [];
  bool              _loading  = true;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.get('/requisitions'),
        ApiClient.get('/vehicles'),
        ApiClient.get('/drivers'),
      ]);
      setState(() {
        _pending  = (results[0]['data'] as List? ?? [])
          .map((j) => Requisition.fromJson(j as Map<String,dynamic>))
          .where((r) => r.status == 'pending').toList().reversed.toList();
        _vehicles = (results[1]['data'] as List? ?? [])
          .map((j) => Vehicle.fromJson(j as Map<String,dynamic>))
          .where((v) => v.status == 'active').toList();
        _drivers  = (results[2]['data'] as List? ?? [])
          .map((j) => Driver.fromJson(j as Map<String,dynamic>))
          .where((d) => d.status == 'active').toList();
      });
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _reject(Requisition r) async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(title: const Text('Reject Request'),
        content: Text('Reject ${r.reqNo}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Reject', style: TextStyle(color: AppColors.rose))),
        ]));
    if (ok != true) return;
    try {
      final user = context.read<AuthProvider>().user;
      await ApiClient.patch('/requisitions/${r.id}/status',
        {'status': 'rejected', 'approvedBy': user?.displayName ?? 'Admin'});
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _openApprove(Requisition r) {
    String? selVehicle, selDriver;
    showModalBottomSheet(
      context: context, isScrollControlled: true, useSafeArea: true,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setBS) => DraggableScrollableSheet(
        initialChildSize: 0.9, minChildSize: 0.5, maxChildSize: 0.95, expand: false,
        builder: (_, sc) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text('Approve — ${r.reqNo}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
            ]),
            const SizedBox(height: 4),
            Text('${r.requestedBy} · ${r.purpose}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const Divider(height: 24),

            // Trip summary
            Container(padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.bg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0x1F6366F1))),
              child: Column(children: [
                RouteConnector(from: r.fromLocation ?? '—', to: r.toLocation ?? '—'),
                const SizedBox(height: 10),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  _statCell('Date', r.date != null
                    ? DateFormat('dd MMM').format(DateTime.parse(r.date!)) : '—', AppColors.primary),
                  _statCell('Pax', '${r.passengers ?? 1}', AppColors.violet),
                  _statCell('Distance', r.distanceKm != null ? '${r.distanceKm} km' : '—', AppColors.cyan),
                ]),
              ]),
            ),
            const SizedBox(height: 16),

            // Vehicle picker
            const SectionLabel('Select Vehicle', color: AppColors.cyan),
            Expanded(child: ListView(controller: sc, children: [
              SizedBox(height: 100,
                child: ListView.builder(scrollDirection: Axis.horizontal,
                  itemCount: _vehicles.length,
                  itemBuilder: (_, i) {
                    final v = _vehicles[i];
                    final on = selVehicle == v.regNo;
                    return GestureDetector(
                      onTap: () => setBS(() => selVehicle = v.regNo),
                      child: Container(width: 140, margin: const EdgeInsets.only(right: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: on ? AppColors.primaryBg : AppColors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: on ? AppColors.primary : AppColors.border, width: 1.5)),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Icon(Icons.directions_car, color: AppColors.cyan, size: 22),
                          const SizedBox(height: 4),
                          Text(v.regNo, style: TextStyle(fontWeight: FontWeight.w800,
                            fontSize: 13, color: on ? AppColors.primary : AppColors.text)),
                          Text('${v.make} ${v.model}', style: const TextStyle(
                            fontSize: 11, color: AppColors.textMuted),
                            overflow: TextOverflow.ellipsis),
                        ])),
                    );
                  }),
              ),
              const SizedBox(height: 16),

              // Driver picker
              const SectionLabel('Select Driver', color: AppColors.violet),
              SizedBox(height: 110,
                child: ListView.builder(scrollDirection: Axis.horizontal,
                  itemCount: _drivers.length,
                  itemBuilder: (_, i) {
                    final d = _drivers[i];
                    final on = selDriver == d.name;
                    return GestureDetector(
                      onTap: () => setBS(() => selDriver = d.name),
                      child: Container(width: 130, margin: const EdgeInsets.only(right: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: on ? AppColors.primaryBg : AppColors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: on ? AppColors.primary : AppColors.border, width: 1.5)),
                        child: Column(children: [
                          CircleAvatar(radius: 20,
                            backgroundColor: AppColors.violet.withOpacity(0.15),
                            child: Text(d.name[0], style: const TextStyle(
                              color: AppColors.violet, fontWeight: FontWeight.w800, fontSize: 18))),
                          const SizedBox(height: 6),
                          Text(d.name, textAlign: TextAlign.center,
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12,
                              color: on ? AppColors.primary : AppColors.text),
                            maxLines: 2, overflow: TextOverflow.ellipsis),
                        ])),
                    );
                  }),
              ),
              const SizedBox(height: 20),

              GradientButton(
                label: 'Approve & Create Dispatch',
                colors: const [Color(0xFF059669), Color(0xFF0891B2)],
                icon: Icons.check_circle_outline,
                onPressed: () async {
                  if (selVehicle == null) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Please select a vehicle')));
                    return;
                  }
                  if (selDriver == null) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Please select a driver')));
                    return;
                  }
                  try {
                    final user = context.read<AuthProvider>().user;
                    await ApiClient.patch('/requisitions/${r.id}/status',
                      {'status': 'approved', 'approvedBy': user?.displayName ?? 'Admin'});
                    await ApiClient.post('/vehicle-requisition', {
                      'vehicleReg':  selVehicle,
                      'driverName':  selDriver,
                      'origin':      (r.fromLocation ?? 'N/A').substring(0, (r.fromLocation?.length ?? 0).clamp(0, 100)),
                      'destination': (r.toLocation   ?? 'N/A').substring(0, (r.toLocation?.length   ?? 0).clamp(0, 100)),
                      'date':        r.date ?? r.fromDatetime?.substring(0, 10),
                      'startTime':   r.fromDatetime,
                      'distance':    r.distanceKm,
                      'purpose':     r.purpose,
                      'approvedBy':  user?.displayName ?? 'Admin',
                      'status':      'approved',
                    });
                    Navigator.pop(ctx);
                    _load();
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('✓ Approved & dispatch created'),
                        backgroundColor: AppColors.emerald));
                  } catch (e) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString()), backgroundColor: AppColors.rose));
                  }
                },
              ),
            ])),
          ]),
        ),
      )),
    );
  }

  void _openEdit(Requisition r) {
    final fromCtrl  = TextEditingController(text: r.fromLocation);
    final toCtrl    = TextEditingController(text: r.toLocation);
    final remarkCtrl = TextEditingController(text: r.remarks);
    showModalBottomSheet(context: context, isScrollControlled: true,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20,
          MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Edit Request — ${r.reqNo}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          TextField(controller: fromCtrl,
            decoration: const InputDecoration(labelText: 'Pickup Location (From)')),
          const SizedBox(height: 12),
          TextField(controller: toCtrl,
            decoration: const InputDecoration(labelText: 'Destination (To)')),
          const SizedBox(height: 12),
          TextField(controller: remarkCtrl, maxLines: 2,
            decoration: const InputDecoration(labelText: 'Remarks / Instructions')),
          const SizedBox(height: 16),
          GradientButton(label: 'Save Changes', icon: Icons.save,
            onPressed: () async {
              try {
                await ApiClient.put('/requisitions/${r.id}', {
                  ...r.toJson(),
                  'fromLocation': fromCtrl.text,
                  'toLocation':   toCtrl.text,
                  'remarks':      remarkCtrl.text,
                });
                Navigator.pop(ctx);
                _load();
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(e.toString())));
              }
            }),
        ]),
      ));
  }

  Widget _statCell(String label, String value, Color color) => Column(children: [
    Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
    Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
  ]);

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: GradientHeader(
      title: 'Pending Approvals',
      subtitle: '${_pending.length} requests',
      color1: const Color(0xFF059669), color2: const Color(0xFF0891B2),
    ),
    body: _loading
      ? const Center(child: CircularProgressIndicator())
      : _pending.isEmpty
      ? const EmptyState(emoji: '✅', title: 'All clear!',
          subtitle: 'No pending approvals right now')
      : RefreshIndicator(onRefresh: _load,
          child: ListView.builder(
            padding: const EdgeInsets.all(14),
            itemCount: _pending.length,
            itemBuilder: (_, i) {
              final r = _pending[i];
              return AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(r.reqNo, style: const TextStyle(fontWeight: FontWeight.w800,
                      fontSize: 15, color: AppColors.primary)),
                    Text(r.requestedBy, style: const TextStyle(
                      color: AppColors.textSub, fontSize: 13)),
                  ]),
                  Row(children: [PriorityBadge(r.priority), const SizedBox(width: 6),
                    if (r.department != null) Chip(label: Text(r.department!,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                      visualDensity: VisualDensity.compact,
                      backgroundColor: AppColors.primaryBg)]),
                ]),
                const SizedBox(height: 8),
                Text(r.purpose, style: const TextStyle(fontSize: 14),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 10),
                RouteConnector(from: r.fromLocation ?? '—', to: r.toLocation ?? '—'),
                const SizedBox(height: 10),
                Wrap(spacing: 14, children: [
                  if (r.fromDatetime != null)
                    _metaChip(Icons.calendar_today, DateFormat('dd MMM yy HH:mm')
                      .format(DateTime.parse(r.fromDatetime!))),
                  _metaChip(Icons.people, '${r.passengers ?? 1} pax'),
                  if (r.distanceKm != null) _metaChip(Icons.route, '${r.distanceKm} km'),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _actionBtn('✕ Reject', AppColors.rose, () => _reject(r)),
                  const SizedBox(width: 8),
                  _actionBtn('✎ Edit', AppColors.amber, () => _openEdit(r)),
                  const SizedBox(width: 8),
                  Expanded(child: GestureDetector(
                    onTap: () => _openApprove(r),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.emerald,
                        borderRadius: BorderRadius.circular(10)),
                      child: const Text('✓ Approve',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    ))),
                ]),
              ]));
            })),
  );

  Widget _metaChip(IconData icon, String label) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 12, color: AppColors.textMuted),
    const SizedBox(width: 3),
    Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
  ]);

  Widget _actionBtn(String label, Color color, VoidCallback onTap) =>
    GestureDetector(onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          border: Border.all(color: color, width: 1.5),
          borderRadius: BorderRadius.circular(10)),
        child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
      ));
}
