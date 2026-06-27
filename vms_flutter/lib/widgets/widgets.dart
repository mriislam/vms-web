import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/models.dart';

// ── StatusBadge ───────────────────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final String? status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    final label = (status ?? 'unknown').replaceAll('_', ' ').toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.statusBg(status),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
        style: TextStyle(
          color: AppColors.statusColor(status),
          fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 0.5)),
    );
  }
}

// ── GradientButton ────────────────────────────────────────────────────────────
class GradientButton extends StatelessWidget {
  final String    label;
  final VoidCallback? onPressed;
  final bool      loading;
  final List<Color> colors;
  final IconData? icon;

  const GradientButton({
    super.key, required this.label, this.onPressed,
    this.loading = false,
    this.colors  = const [AppColors.primary, Color(0xFF8B5CF6)],
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: (loading || onPressed == null) ? null : onPressed,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 15),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: colors),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(
            color: colors.first.withOpacity(0.4),
            blurRadius: 16, offset: const Offset(0, 6))],
        ),
        child: loading
          ? const Center(child: SizedBox(width: 22, height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)))
          : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              if (icon != null) ...[Icon(icon, color: Colors.white, size: 18), const SizedBox(width: 8)],
              Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
            ]),
      ),
    );
  }
}

// ── OutlineButton ─────────────────────────────────────────────────────────────
class AppOutlineButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Color  color;
  const AppOutlineButton({super.key, required this.label, this.onPressed,
    this.color = AppColors.textMuted});

  @override
  Widget build(BuildContext context) => OutlinedButton(
    onPressed: onPressed,
    style: OutlinedButton.styleFrom(
      foregroundColor: color,
      side: BorderSide(color: color, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 20),
    ),
    child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
class SectionLabel extends StatelessWidget {
  final String label;
  final Color  color;
  final Widget? trailing;
  const SectionLabel(this.label, {super.key, this.color = AppColors.primary, this.trailing});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12, top: 4),
    child: Row(children: [
      Container(width: 4, height: 18,
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [color, color.withOpacity(0.5)]),
          borderRadius: BorderRadius.circular(3))),
      const SizedBox(width: 8),
      Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w800,
        fontSize: 12, letterSpacing: 0.8)),
      if (trailing != null) ...[const Spacer(), trailing!],
    ]),
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────
class InfoRow extends StatelessWidget {
  final String  label;
  final String  value;
  final Color?  valueColor;
  const InfoRow({super.key, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      Expanded(child: Text(label, style: const TextStyle(color: AppColors.textMuted,
        fontSize: 13, fontWeight: FontWeight.w500))),
      Expanded(child: Text(value, textAlign: TextAlign.end,
        style: TextStyle(color: valueColor ?? AppColors.text,
          fontSize: 13, fontWeight: FontWeight.w600))),
    ]),
  );
}

// ── RouteConnector ────────────────────────────────────────────────────────────
class RouteConnector extends StatelessWidget {
  final String from;
  final String to;
  const RouteConnector({super.key, required this.from, required this.to});

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Column(children: [
        Container(width: 10, height: 10,
          decoration: const BoxDecoration(color: AppColors.primary,
            shape: BoxShape.circle, boxShadow: [BoxShadow(
              color: Color(0x336366F1), blurRadius: 6, spreadRadius: 2)])),
        Container(width: 2, height: 32,
          decoration: const BoxDecoration(gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [AppColors.primary, AppColors.emerald]))),
        Container(width: 10, height: 10,
          decoration: BoxDecoration(color: AppColors.emerald, borderRadius: BorderRadius.circular(2),
            boxShadow: const [BoxShadow(color: Color(0x3310B981), blurRadius: 6, spreadRadius: 2)])),
      ]),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(from, style: const TextStyle(color: AppColors.primary,
          fontWeight: FontWeight.w700, fontSize: 14),
          overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        Text(to, style: const TextStyle(color: AppColors.emerald,
          fontWeight: FontWeight.w700, fontSize: 14),
          overflow: TextOverflow.ellipsis),
      ])),
    ],
  );
}

// ── AppCard ───────────────────────────────────────────────────────────────────
class AppCard extends StatelessWidget {
  final Widget  child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final Color? borderColor;

  const AppCard({super.key, required this.child, this.onTap,
    this.padding, this.borderColor});

  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(16),
        child: child,
      ),
    ),
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final String emoji;
  final String title;
  final String? subtitle;
  const EmptyState({super.key, required this.emoji, required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(emoji, style: const TextStyle(fontSize: 52)),
        const SizedBox(height: 16),
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800,
          color: AppColors.text)),
        if (subtitle != null) ...[
          const SizedBox(height: 8),
          Text(subtitle!, textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
        ],
      ]),
    ),
  );
}

// ── GradientHeader ────────────────────────────────────────────────────────────
class GradientHeader extends StatelessWidget implements PreferredSizeWidget {
  final String   title;
  final String?  subtitle;
  final Color    color1;
  final Color    color2;
  final Widget?  trailing;
  final bool     showBack;

  const GradientHeader({super.key, required this.title, this.subtitle,
    this.color1 = AppColors.primary, this.color2 = const Color(0xFF8B5CF6),
    this.trailing, this.showBack = false});

  @override
  Size get preferredSize => const Size.fromHeight(80);

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      gradient: LinearGradient(colors: [color1, color2]),
    ),
    child: SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(children: [
          if (showBack) ...[
            GestureDetector(
              onTap: () => Navigator.of(context).pop(),
              child: const Icon(Icons.arrow_back_ios, color: Colors.white, size: 20)),
            const SizedBox(width: 8),
          ],
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(title, style: const TextStyle(color: Colors.white,
                fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.3)),
              if (subtitle != null) Text(subtitle!, style: TextStyle(
                color: Colors.white.withOpacity(0.75), fontSize: 13)),
            ])),
          if (trailing != null) trailing!,
        ]),
      ),
    ),
  );
}

// ── PriorityBadge ─────────────────────────────────────────────────────────────
class PriorityBadge extends StatelessWidget {
  final String? priority;
  const PriorityBadge(this.priority, {super.key});

  @override
  Widget build(BuildContext context) {
    final clr = priority == 'urgent' ? AppColors.rose
              : priority == 'high'   ? AppColors.amber
              : AppColors.emerald;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: clr.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: clr.withOpacity(0.35)),
      ),
      child: Text((priority ?? 'normal').toUpperCase(),
        style: TextStyle(color: clr, fontWeight: FontWeight.w800, fontSize: 10)),
    );
  }
}
