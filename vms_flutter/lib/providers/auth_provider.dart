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
  Future<void> login(String username, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res  = await ApiClient.post('/auth/login',
          {'username': username, 'password': password}, isAuth: true);
      print("The response is $res");
      final data = res['data'] as Map<String, dynamic>;
      _token     = data['token'] as String;
      final raw  = data['user']  as Map<String, dynamic>? ??
          {'username': username, 'role': data['role'] ?? 'operator'};
      _user = AppUser.fromJson(raw);

      // Check if user has a linked driver record
      try {
        final me = await ApiClient.get('/driver/me');
        final meData = me['data'] as Map<String, dynamic>? ?? {};

        if (meData.containsKey('driverId')) {
          _user = AppUser.fromJson({...raw, 'isDriver': true});
        }
      } catch (_) {}

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('vms_token', _token!);
      await prefs.setString('vms_user', jsonEncode(raw));
      print("get vms user ${prefs.getString("vms_user")}");
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
