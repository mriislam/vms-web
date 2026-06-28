import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'core/constants.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/employee/my_requests_screen.dart';
import 'screens/approver/approvals_screen.dart';
import 'screens/driver/driver_home_screen.dart';

// Request location permission once at app startup
Future<void> _requestLocationPermission() async {
  try {
    final status = await Geolocator.checkPermission();
    if (status == LocationPermission.denied) {
      await Geolocator.requestPermission();
    }
  } catch (_) {}
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _requestLocationPermission();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider()..hydrate(),
      child: const VmsApp(),
    ),
  );
}

class VmsApp extends StatelessWidget {
  const VmsApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'NEXVMS',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: const _Root(),
      );
}

class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.ready)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (!auth.isLoggedIn) return const LoginScreen();
    return const _MainShell();
  }
}

class _MainShell extends StatefulWidget {
  const _MainShell();
  @override
  State<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<_MainShell> {
  int _idx = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    final List<({Widget screen, BottomNavigationBarItem tab})> tabs;

    if (user?.isDriverRole == true) {
      tabs = [
        (
          screen: const DriverHomeScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.directions_car_outlined),
              activeIcon: Icon(Icons.directions_car),
              label: "Today's Trips")
        ),
        (
          screen: const ProfileScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile')
        ),
      ];
    } else if (user?.isAdmin == true) {
      tabs = [
        (
          screen: const ApprovalsScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.pending_actions_outlined),
              activeIcon: Icon(Icons.pending_actions),
              label: 'Approvals')
        ),
        (
          screen: const MyRequestsScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.list_alt_outlined),
              activeIcon: Icon(Icons.list_alt),
              label: 'All Trips')
        ),
        (
          screen: const ProfileScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile')
        ),
      ];
    } else {
      tabs = [
        (
          screen: const MyRequestsScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.article_outlined),
              activeIcon: Icon(Icons.article),
              label: 'My Bookings')
        ),
        (
          screen: const ProfileScreen(),
          tab: const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile')
        ),
      ];
    }

    if (_idx >= tabs.length) _idx = 0;

    return Scaffold(
      body: IndexedStack(
          index: _idx, children: tabs.map((t) => t.screen).toList()),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (i) => setState(() => _idx = i),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.primaryBg,
        destinations: tabs
            .map((t) => NavigationDestination(
                  icon: t.tab.icon,
                  selectedIcon: t.tab.activeIcon ?? t.tab.icon,
                  label: t.tab.label ?? '',
                ))
            .toList(),
      ),
    );
  }
}
