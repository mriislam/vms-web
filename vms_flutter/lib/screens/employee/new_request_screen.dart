import 'package:flutter/material.dart';
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

  @override void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user?.department != null) _dept = user!.department;
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

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: GradientHeader(title: 'New Vehicle Request',
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
                if (result != null) setState(() {
                  _fromLocation = result;
                  _fromCtrl.text = result['address'] ?? '';
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                      onTap: () => setState(() { _fromLocation = null; _fromCtrl.clear(); }),
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
                if (result != null) setState(() {
                  _toLocation = result;
                  _toCtrl.text = result['address'] ?? '';
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                      onTap: () => setState(() { _toLocation = null; _toCtrl.clear(); }),
                      child: const Icon(Icons.close, size: 18, color: Colors.grey)),
                ]),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 4),
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

