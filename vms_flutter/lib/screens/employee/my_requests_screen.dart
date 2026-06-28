import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';
import 'new_request_screen.dart';
import 'request_detail_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});
  @override State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  List<Requisition> _all      = [];
  List<Requisition> _filtered = [];
  bool              _loading  = true;
  String            _tab      = 'all';
  String            _search   = '';
  final _searchCtrl = TextEditingController();

  final _tabs = ['all', 'pending', 'approved', 'in_progress', 'completed', 'rejected'];

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final user = context.read<AuthProvider>().user;
      final res  = await ApiClient.get('/requisitions');
      final list = (res['data'] as List? ?? [])
          .map((j) => Requisition.fromJson(j as Map<String, dynamic>))
          .where((r) => r.requestedBy == user?.displayName)
          .toList().reversed.toList();
      setState(() { _all = list; _applyFilter(); });
    } catch (_) {}
    setState(() => _loading = false);
  }

  void _applyFilter() {
    setState(() {
      _filtered = _all.where((r) {
        final matchTab    = _tab == 'all' || r.status == _tab;
        final matchSearch = _search.isEmpty ||
            r.reqNo.toLowerCase().contains(_search) ||
            r.purpose.toLowerCase().contains(_search) ||
            (r.fromLocation ?? '').toLowerCase().contains(_search) ||
            (r.toLocation   ?? '').toLowerCase().contains(_search);
        return matchTab && matchSearch;
      }).toList();
    });
  }

  Future<void> _cancel(Requisition r) async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Request'),
        content: Text('Cancel booking ${r.reqNo}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Yes', style: TextStyle(color: AppColors.rose))),
        ],
      ));
    if (ok == true) {
      try { await ApiClient.delete('/requisitions/${r.id}'); _load(); }
      catch (e) { if (mounted) ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(e.toString()))); }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: GradientHeader(
      title:    'My Bookings',
      subtitle: '${_filtered.length} requisitions',
    ),
    body: Column(children: [
      // Status tabs — CAPS, scrollable
      Container(
        color: AppColors.white,
        height: 44,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          itemCount: _tabs.length,
          itemBuilder: (_, i) {
            final t  = _tabs[i];
            final on = t == _tab;
            return GestureDetector(
              onTap: () { setState(() => _tab = t); _applyFilter(); },
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: on ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: on ? AppColors.primary : const Color(0xFFE2E8F0))),
                alignment: Alignment.center,
                child: Text(t.replaceAll('_', ' ').toUpperCase(),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                    color: on ? Colors.white : AppColors.textMuted)),
              ),
            );
          }),
      ),

      // List
      Expanded(child: _loading
        ? const Center(child: CircularProgressIndicator())
        : _filtered.isEmpty
        ? const EmptyState(emoji: '📋', title: 'No bookings',
            subtitle: 'Tap + to create a new vehicle request')
        : RefreshIndicator(onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: _filtered.length,
              itemBuilder: (_, i) => _buildCard(_filtered[i])))),
    ]),
    floatingActionButton: FloatingActionButton(
      backgroundColor: AppColors.primary,
      onPressed: () async {
        await Navigator.push(context, MaterialPageRoute(builder: (_) => const NewRequestScreen()));
        _load();
      },
      child: const Icon(Icons.add, color: Colors.white),
    ),
  );

  Widget _buildCard(Requisition r) {
    final depClr = r.priority == 'urgent' ? AppColors.rose
                 : r.priority == 'high'   ? AppColors.amber : AppColors.emerald;
    return AppCard(
      onTap: () async {
        await Navigator.push(context, MaterialPageRoute(
          builder: (_) => RequestDetailScreen(id: r.id)));
        _load();
      },
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(r.reqNo, style: const TextStyle(fontWeight: FontWeight.w800,
            fontSize: 15, color: AppColors.primary)),
          Row(children: [PriorityBadge(r.priority), const SizedBox(width: 6), StatusBadge(r.status)]),
        ]),
        const SizedBox(height: 8),
        Text(r.purpose, style: const TextStyle(fontSize: 14, color: AppColors.text),
          maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 10),
        RouteConnector(from: r.fromLocation ?? 'Not set', to: r.toLocation ?? 'Not set'),
        const SizedBox(height: 10),
        Wrap(spacing: 14, children: [
          if (r.fromDatetime != null)
            _metaChip(Icons.calendar_today, _fmt(r.fromDatetime!)),
          _metaChip(Icons.people, '${r.passengers ?? 1} pax'),
          if (r.distanceKm != null)
            _metaChip(Icons.route, '${r.distanceKm} km'),
        ]),
        if (r.status == 'pending') ...[
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => _cancel(r),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 7),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.rose),
                borderRadius: BorderRadius.circular(10)),
              child: const Text('Cancel Request',
                style: TextStyle(color: AppColors.rose, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ]),
    );
  }

  Widget _metaChip(IconData icon, String label) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 13, color: AppColors.textMuted),
    const SizedBox(width: 4),
    Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
  ]);

  String _fmt(String dt) {
    try { return DateFormat('dd MMM yy HH:mm').format(DateTime.parse(dt)); }
    catch (_) { return dt; }
  }
}
