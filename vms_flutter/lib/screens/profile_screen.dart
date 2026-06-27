import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static const _roleColor = {
    'admin':    AppColors.rose,
    'manager':  AppColors.amber,
    'operator': AppColors.primary,
    'driver':   AppColors.cyan,
    'viewer':   AppColors.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    final user  = context.watch<AuthProvider>().user;
    final role  = user?.role ?? 'operator';
    final color = _roleColor[role] ?? AppColors.primary;
    final name  = user?.displayName ?? 'User';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(padding: const EdgeInsets.all(20), children: [

        // Avatar
        Center(child: Column(children: [
          Container(width: 90, height: 90,
            decoration: BoxDecoration(shape: BoxShape.circle,
              color: color.withOpacity(0.12),
              border: Border.all(color: color.withOpacity(0.4), width: 2)),
            child: Center(child: Text(name[0].toUpperCase(),
              style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: color)))),
          const SizedBox(height: 12),
          Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800,
            color: AppColors.text)),
          const SizedBox(height: 8),
          Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
            decoration: BoxDecoration(color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color.withOpacity(0.3))),
            child: Text(role.toUpperCase(), style: TextStyle(color: color,
              fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1))),
        ])),
        const SizedBox(height: 24),

        // Info card
        AppCard(child: Column(children: [
          for (final row in [
            ('Username',   user?.username,   null),
            ('Email',      user?.email,      null),
            ('Phone',      user?.phone,      null),
            ('Department', user?.department, null),
            ('Role',       role,             color),
          ]) InfoRow(label: row.$1,
            value: (row.$2 as String?)?.isNotEmpty == true ? row.$2! : '—',
            valueColor: row.$3 as Color?),
        ])),
        const SizedBox(height: 12),

        // Server info
        AppCard(child: Column(children: [
          const InfoRow(label: 'Server',  value: 'demo-vms.nexdecade.com'),
          const InfoRow(label: 'Version', value: '1.0.0'),
        ])),
        const SizedBox(height: 20),

        // Logout
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
        const SizedBox(height: 24),
        const Center(child: Text('© Nexdecade Technology',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12))),
      ]),
    );
  }
}
