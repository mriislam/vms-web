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
  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen>
    with SingleTickerProviderStateMixin {
  List<Requisition> _all = [];
  List<dynamic> _dispatches = [];
  List<Vehicle> _vehicles = [];
  List<Driver> _drivers = [];
  bool _loading = true;

  late TabController _tabController;

  // Per-section "show all" toggles
  bool _showAllPending = false;
  bool _showAllApproved = false;
  bool _showAllInProgress = false;

  // Active trips search & filter
  final TextEditingController _searchCtrl = TextEditingController();
  String _statusFilter = 'All Status';   // actual filter value sent to API
  String _statusDropdownValue = 'All Status'; // display value shown in dropdown
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
    _searchCtrl.addListener(() {
      setState(() => _searchQuery = _searchCtrl.text.toLowerCase());
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.get('/requisitions'),
        ApiClient.get('/vehicles'),
        ApiClient.get('/drivers'),
        ApiClient.get('/vehicle-requisition'),
      ]);
      setState(() {
        _all = (results[0]['data'] as List? ?? [])
            .map((j) => Requisition.fromJson(j as Map<String, dynamic>))
            .toList()
            .reversed
            .toList();
        _vehicles = (results[1]['data'] as List? ?? [])
            .map((j) => Vehicle.fromJson(j as Map<String, dynamic>))
            .where((v) => v.status == 'active')
            .toList();
        _drivers = (results[2]['data'] as List? ?? [])
            .map((j) => Driver.fromJson(j as Map<String, dynamic>))
            .where((d) => d.status == 'active')
            .toList();
        _dispatches = (results[3]['data'] as List? ?? []).reversed.toList();
      });
    } catch (_) {}
    setState(() => _loading = false);
  }

  List<Requisition> _byStatus(String status) =>
      _all.where((r) => r.status == status).toList();

  List<dynamic> get _filteredDispatches {
    return _dispatches.where((d) {
      final matchSearch = _searchQuery.isEmpty ||
          (d['dispatchNo'] ?? '').toString().toLowerCase().contains(_searchQuery) ||
          (d['vehicleReg'] ?? '').toString().toLowerCase().contains(_searchQuery) ||
          (d['driverName'] ?? '').toString().toLowerCase().contains(_searchQuery);
      final matchStatus = _statusFilter == 'All Status' ||
          (d['status'] ?? '').toString().toLowerCase() ==
              _statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    }).toList();
  }

  /// Groups filtered dispatches by date, sorted chronologically.
  Map<String, List<dynamic>> get _groupedDispatches {
    final Map<String, List<dynamic>> groups = {};
    for (final d in _filteredDispatches) {
      String dateKey = 'Unknown Date';
      try {
        final raw = d['date'] ?? d['startTime'] ?? '';
        if (raw.toString().isNotEmpty) {
          final dt = DateTime.parse(raw.toString());
          dateKey = DateFormat('dd MMM yyyy').format(dt);
        }
      } catch (_) {}
      groups.putIfAbsent(dateKey, () => []).add(d);
    }
    // Sort keys chronologically
    final sortedEntries = groups.entries.toList()
      ..sort((a, b) {
        try {
          return DateFormat('dd MMM yyyy')
              .parse(a.key)
              .compareTo(DateFormat('dd MMM yyyy').parse(b.key));
        } catch (_) {
          return 0;
        }
      });
    return Map.fromEntries(sortedEntries);
  }

  Future<void> _reject(Requisition r) async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
            title: const Text('Reject Request'),
            content: Text('Reject ${r.reqNo}?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel')),
              TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Reject',
                      style: TextStyle(color: AppColors.rose))),
            ]));
    if (ok != true) return;
    try {
      final user = context.read<AuthProvider>().user;
      await ApiClient.patch('/requisitions/${r.id}/status',
          {'status': 'rejected', 'approvedBy': user?.displayName ?? 'Admin'});
      _load();
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _openApprove(Requisition r) {
    String? selVehicle, selDriver;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
          builder: (ctx, setBS) => DraggableScrollableSheet(
            initialChildSize: 0.88,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder: (_, sc) => Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                          child: Text('Approve — ${r.reqNo}',
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800))),
                      IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx)),
                    ]),
                    Text('${r.requestedBy} · ${r.purpose}',
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 13)),
                    const Divider(height: 24),
                    Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                            color: AppColors.bg,
                            borderRadius: BorderRadius.circular(14),
                            border:
                            Border.all(color: const Color(0x1F6366F1))),
                        child: RouteConnector(
                            from: r.fromLocation ?? '—',
                            to: r.toLocation ?? '—')),
                    const SizedBox(height: 16),
                    const Text('SELECT VEHICLE',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors.cyan,
                            letterSpacing: 0.8)),
                    const SizedBox(height: 8),
                    SizedBox(
                        height: 90,
                        child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: _vehicles.length,
                            itemBuilder: (_, i) {
                              final v = _vehicles[i];
                              final on = selVehicle == v.regNo;
                              return GestureDetector(
                                  onTap: () =>
                                      setBS(() => selVehicle = v.regNo),
                                  child: Container(
                                      width: 140,
                                      margin:
                                      const EdgeInsets.only(right: 10),
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                          color: on
                                              ? AppColors.primaryBg
                                              : AppColors.white,
                                          borderRadius:
                                          BorderRadius.circular(12),
                                          border: Border.all(
                                              color: on
                                                  ? AppColors.primary
                                                  : AppColors.border,
                                              width: 1.5)),
                                      child: Column(
                                          crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                          children: [
                                            const Icon(Icons.directions_car,
                                                color: AppColors.cyan,
                                                size: 20),
                                            const SizedBox(height: 4),
                                            Text(v.regNo,
                                                style: TextStyle(
                                                    fontWeight:
                                                    FontWeight.w800,
                                                    fontSize: 12,
                                                    color: on
                                                        ? AppColors.primary
                                                        : AppColors.text)),
                                            Text('${v.make} ${v.model}',
                                                style: const TextStyle(
                                                    fontSize: 10,
                                                    color: AppColors
                                                        .textMuted),
                                                overflow:
                                                TextOverflow.ellipsis),
                                          ])));
                            })),
                    const SizedBox(height: 14),
                    const Text('SELECT DRIVER',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors.violet,
                            letterSpacing: 0.8)),
                    const SizedBox(height: 8),
                    SizedBox(
                        height: 100,
                        child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: _drivers.length,
                            itemBuilder: (_, i) {
                              final d = _drivers[i];
                              final on = selDriver == d.name;
                              return GestureDetector(
                                  onTap: () =>
                                      setBS(() => selDriver = d.name),
                                  child: Container(
                                      width: 120,
                                      margin:
                                      const EdgeInsets.only(right: 10),
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                          color: on
                                              ? AppColors.primaryBg
                                              : AppColors.white,
                                          borderRadius:
                                          BorderRadius.circular(12),
                                          border: Border.all(
                                              color: on
                                                  ? AppColors.primary
                                                  : AppColors.border,
                                              width: 1.5)),
                                      child: Column(children: [
                                        CircleAvatar(
                                            radius: 18,
                                            backgroundColor: AppColors
                                                .violet
                                                .withOpacity(0.15),
                                            child: Text(d.name[0],
                                                style: const TextStyle(
                                                    color: AppColors.violet,
                                                    fontWeight:
                                                    FontWeight.w800))),
                                        const SizedBox(height: 4),
                                        Text(d.name,
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 11,
                                                color: on
                                                    ? AppColors.primary
                                                    : AppColors.text),
                                            maxLines: 2,
                                            overflow:
                                            TextOverflow.ellipsis),
                                      ])));
                            })),
                    const SizedBox(height: 20),
                    GradientButton(
                        label: 'Approve & Create Dispatch',
                        colors: const [
                          Color(0xFF059669),
                          Color(0xFF0891B2)
                        ],
                        icon: Icons.check_circle_outline,
                        onPressed: () async {
                          if (selVehicle == null || selDriver == null) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(
                                    content:
                                    Text('Select vehicle and driver')));
                            return;
                          }
                          try {
                            final user = context.read<AuthProvider>().user;
                            await ApiClient.patch(
                                '/requisitions/${r.id}/status', {
                              'status': 'approved',
                              'approvedBy': user?.displayName ?? 'Admin'
                            });
                            await ApiClient.post('/vehicle-requisition', {
                              'vehicleReg': selVehicle,
                              'driverName': selDriver,
                              'origin': (r.fromLocation ?? 'N/A').substring(
                                  0,
                                  (r.fromLocation?.length ?? 0)
                                      .clamp(0, 100)),
                              'destination': (r.toLocation ?? 'N/A')
                                  .substring(
                                  0,
                                  (r.toLocation?.length ?? 0)
                                      .clamp(0, 100)),
                              'date': r.date ??
                                  r.fromDatetime?.substring(0, 10),
                              'startTime': r.fromDatetime,
                              'distance': r.distanceKm,
                              'purpose': r.purpose,
                              'approvedBy': user?.displayName ?? 'Admin',
                              'status': 'approved',
                            });
                            Navigator.pop(ctx);
                            _load();
                            if (mounted)
                              ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          '✓ Approved & dispatch created'),
                                      backgroundColor: AppColors.emerald));
                          } catch (e) {
                            if (mounted)
                              ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                      content: Text(e.toString()),
                                      backgroundColor: AppColors.rose));
                          }
                        }),
                  ]),
            ),
          )),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pending = _byStatus('pending');
    final approved = _byStatus('approved');
    final inProgress = _byStatus('in_progress');

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: GradientHeader(
        title: 'Trip Management',
        subtitle: '${pending.length} pending · ${inProgress.length} active',
        color1: const Color(0xFF059669),
        color2: const Color(0xFF0891B2),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
        // ── Custom TabBar (sits below GradientHeader) ──────────────────
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF059669), Color(0xFF0891B2)],
            ),
          ),
          child: TabBar(
            controller: _tabController,
            indicatorColor: Colors.white,
            indicatorWeight: 3,
            indicatorSize: TabBarIndicatorSize.tab,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white60,
            labelStyle: const TextStyle(
                fontWeight: FontWeight.w700, fontSize: 13),
            tabs: [
              Tab(
                child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.pending_actions, size: 16),
                      const SizedBox(width: 6),
                      const Text('Pending'),
                      if (pending.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: Colors.white24,
                              borderRadius: BorderRadius.circular(10)),
                          child: Text('${pending.length}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800)),
                        ),
                      ]
                    ]),
              ),
              Tab(
                child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.directions_car, size: 16),
                      const SizedBox(width: 6),
                      const Text('Active Trips'),
                      if (_dispatches.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: Colors.white24,
                              borderRadius: BorderRadius.circular(10)),
                          child: Text('${_dispatches.length}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800)),
                        ),
                      ]
                    ]),
              ),
            ],
          ),
        ),
        // ── Tab content ─────────────────────────────────────────────────
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              // ── TAB 1: PENDING ──────────────────────────────────────────
              RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
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
                        _ViewAllButton(
                          showing: _showAllPending,
                          total: pending.length,
                          onTap: () => setState(
                                  () => _showAllPending = !_showAllPending),
                        ),
                      ],
                      const SizedBox(height: 16),
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
                            onTap: () => setState(
                                    () => _showAllApproved = !_showAllApproved),
                          ),
                      ],
                      const SizedBox(height: 16),
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
                        ...(_showAllInProgress
                            ? inProgress
                            : inProgress.take(3))
                            .map((r) => _buildCard(r, showActions: false)),
                        if (inProgress.length > 3)
                          _ViewAllButton(
                            showing: _showAllInProgress,
                            total: inProgress.length,
                            onTap: () => setState(() =>
                            _showAllInProgress = !_showAllInProgress),
                          ),
                      ],
                      const SizedBox(height: 40),
                    ]),
              ),

              // ── TAB 2: ACTIVE TRIPS ─────────────────────────────────────
              RefreshIndicator(
                onRefresh: _load,
                child: Column(children: [
                  // Search + Filter bar
                  Container(
                    color: AppColors.white,
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    child: Row(children: [
                      Expanded(
                        child: Container(
                          height: 40,
                          decoration: BoxDecoration(
                              color: AppColors.bg,
                              borderRadius: BorderRadius.circular(10),
                              // border: Border.all(
                              //     color: const Color(0x1F6366F1))
                          ),
                          child: TextField(
                            controller: _searchCtrl,
                            style: const TextStyle(fontSize: 13),
                            decoration: const InputDecoration(
                              hintText:
                              'Search dispatch no, vehicle, driver...',
                              hintStyle: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMuted),
                              prefixIcon: Icon(Icons.search,
                                  size: 18, color: AppColors.textMuted),
                              border: InputBorder.none,
                              contentPadding:
                              EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      _StatusDropdown(
                        value: _statusDropdownValue,
                        onChanged: (v) => setState(() {
                          _statusDropdownValue = v ?? 'All Status';
                          if (v?.toLowerCase() == 'in progress') {
                            _statusFilter = 'in_progress';
                          } else {
                            _statusFilter = v ?? 'All Status';
                          }
                        }),
                      ),
                    ]),
                  ),
                  const Divider(height: 1),
                  // Dispatch cards list
                  Expanded(
                    child: _filteredDispatches.isEmpty
                        ? Center(
                        child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.local_shipping_outlined,
                                  size: 48,
                                  color: AppColors.textMuted
                                      .withOpacity(0.4)),
                              const SizedBox(height: 12),
                              const Text('No dispatches found',
                                  style: TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 14)),
                            ]))
                        : _DateGroupedList(groups: _groupedDispatches),
                  ),
                ]),
              ),
            ],
          ),
        ),
      ]),
    );
  }

  Widget _emptyTile(String msg) => Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x1F6366F1))),
      child: Text(msg,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 13)));

  Widget _buildCard(Requisition r, {required bool showActions}) {
    final priorityClr = r.priority == 'urgent'
        ? AppColors.rose
        : r.priority == 'high'
        ? AppColors.amber
        : AppColors.emerald;
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(r.reqNo,
              style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: AppColors.primary)),
          const Spacer(),
          Container(
              padding:
              const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: priorityClr.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20)),
              child: Text(r.priority?.toUpperCase() ?? '',
                  style: TextStyle(
                      color: priorityClr,
                      fontSize: 10,
                      fontWeight: FontWeight.w800))),
          const SizedBox(width: 6),
          if (r.department != null)
            Container(
                padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: const Color(0xFFEEF1FF),
                    borderRadius: BorderRadius.circular(20)),
                child: Text(r.department!,
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700))),
        ]),
        const SizedBox(height: 4),
        Text(r.requestedBy,
            style:
            const TextStyle(color: AppColors.textSub, fontSize: 12)),
        const SizedBox(height: 8),
        Text(r.purpose,
            style: const TextStyle(fontSize: 13),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        RouteConnector(
            from: r.fromLocation ?? '—', to: r.toLocation ?? '—'),
        if (r.fromDatetime != null) ...[
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.calendar_today,
                size: 12, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text(
                DateFormat('dd MMM yy HH:mm')
                    .format(DateTime.parse(r.fromDatetime!)),
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textMuted)),
            const SizedBox(width: 12),
            const Icon(Icons.people, size: 12, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text('${r.passengers ?? 1} pax',
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textMuted)),
          ]),
        ],
        if (showActions) ...[
          const SizedBox(height: 12),
          Row(children: [
            _actionBtn('✕ Reject', AppColors.rose, () => _reject(r)),
            const SizedBox(width: 8),
            Expanded(
                child: GestureDetector(
                    onTap: () => _openApprove(r),
                    child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                            color: AppColors.emerald,
                            borderRadius: BorderRadius.circular(10)),
                        child: const Text('✓ Approve',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700))))),
          ]),
        ],
      ]),
    );
  }

  Widget _actionBtn(String label, Color color, VoidCallback onTap) =>
      GestureDetector(
          onTap: onTap,
          child: Container(
              padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                  border: Border.all(color: color, width: 1.5),
                  borderRadius: BorderRadius.circular(10)),
              child: Text(label,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 13))));
}

