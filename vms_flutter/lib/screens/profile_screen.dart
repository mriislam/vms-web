import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/constants.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _editing = false;
  bool _saving  = false;

  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _deptCtrl;

  static const _roleColor = {
    'admin':    AppColors.rose,
    'manager':  AppColors.amber,
    'operator': AppColors.primary,
    'driver':   AppColors.cyan,
    'viewer':   AppColors.textMuted,
  };

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _nameCtrl  = TextEditingController(text: user?.fullName ?? '');
    _emailCtrl = TextEditingController(text: user?.email    ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone    ?? '');
    _deptCtrl  = TextEditingController(text: user?.department ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose();
    _phoneCtrl.dispose(); _deptCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final user = context.read<AuthProvider>().user;
      await ApiClient.put('/users/${_nameCtrl.text}', {
        'fullName':   _nameCtrl.text.trim(),
        'email':      _emailCtrl.text.trim(),
        'phone':      _phoneCtrl.text.trim(),
        'department': _deptCtrl.text.trim(),
      });
      // Update local store
      // Refresh local user data
      setState(() {
        _editing = false;
      });
      setState(() => _editing = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Profile updated'),
          backgroundColor: AppColors.emerald));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: ${e.toString()}'),
          backgroundColor: AppColors.rose));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user  = context.watch<AuthProvider>().user;
    final role  = user?.role ?? 'operator';
    final color = _roleColor[role] ?? AppColors.primary;
    final name  = user?.displayName ?? 'User';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          if (!_editing)
            TextButton.icon(
              onPressed: () => setState(() => _editing = true),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit'),
            )
          else
            TextButton(
              onPressed: () => setState(() { _editing = false; }),
              child: const Text('Cancel', style: TextStyle(color: AppColors.rose)),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(children: [

          // ── Avatar ────────────────────────────────────────────────────
          Center(child: Column(children: [
            Stack(children: [
              Container(width: 90, height: 90,
                decoration: BoxDecoration(shape: BoxShape.circle,
                  color: color.withOpacity(0.12),
                  border: Border.all(color: color.withOpacity(0.4), width: 2.5)),
                child: Center(child: Text(name[0].toUpperCase(),
                  style: TextStyle(fontSize: 38, fontWeight: FontWeight.w900, color: color)))),
              if (_editing)
                Positioned(bottom: 0, right: 0,
                  child: Container(width: 28, height: 28, decoration: BoxDecoration(
                    color: AppColors.primary, shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2)),
                    child: const Icon(Icons.camera_alt, size: 14, color: Colors.white))),
            ]),
            const SizedBox(height: 10),
            Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 6),
            Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: color.withOpacity(0.3))),
              child: Text(role.toUpperCase(), style: TextStyle(color: color,
                fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1))),
          ])),
          const SizedBox(height: 24),

          // ── Editable info card ────────────────────────────────────────
          AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(width: 4, height: 16, decoration: BoxDecoration(
                color: AppColors.primary, borderRadius: BorderRadius.circular(3))),
              const SizedBox(width: 8),
              const Text('PERSONAL INFO', style: TextStyle(fontSize: 11,
                fontWeight: FontWeight.w800, color: AppColors.primary, letterSpacing: 0.8)),
            ]),
            const SizedBox(height: 14),

            _editField('Full Name',   _nameCtrl,  Icons.person_outline, _editing),
            _editField('Email',       _emailCtrl, Icons.email_outlined,  _editing, keyboardType: TextInputType.emailAddress),
            _editField('Phone',       _phoneCtrl, Icons.phone_outlined,  _editing, keyboardType: TextInputType.phone),
            _editField('Department',  _deptCtrl,  Icons.business_outlined, _editing),

            const Divider(height: 20),
            // Read-only username
            _readonlyRow('Username', user?.username ?? '—', Icons.account_circle_outlined),
            _readonlyRow('Role',     role.toUpperCase(),    Icons.shield_outlined, valueColor: color),
          ])),
          const SizedBox(height: 16),

          // ── Save button (editing mode only) ───────────────────────────
          if (_editing) GradientButton(
            label: 'Save Changes',
            onPressed: _save,
            loading: _saving,
            icon: Icons.save_outlined,
          ),
          if (_editing) const SizedBox(height: 16),

          // ── Logout ────────────────────────────────────────────────────
          OutlinedButton.icon(
            onPressed: () async {
              final ok = await showDialog<bool>(context: context,
                builder: (_) => AlertDialog(title: const Text('Sign Out'),
                  content: const Text('Are you sure you want to sign out?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                    TextButton(onPressed: () => Navigator.pop(context, true),
                      child: const Text('Sign Out', style: TextStyle(color: AppColors.rose))),
                  ]));
              if (ok == true && context.mounted) {
                await context.read<AuthProvider>().logout();
              }
            },
            icon: const Icon(Icons.logout, color: AppColors.rose),
            label: const Text('Sign Out', style: TextStyle(color: AppColors.rose,
              fontWeight: FontWeight.w700, fontSize: 15)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.rose, width: 1.5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 13)),
          ),
          const SizedBox(height: 20),
          const Text('© Nexdecade Technology',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
        ]),
      ),
    );
  }

  Widget _editField(String label, TextEditingController ctrl,
      IconData icon, bool editable, {TextInputType? keyboardType}) {
    if (!editable) {
      return _readonlyRow(label, ctrl.text.isEmpty ? '—' : ctrl.text, icon);
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 18, color: AppColors.primary),
        ),
      ),
    );
  }

  Widget _readonlyRow(String label, String value, IconData icon, {Color? valueColor}) =>
    Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Icon(icon, size: 18, color: AppColors.textMuted),
        const SizedBox(width: 12),
        Expanded(child: Text(label, style: const TextStyle(
          color: AppColors.textMuted, fontSize: 13))),
        Text(value, style: TextStyle(
          color: valueColor ?? AppColors.text,
          fontSize: 13, fontWeight: FontWeight.w600)),
      ]),
    );
}
