import 'package:flutter/material.dart';

const kApiBase        = 'https://demo-vms.nexdecade.com/api';
const kEncryptionKey  = 'VMS-Nexdecade-AES256-SecretKey-2024';
const kEncryptEnabled = true;
const kGoogleMapsKey  = 'AIzaSyA2TlfKOISQJAB4ph4ph1BN1pAuF8lVavo';

// ── Brand Colors ─────────────────────────────────────────────────────────────
class AppColors {
  static const primary    = Color(0xFF6366F1);  // Electric Indigo
  static const primary2   = Color(0xFF4F46E5);
  static const primaryBg  = Color(0xFFEEF1FF);
  static const emerald    = Color(0xFF10B981);
  static const emeraldBg  = Color(0xFFF0FDF4);
  static const cyan       = Color(0xFF06B6D4);
  static const amber      = Color(0xFFF59E0B);
  static const rose       = Color(0xFFF43F5E);
  static const violet     = Color(0xFF8B5CF6);
  static const orange     = Color(0xFFF97316);

  static const bg         = Color(0xFFF8FAFF);
  static const white      = Color(0xFFFFFFFF);
  static const border     = Color(0xFFE2E8F0);
  static const text       = Color(0xFF1E293B);
  static const textSub    = Color(0xFF475569);
  static const textMuted  = Color(0xFF94A3B8);

  static Color statusColor(String? status) => switch (status) {
    'pending'     => amber,
    'approved'    => emerald,
    'in_progress' => primary,
    'completed'   => textMuted,
    'rejected'    => rose,
    _             => textMuted,
  };

  static Color statusBg(String? status) => switch (status) {
    'pending'     => const Color(0xFFFFFBEB),
    'approved'    => const Color(0xFFF0FDF4),
    'in_progress' => const Color(0xFFEEF1FF),
    'completed'   => const Color(0xFFF1F5F9),
    'rejected'    => const Color(0xFFFFF1F2),
    _             => const Color(0xFFF1F5F9),
  };
}

// ── Theme ─────────────────────────────────────────────────────────────────────
ThemeData buildTheme() => ThemeData(
  useMaterial3:      true,
  colorScheme:       ColorScheme.fromSeed(
    seedColor:       AppColors.primary,
    surface:         AppColors.bg,
    background:      AppColors.bg,
  ),
  fontFamily:        'Roboto',
  scaffoldBackgroundColor: AppColors.bg,
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.white,
    foregroundColor: AppColors.text,
    elevation:       0,
    shadowColor:     Colors.transparent,
    surfaceTintColor: Colors.transparent,
  ),
  cardTheme: CardThemeData(
    color:         AppColors.white,
    elevation:     0,
    shape:         RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side:         const BorderSide(color: Color(0x1F6366F1)),
    ),
    margin: const EdgeInsets.only(bottom: 12),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.white,
      elevation:       0,
      shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding:         const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
      textStyle:       const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled:        true,
    fillColor:     const Color(0xFFFAFBFF),
    border:        OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: AppColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: AppColors.border, width: 1.5),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: AppColors.primary, width: 2),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    labelStyle:     const TextStyle(color: AppColors.textSub),
    hintStyle:      const TextStyle(color: AppColors.textMuted),
  ),
);