// ── Date-grouped list (Active Trips tab) ─────────────────────────────────────
class _DateGroupedList extends StatelessWidget {
  final Map<String, List<dynamic>> groups;
  const _DateGroupedList({required this.groups});

  @override
  Widget build(BuildContext context) {
    final dateKeys = groups.keys.toList();

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 30),
      itemCount: dateKeys.length,
      itemBuilder: (_, i) {
        final dateKey = dateKeys[i];
        final items = groups[dateKey]!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Date header ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 10),
              child: Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF059669), Color(0xFF0891B2)],
                      ),
                      borderRadius: BorderRadius.circular(20)),
                  child: Text(dateKey,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3)),
                ),
                const SizedBox(width: 10),
                Expanded(
                    child: Divider(
                        color: const Color(0x1F6366F1), thickness: 1)),
                const SizedBox(width: 8),
                Container(
                  padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                      color: const Color(0x1F6366F1),
                      borderRadius: BorderRadius.circular(12)),
                  child: Text('${items.length} trip${items.length > 1 ? 's' : ''}',
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted)),
                ),
              ]),
            ),
            // ── Cards for this date ──────────────────────────────────────
            ...items.asMap().entries.map((entry) => Padding(
              padding: EdgeInsets.only(
                  bottom: entry.key < items.length - 1 ? 10 : 16),
              child: _DispatchCard(d: entry.value),
            )),
          ],
        );
      },
    );
  }
}

