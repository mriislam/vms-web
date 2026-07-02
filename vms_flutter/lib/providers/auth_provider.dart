import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api.dart';
import '../models/models.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  String?  _token;
  bool     _loading = false;
  bool     _ready   = false;

  AppUser? get user    => _user;
  String?  get token   => _token;
  bool     get loading => _loading;
  bool     get ready   => _ready;
  bool     get isLoggedIn => _token != null;

  // ── Restore session ──────────────────────────────────────────────────────────
  Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('vms_token');
    final raw = prefs.getString('vms_user');
    if (raw != null) {
      try { _user = AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>); }
      catch (_) {}
    }
    _ready = true;
    notifyListeners();
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  Future<void> login(String username, String password, String tenantSlug) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiClient.post('/auth/login', {
        'username':   username,
        'password':   password,
        'tenantSlug': tenantSlug.trim().isEmpty ? null : tenantSlug.trim(),
      }, isAuth: true);

      final data = res['data'] as Map<String, dynamic>;
      _token = data['token'] as String;

      // Build user map from flat login response (no nested 'user' object)
      final userMap = <String, dynamic>{
        'username':   data['username']   ?? username,
        'fullName':   data['fullName'],
        'role':       data['role']       ?? 'operator',
        'tenantId':   data['tenantId'],
        'tenantSlug': data['tenantSlug'],
        'tenantName': data['tenantName'],
      };
      _user = AppUser.fromJson(userMap);

      // Check if user has a linked driver record
      try {
        final me = await ApiClient.get('/driver/me');
        final meData = me['data'] as Map<String, dynamic>? ?? {};
        if (meData.containsKey('driverId')) {
          _user = AppUser.fromJson({...userMap, 'isDriver': true});
        }
      } catch (_) {}

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('vms_token', _token!);
      await prefs.setString('vms_user', jsonEncode(_user!.toJson()));
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    _token = null;
    _user  = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('vms_token');
    await prefs.remove('vms_user');
    notifyListeners();
  }
}
