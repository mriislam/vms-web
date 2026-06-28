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
  List<Requisition> _all      = [];
  List<Vehicle>     _vehicles = [];
  List<Driver>      _drivers  = [];
  bool              _loading  = true;

  // Per-section "show all" toggles
  bool _showAllPending    = false;
  bool _showAllApproved   = false;
  bool _showAllInProgress = false;

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
        _all      = (results[0]['data'] as List? ?? [])
          .map((j) => Requisition.fromJson(j as Map<String,dynamic>)).toList().reversed.toList();
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

  List<Requisition> _byStatus(String status) =>
    _all.where((r) => r.status == status).toList();

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
        initialChildSize: 0.88, minChildSize: 0.5, maxChildSize: 0.95, expand: false,
        builder: (_, sc) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text('Approve — ${r.reqNo}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
            ]),
            Text('${r.requestedBy} · ${r.purpose}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const Divider(height: 24),
            // Trip summary
            Container(padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.bg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0x1F6366F1))),
              child: RouteConnector(from: r.fromLocation ?? '—', to: r.toLocation ?? '—')),
            const SizedBox(height: 16),
            const Text('SELECT VEHICLE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
              color: AppColors.cyan, letterSpacing: 0.8)),
            const SizedBox(height: 8),
            SizedBox(height: 90,
              child: ListView.builder(scrollDirection: Axis.horizontal,
                itemCount: _vehicles.length,
                itemBuilder: (_, i) {
                  final v = _vehicles[i]; final on = selVehicle == v.regNo;
                  return GestureDetector(onTap: () => setBS(() => selVehicle = v.regNo),
                    child: Container(width: 140, margin: const EdgeInsets.only(right: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: on ? AppColors.primaryBg : AppColors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: on ? AppColors.primary : AppColors.border, width: 1.5)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Icon(Icons.directions_car, color: AppColors.cyan, size: 20),
                        const SizedBox(height: 4),
                        Text(v.regNo, style: TextStyle(fontWeight: FontWeight.w800,
                          fontSize: 12, color: on ? AppColors.primary : AppColors.text)),
                        Text('${v.make} ${v.model}', style: const TextStyle(
                          fontSize: 10, color: AppColors.textMuted), overflow: TextOverflow.ellipsis),
                      ])));
                })),
            const SizedBox(height: 14),
            const Text('SELECT DRIVER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
              color: AppColors.violet, letterSpacing: 0.8)),
            const SizedBox(height: 8),
            SizedBox(height: 100,
              child: ListView.builder(scrollDirection: Axis.horizontal,
                itemCount: _drivers.length,
                itemBuilder: (_, i) {
                  final d = _drivers[i]; final on = selDriver == d.name;
                  return GestureDetector(onTap: () => setBS(() => selDriver = d.name),
                    child: Container(width: 120, margin: const EdgeInsets.only(right: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: on ? AppColors.primaryBg : AppColors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: on ? AppColors.primary : AppColors.border, width: 1.5)),
                      child: Column(children: [
                        CircleAvatar(radius: 18, backgroundColor: AppColors.violet.withOpacity(0.15),
                          child: Text(d.name[0], style: const TextStyle(color: AppColors.violet, fontWeight: FontWeight.w800))),
                        const SizedBox(height: 4),
                        Text(d.name, textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11,
                            color: on ? AppColors.primary : AppColors.text),
                          maxLines: 2, overflow: TextOverflow.ellipsis),
                      ])));
                })),
            const SizedBox(height: 20),
            GradientButton(label: 'Approve & Create Dispatch',
              colors: const [Color(0xFF059669), Color(0xFF0891B2)],
              icon: Icons.check_circle_outline,
              onPressed: () async {
                if (selVehicle == null || selDriver == null) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(content: Text('Select vehicle and driver')));
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
              }),
          ]),
        ),
      )),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pending    = _byStatus('pending');
    final approved   = _byStatus('approved');
    final inProgress = _byStatus('in_progress');

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: GradientHeader(
        title: 'Trip Management',
        subtitle: '${pending.length} pending · ${inProgress.length} active',
        color1: const Color(0xFF059669), color2: const Color(0xFF0891B2),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(padding: const EdgeInsets.all(14), children: [

              // ── SECTION 1: PENDING ──────────────────────────────────────────
              _SectionHeader(
                title: 'PENDING APPROVALS',
                count: pending.length,
                color: AppColors.amber,
                icon: Icons.pending_actions,
              ),
              if (pending.isEmpty)
                _emptyTile('No pending requests')
              else ...[
                ...(_showAllPending ? pending : pending.take(3))
                  .map((r) => _buildCard(r, showActions: true)),
                if (pending.length > 3)
                  _ViewAllButton(
                    showing: _showAllPending,
                    total: pending.length,
                    onTap: () => setState(() => _showAllPending = !_showAllPending),
                  ),
              ],
              const SizedBox(height: 16),

              // ── SECTION 2: APPROVED (waiting to start) ──────────────────────
              _SectionHeader(
                title: 'APPROVED — WAITING TO START',
                count: approved.length,
                color: AppColors.emerald,
                icon: Icons.check_circle_outline,
              ),
              if (approved.isEmpty)
                _emptyTile('No approved trips waiting')
              else ...[
                ...(_showAllApproved ? approved : approved.take(3))
                  .map((r) => _buildCard(r, showActions: false)),
                if (approved.length > 3)
                  _ViewAllButton(
                    showing: _showAllApproved,
                    total: approved.length,
                    onTap: () => setState(() => _showAllApproved = !_showAllApproved),
                  ),
              ],
              const SizedBox(height: 16),

              // ── SECTION 3: IN PROGRESS (live now) ──────────────────────────
              _SectionHeader(
                title: 'LIVE NOW — IN PROGRESS',
                count: inProgress.length,
                color: AppColors.primary,
                icon: Icons.directions_car,
                isLive: true,
              ),
              if (inProgress.isEmpty)
                _emptyTile('No trips currently in progress')
              else ...[
                ...(_showAllInProgress ? inProgress : inProgress.take(3))
                  .map((r) => _buildCard(r, showActions: false)),
                if (inProgress.length > 3)
                  _ViewAllButton(
                    showing: _showAllInProgress,
                    total: inProgress.length,
                    onTap: () => setState(() => _showAllInProgress = !_showAllInProgress),
                  ),
              ],
              const SizedBox(height: 40),
            ]),
          ),
    );
  }

  Widget _emptyTile(String msg) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
    decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0x1F6366F1))),
    child: Text(msg, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)));

  Widget _buildCard(Requisition r, {required bool showActions}) {
    final priorityClr = r.priority == 'urgent' ? AppColors.rose
        : r.priority == 'high' ? AppColors.amber : AppColors.emerald;
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(r.reqNo, style: const TextStyle(fontWeight: FontWeight.w800,
            fontSize: 14, color: AppColors.primary)),
          const Spacer(),
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: priorityClr.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
            child: Text(r.priority?.toUpperCase() ?? '', style: TextStyle(color: priorityClr, fontSize: 10, fontWeight: FontWeight.w800))),
          const SizedBox(width: 6),
          if (r.department != null) Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: const Color(0xFFEEF1FF), borderRadius: BorderRadius.circular(20)),
            child: Text(r.department!, style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w700))),
        ]),
        const SizedBox(height: 4),
        Text(r.requestedBy, style: const TextStyle(color: AppColors.textSub, fontSize: 12)),
        const SizedBox(height: 8),
        Text(r.purpose, style: const TextStyle(fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        RouteConnector(from: r.fromLocation ?? '—', to: r.toLocation ?? '—'),
        if (r.fromDatetime != null) ...[
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.calendar_today, size: 12, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text(DateFormat('dd MMM yy HH:mm').format(DateTime.parse(r.fromDatetime!)),
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            const SizedBox(width: 12),
            const Icon(Icons.people, size: 12, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text('${r.passengers ?? 1} pax', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          ]),
        ],
        if (showActions) ...[
          const SizedBox(height: 12),
          Row(children: [
            _actionBtn('✕ Reject', AppColors.rose, () => _reject(r)),
            const SizedBox(width: 8),
            Expanded(child: GestureDetector(
              onTap: () => _openApprove(r),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 9),
                alignment: Alignment.center,
                decoration: BoxDecoration(color: AppColors.emerald, borderRadius: BorderRadius.circular(10)),
                child: const Text('✓ Approve', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700))))),
          ]),
        ],
      ]),
    );
  }

  Widget _actionBtn(String label, Color color, VoidCallback onTap) =>
    GestureDetector(onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(border: Border.all(color: color, width: 1.5), borderRadius: BorderRadius.circular(10)),
        child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13))));
}

// ── Section header ─────────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String  title;
  final int     count;
  final Color   color;
  final IconData icon;
  final bool    isLive;
  const _SectionHeader({required this.title, required this.count,
    required this.color, required this.icon, this.isLive = false});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      Container(width: 4, height: 20, decoration: BoxDecoration(
        color: color, borderRadius: BorderRadius.circular(3))),
      const SizedBox(width: 8),
      if (isLive) ...[
        Container(width: 8, height: 8, decoration: BoxDecoration(
          color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
      ],
      Icon(icon, size: 15, color: color),
      const SizedBox(width: 6),
      Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800,
        color: color, letterSpacing: 0.5)),
      const Spacer(),
      Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
        child: Text('$count', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color))),
    ]),
  );
}

// ── View All button ───────────────────────────────────────────────────────────
class _ViewAllButton extends StatelessWidget {
  final bool showing;
  final int  total;
  final VoidCallback onTap;
  const _ViewAllButton({required this.showing, required this.total, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0x1F6366F1)),
        borderRadius: BorderRadius.circular(10),
        color: AppColors.white),
      child: Text(
        showing ? 'Show less ↑' : 'View all $total →',
        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13))));
}