// ── Dispatch card (Active Trips tab) ──────────────────────────────────────────
class _DispatchCard extends StatelessWidget {
  final Map<String, dynamic> d;
  const _DispatchCard({required this.d});

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DispatchDetailSheet(d: d),
    );
  }

  @override
  Widget build(BuildContext context) {
    final status = (d['status'] ?? 'approved').toString().toLowerCase();
    final statusClr = status == 'completed'
        ? AppColors.emerald
        : status == 'in_progress'
        ? AppColors.primary
        : AppColors.amber;
    final statusLabel = status == 'in_progress'
        ? 'IN PROGRESS'
        : status.toUpperCase();

    String dateStr = '';
    try {
      final raw = d['date'] ?? d['startTime'] ?? '';
      if (raw.toString().isNotEmpty) {
        dateStr =
            DateFormat('dd MMM yyyy').format(DateTime.parse(raw.toString()));
      }
    } catch (_) {}

    return GestureDetector(
      onTap: () => _showDetail(context),
      child: Container(
        decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x1F6366F1)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2))
            ]),
        child: Column(children: [
          // Header row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius:
                const BorderRadius.vertical(top: Radius.circular(14)),
                border: Border(
                    bottom: BorderSide(color: const Color(0x1F6366F1)))),
            child: Row(children: [
              // Dispatch No
              Text(d['dispatchNo']?.toString() ?? '—',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: AppColors.primary)),
              const Spacer(),
              // Status badge
              Container(
                padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                    color: statusClr.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                    border:
                    Border.all(color: statusClr.withOpacity(0.3))),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (status == 'in_progress') ...[
                    Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: statusClr, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                  ],
                  Text(statusLabel,
                      style: TextStyle(
                          color: statusClr,
                          fontSize: 10,
                          fontWeight: FontWeight.w800)),
                ]),
              ),
            ]),
          ),
          // Body
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Vehicle + Driver row
                  Row(children: [
                    _InfoChip(
                      icon: Icons.directions_car,
                      color: AppColors.cyan,
                      label: d['vehicleReg']?.toString() ?? '—',
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.person,
                      color: AppColors.violet,
                      label: d['driverName']?.toString() ?? '—',
                    ),
                  ]),
                  const SizedBox(height: 12),
                  // Origin → Destination
                  Row(children: [
                    // Origin
                    Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('ORIGIN',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textMuted,
                                    letterSpacing: 0.6)),
                            const SizedBox(height: 3),
                            Text(d['origin']?.toString() ?? '—',
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          ]),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Column(children: [
                        Icon(Icons.arrow_forward,
                            size: 16, color: AppColors.primary.withOpacity(0.6)),
                      ]),
                    ),
                    // Destination
                    Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('DESTINATION',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textMuted,
                                    letterSpacing: 0.6)),
                            const SizedBox(height: 3),
                            Text(d['destination']?.toString() ?? '—',
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.end),
                          ]),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  // Date + Approved by row
                  Row(children: [
                    const Icon(Icons.calendar_today,
                        size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 5),
                    Text(dateStr,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textMuted)),
                    const Spacer(),
                    const Icon(Icons.verified_user_outlined,
                        size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 5),
                    Text(d['approvedBy']?.toString() ?? '—',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textMuted)),
                  ]),
                ]),
          ),
        ]),
      ),
    );
  }
}

