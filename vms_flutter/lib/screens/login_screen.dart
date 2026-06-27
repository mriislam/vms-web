import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _showPass  = false;
  String? _error;

  Future<void> _login() async {
    setState(() => _error = null);
    if (_userCtrl.text.isEmpty || _passCtrl.text.isEmpty) {
      setState(() => _error = 'Username and password are required');
      return;
    }
    try {
      await context.read<AuthProvider>().login(_userCtrl.text.trim(), _passCtrl.text);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const SizedBox(height: 40),

            // ── Logo ──────────────────────────────────────────────────────────
            Container(
              width: 88, height: 88,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, Color(0xFF8B5CF6)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 20, offset: const Offset(0, 8))]),
              child: const Center(child: Text('🚗', style: TextStyle(fontSize: 40))),
            ),
            const SizedBox(height: 16),
            const Text('VMS', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900,
              color: AppColors.primary, letterSpacing: -1)),
            const Text('FLEET MANAGER', style: TextStyle(fontSize: 12, color: AppColors.textMuted,
              letterSpacing: 3, fontWeight: FontWeight.w700)),
            const SizedBox(height: 40),

            // ── Card ──────────────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0x1F6366F1)),
                boxShadow: [BoxShadow(
                  color: AppColors.primary.withOpacity(0.08),
                  blurRadius: 24, offset: const Offset(0, 8))]),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Welcome back', style: TextStyle(fontSize: 22,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
                const SizedBox(height: 4),
                const Text('Sign in to your account', style: TextStyle(
                  color: AppColors.textMuted, fontSize: 14)),
                const SizedBox(height: 24),

                const Text('Username', style: TextStyle(fontSize: 13,
                  fontWeight: FontWeight.w600, color: AppColors.text)),
                const SizedBox(height: 6),
                TextField(
                  controller:    _userCtrl,
                  autocorrect:   false,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    hintText:        'Enter username…',
                    prefixIcon:      Icon(Icons.person_outline, color: AppColors.primary),
                  ),
                ),
                const SizedBox(height: 16),

                const Text('Password', style: TextStyle(fontSize: 13,
                  fontWeight: FontWeight.w600, color: AppColors.text)),
                const SizedBox(height: 6),
                TextField(
                  controller:    _passCtrl,
                  obscureText:   !_showPass,
                  textInputAction: TextInputAction.done,
                  onSubmitted:   (_) => _login(),
                  decoration: InputDecoration(
                    hintText:    'Enter password…',
                    prefixIcon:  const Icon(Icons.lock_outline, color: AppColors.primary),
                    suffixIcon:  IconButton(
                      icon: Icon(_showPass ? Icons.visibility_off : Icons.visibility,
                        color: AppColors.textMuted),
                      onPressed: () => setState(() => _showPass = !_showPass),
                    ),
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.rose.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.rose.withOpacity(0.3))),
                    child: Row(children: [
                      const Icon(Icons.error_outline, color: AppColors.rose, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(
                        color: AppColors.rose, fontSize: 13))),
                    ]),
                  ),
                ],

                const SizedBox(height: 24),
                GradientButton(
                  label:     'Sign In',
                  onPressed: _login,
                  loading:   auth.loading,
                  icon:      Icons.login,
                ),
              ]),
            ),
            const SizedBox(height: 24),

            // ── Role hints ────────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.white, borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0x1F6366F1))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('ACCESS BY ROLE', style: TextStyle(fontSize: 11,
                  fontWeight: FontWeight.w700, color: AppColors.textMuted, letterSpacing: 1)),
                const SizedBox(height: 12),
                for (final r in [
                  ('👤', 'Employee',     'Submit vehicle requests'),
                  ('🛡️', 'Admin/Manager', 'Approve, assign & manage trips'),
                  ('🚌', 'Driver',        'View trips, start & end with GPS'),
                ]) Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(children: [
                    Text(r.$1, style: const TextStyle(fontSize: 22)),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(r.$2, style: const TextStyle(fontWeight: FontWeight.w700,
                        fontSize: 14, color: AppColors.text)),
                      Text(r.$3, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ]),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 24),
            const Text('© Nexdecade Technology', style: TextStyle(
              color: AppColors.textMuted, fontSize: 12)),
          ]),
        ),
      ),
    );
  }
}
