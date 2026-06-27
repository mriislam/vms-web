import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';
import 'package:cryptography/cryptography.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';

// ── AES-256-GCM Crypto — matches web frontend exactly ────────────────────────
class _Crypto {
  static List<int>? _keyBytes;

  static Future<List<int>> _getKey() async {
    if (_keyBytes != null) return _keyBytes!;
    final passBytes = utf8.encode(kEncryptionKey);
    final hash     = sha256.convert(passBytes);
    _keyBytes = hash.bytes;
    return _keyBytes!;
  }

  static Future<String> encrypt(String plaintext) async {
    final algorithm = AesGcm.with256bits();
    final keyBytes  = await _getKey();
    final key       = await algorithm.newSecretKeyFromBytes(keyBytes);
    final nonce     = algorithm.newNonce(); // 12 random bytes

    final secretBox = await algorithm.encrypt(
      utf8.encode(plaintext),
      secretKey: key,
      nonce:     nonce,
    );

    // Combined: nonce(12) + cipherText + mac(16)
    final combined = Uint8List(nonce.length + secretBox.cipherText.length + secretBox.mac.bytes.length);
    combined.setAll(0,                                      nonce);
    combined.setAll(nonce.length,                           secretBox.cipherText);
    combined.setAll(nonce.length + secretBox.cipherText.length, secretBox.mac.bytes);
    return base64.encode(combined);
  }

  static Future<String> decrypt(String b64) async {
    final algorithm = AesGcm.with256bits();
    final keyBytes  = await _getKey();
    final key       = await algorithm.newSecretKeyFromBytes(keyBytes);

    final combined   = base64.decode(b64);
    final nonce      = combined.sublist(0, 12);
    final mac        = Mac(combined.sublist(combined.length - 16));
    final cipherText = combined.sublist(12, combined.length - 16);

    final secretBox = SecretBox(cipherText, nonce: nonce, mac: mac);
    final plainBytes = await algorithm.decrypt(secretBox, secretKey: key);
    return utf8.decode(plainBytes);
  }
}

// ── API Client ────────────────────────────────────────────────────────────────
class ApiClient {
  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('vms_token');
  }

  static Future<Map<String, String>> _headers({bool isAuth = false}) async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Encrypt request body (skip for auth endpoints)
  static Future<String> _encryptBody(String json, {bool isAuth = false}) async {
    if (!kEncryptEnabled || isAuth) return json;
    final enc = await _Crypto.encrypt(json);
    return jsonEncode({'enc': enc});
  }

  // Decrypt response body
  static Future<Map<String, dynamic>> _parseResponse(
      http.Response res, {bool isAuth = false}) async {
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _tryParseError(res.body));
    }
    final decoded = jsonDecode(res.body) as Map<String, dynamic>;
    if (!kEncryptEnabled || isAuth || !decoded.containsKey('enc')) return decoded;
    try {
      final plain = await _Crypto.decrypt(decoded['enc'] as String);
      return jsonDecode(plain) as Map<String, dynamic>;
    } catch (_) {
      return decoded;
    }
  }

  static String _tryParseError(String body) {
    try {
      final j = jsonDecode(body);
      if (j is Map) return j['message'] as String? ?? body;
    } catch (_) {}
    return body;
  }

  // ── HTTP verbs ──────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(
      Uri.parse('$kApiBase$path'),
      headers: await _headers(),
    );
    return _parseResponse(res);
  }

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body,
      {bool isAuth = false}) async {
    final bodyStr  = jsonEncode(body);
    final encBody  = await _encryptBody(bodyStr, isAuth: isAuth);
    final res      = await http.post(
      Uri.parse('$kApiBase$path'),
      headers:   await _headers(isAuth: isAuth),
      body:      encBody,
    );
    return _parseResponse(res, isAuth: isAuth);
  }

  static Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final encBody = await _encryptBody(jsonEncode(body));
    final res     = await http.put(
      Uri.parse('$kApiBase$path'),
      headers: await _headers(),
      body:    encBody,
    );
    return _parseResponse(res);
  }

  static Future<Map<String, dynamic>> patch(String path,
      [Map<String, dynamic>? body]) async {
    final encBody = body != null ? await _encryptBody(jsonEncode(body)) : null;
    final res     = await http.patch(
      Uri.parse('$kApiBase$path'),
      headers: await _headers(),
      body:    encBody,
    );
    return _parseResponse(res);
  }

  static Future<Map<String, dynamic>> delete(String path) async {
    final res = await http.delete(
      Uri.parse('$kApiBase$path'),
      headers: await _headers(),
    );
    return _parseResponse(res);
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override String toString() => 'ApiException($statusCode): $message';
}