// ── Dispatch detail bottom sheet ──────────────────────────────────────────────
class _DispatchDetailSheet extends StatelessWidget {
  final Map<String, dynamic> d;
  const _DispatchDetailSheet({required this.d});

  String _fmt(String? raw, {bool withTime = false}) {
    if (raw == null || raw.isEmpty) return '—';
    try {
      final dt = DateTime.parse(raw);
      return withTime
          ? DateFormat('dd MMM yyyy, HH:mm').format(dt)
          : DateFormat('dd MMM yyyy').format(dt);
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = (d['status'] ?? '').toString().toLowerCase();
    final statusClr = status == 'completed'
        ? AppColors.emerald
        : status == 'in_progress'
        ? AppColors.primary
        : AppColors.amber;
    final statusLabel =
    status == 'in_progress' ? 'IN PROGRESS' : status.toUpperCase();

    final rows = [
      _DetailRow('Dispatch No', d['dispatchNo']?.toString() ?? '—',
          'Status', null, statusBadge: _StatusBadge(label: statusLabel, color: statusClr)),
      _DetailRow('Vehicle',    d['vehicleReg']?.toString()  ?? '—',
          'Driver',      d['driverName']?.toString()   ?? '—'),
      _DetailRow('Origin',     d['origin']?.toString()      ?? '—',
          'Destination', d['destination']?.toString()  ?? '—'),
      _DetailRow('Date',       _fmt(d['date']?.toString()),
          'Distance',    d['distance'] != null ? '${d['distance']} km' : '—'),
      _DetailRow('Fuel Used',  d['fuelUsed'] != null ? '${d['fuelUsed']} L' : '—',
          'Start Time',  _fmt(d['startTime']?.toString(), withTime: true)),
      _DetailRow('End Time',   _fmt(d['endTime']?.toString(), withTime: true),
          'Approved By', d['approvedBy']?.toString() ?? '—'),
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Handle bar
        Container(
          margin: const EdgeInsets.only(top: 12, bottom: 8),
          width: 40, height: 4,
          decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(2)),
        ),
        // Title row
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 8, 12),
          child: Row(children: [
            const Icon(Icons.local_shipping_outlined,
                size: 20, color: AppColors.primary),
            const SizedBox(width: 10),
            Text('Trip — ${d['dispatchNo'] ?? ''}',
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text)),
            const Spacer(),
            IconButton(
                icon: const Icon(Icons.close, size: 22),
                onPressed: () => Navigator.pop(context)),
          ]),
        ),
        const Divider(height: 1),
        const SizedBox(height: 4),
        // Table
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0))),
            child: Column(children: [
              ...rows.asMap().entries.map((e) => _buildRow(e.value, isLast: e.key == rows.length - 1)),
              // Purpose full-width row
              if (d['purpose'] != null) ...[
                Container(
                  decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0)))),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(
                      width: 110,
                      padding: const EdgeInsets.all(14),
                      child: const Text('Purpose',
                          style: TextStyle(
                              fontSize: 13,
                              color: AppColors.cyan,
                              fontWeight: FontWeight.w600)),
                    ),
                    Container(
                      width: 1, color: const Color(0xFFE2E8F0),
                      margin: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Text(d['purpose']?.toString() ?? '—',
                            style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.text)),
                      ),
                    ),
                  ]),
                ),
              ],
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _buildRow(_DetailRow row, {required bool isLast}) {
    return Container(
      decoration: BoxDecoration(
          border: isLast
              ? null
              : const Border(
              bottom: BorderSide(color: Color(0xFFE2E8F0)))),
      child: IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          // Left label
          Container(
            width: 110,
            padding: const EdgeInsets.all(14),
            child: Text(row.label1,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500)),
          ),
          Container(width: 1, color: const Color(0xFFE2E8F0)),
          // Left value
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Text(row.value1,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text)),
            ),
          ),
          Container(width: 1, color: const Color(0xFFE2E8F0)),
          // Right label
          Container(
            width: 90,
            padding: const EdgeInsets.all(14),
            child: Text(row.label2,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.cyan,
                    fontWeight: FontWeight.w600)),
          ),
          Container(width: 1, color: const Color(0xFFE2E8F0)),
          // Right value or badge
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: row.statusBadge ??
                  Text(row.value2 ?? '—',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text)),
            ),
          ),
        ]),
      ),
    );
  }
}

class _DetailRow {
  final String label1, value1, label2;
  final String? value2;
  final Widget? statusBadge;
  const _DetailRow(this.label1, this.value1, this.label2, this.value2,
      {this.statusBadge});
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusBadge({required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4))),
    child: Text(label,
        style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.3)),
  );
}

// ── Small chip ─────────────────────────────────────────────────────────────────
class _InfoChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  const _InfoChip(
      {required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) => Container(
    padding:
    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 13, color: color),
      const SizedBox(width: 5),
      Text(label,
          style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color)),
    ]),
  );
}

// ── Status dropdown ────────────────────────────────────────────────────────────
class _StatusDropdown extends StatelessWidget {
  final String value;
  final ValueChanged<String?> onChanged;
  const _StatusDropdown({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
    height: 40,
    padding: const EdgeInsets.symmetric(horizontal: 10),
    decoration: BoxDecoration(
        color: AppColors.bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0x1F6366F1))),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: value,
        style: const TextStyle(
            fontSize: 12,
            color: AppColors.text,
            fontWeight: FontWeight.w600),
        icon: const Icon(Icons.keyboard_arrow_down,
            size: 18, color: AppColors.textMuted),
        items: const [
          'All Status',
          'Approved',
          'In Progress',
          'Completed',
        ]
            .map((s) =>
            DropdownMenuItem(value: s, child: Text(s)))
            .toList(),
        onChanged: onChanged,
      ),
    ),
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final Color color;
  final IconData icon;
  final bool isLive;
  const _SectionHeader(
      {required this.title,
        required this.count,
        required this.color,
        required this.icon,
        this.isLive = false});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      Container(
          width: 4,
          height: 20,
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(3))),
      const SizedBox(width: 8),
      if (isLive) ...[
        Container(
            width: 8,
            height: 8,
            decoration:
            BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
      ],
      Icon(icon, size: 15, color: color),
      const SizedBox(width: 6),
      Text(title,
          style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: 0.5)),
      const Spacer(),
      Container(
          padding:
          const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20)),
          child: Text('$count',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: color))),
    ]),
  );
}

// ── View All button ───────────────────────────────────────────────────────────
class _ViewAllButton extends StatelessWidget {
  final bool showing;
  final int total;
  final VoidCallback onTap;
  const _ViewAllButton(
      {required this.showing, required this.total, required this.onTap});

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
          child: Text(showing ? 'Show less ↑' : 'View all $total →',
              style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                  fontSize: 13))));
}