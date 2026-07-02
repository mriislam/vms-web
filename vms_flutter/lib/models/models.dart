// ── User ──────────────────────────────────────────────────────────────────────
class AppUser {
  final String  username;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? department;
  final String  role;
  final bool    isDriver;
  final int?    tenantId;
  final String? tenantSlug;
  final String? tenantName;

  AppUser({
    required this.username,
    this.fullName,
    this.email,
    this.phone,
    this.department,
    required this.role,
    this.isDriver  = false,
    this.tenantId,
    this.tenantSlug,
    this.tenantName,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
    username:   j['username']   as String? ?? '',
    fullName:   j['fullName']   as String?,
    email:      j['email']      as String?,
    phone:      j['phone']      as String?,
    department: j['department'] as String?,
    role:       j['role']       as String? ?? 'operator',
    isDriver:   j['isDriver']   as bool?   ?? false,
    tenantId:   (j['tenantId']  as num?)?.toInt(),
    tenantSlug: j['tenantSlug'] as String?,
    tenantName: j['tenantName'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'username':   username,
    'fullName':   fullName,
    'email':      email,
    'phone':      phone,
    'department': department,
    'role':       role,
    'isDriver':   isDriver,
    'tenantId':   tenantId,
    'tenantSlug': tenantSlug,
    'tenantName': tenantName,
  };

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;

  bool get isAdmin      => role == 'admin' || role == 'manager';
  bool get isDriverRole => role == 'driver' || isDriver;
}

// ── Requisition ───────────────────────────────────────────────────────────────
class Requisition {
  final int     id;
  final String  reqNo;
  final String  requestedBy;
  final String? department;
  final String  purpose;
  final String  priority;
  final String  status;
  final String? fromLocation;
  final String? toLocation;
  final double? fromLat;
  final double? fromLng;
  final double? toLat;
  final double? toLng;
  final int?    distanceKm;
  final int?    passengers;
  final String? date;
  final String? fromDatetime;
  final String? toDatetime;
  final String? approvedBy;
  final String? vehicleReg;
  final int?    driverId;
  final int?    geofenceRadiusM;
  final String? remarks;

  Requisition({
    required this.id,
    required this.reqNo,
    required this.requestedBy,
    this.department,
    required this.purpose,
    required this.priority,
    required this.status,
    this.fromLocation,
    this.toLocation,
    this.fromLat,
    this.fromLng,
    this.toLat,
    this.toLng,
    this.distanceKm,
    this.passengers,
    this.date,
    this.fromDatetime,
    this.toDatetime,
    this.approvedBy,
    this.vehicleReg,
    this.driverId,
    this.geofenceRadiusM,
    this.remarks,
  });

  factory Requisition.fromJson(Map<String, dynamic> j) => Requisition(
    id:             (j['id'] as num).toInt(),
    reqNo:          j['reqNo']        as String? ?? '',
    requestedBy:    j['requestedBy']  as String? ?? '',
    department:     j['department']   as String?,
    purpose:        j['purpose']      as String? ?? '',
    priority:       j['priority']     as String? ?? 'normal',
    status:         j['status']       as String? ?? 'pending',
    fromLocation:   j['fromLocation'] as String?,
    toLocation:     j['toLocation']   as String?,
    fromLat:        (j['fromLat']     as num?)?.toDouble(),
    fromLng:        (j['fromLng']     as num?)?.toDouble(),
    toLat:          (j['toLat']       as num?)?.toDouble(),
    toLng:          (j['toLng']       as num?)?.toDouble(),
    distanceKm:     (j['distanceKm']  as num?)?.toInt(),
    passengers:     (j['passengers']  as num?)?.toInt(),
    date:           j['date']         as String?,
    fromDatetime:   j['fromDatetime'] as String?,
    toDatetime:     j['toDatetime']   as String?,
    approvedBy:     j['approvedBy']   as String?,
    vehicleReg:     j['vehicleReg']   as String?,
    driverId:       (j['driverId']    as num?)?.toInt(),
    geofenceRadiusM:(j['geofenceRadiusM'] as num?)?.toInt(),
    remarks:        j['remarks']      as String?,
  );

  Map<String, dynamic> toJson() => {
    'requestedBy':   requestedBy,
    'department':    department,
    'purpose':       purpose,
    'priority':      priority,
    'status':        status,
    'fromLocation':  fromLocation,
    'toLocation':    toLocation,
    'fromLat':       fromLat,
    'fromLng':       fromLng,
    'toLat':         toLat,
    'toLng':         toLng,
    'distanceKm':    distanceKm,
    'passengers':    passengers,
    'date':          date,
    'fromDatetime':  fromDatetime,
    'toDatetime':    toDatetime,
    'approvedBy':    approvedBy,
    'vehicleReg':    vehicleReg,
    'driverId':      driverId,
    'geofenceRadiusM': geofenceRadiusM ?? 500,
    'remarks':       remarks,
  };
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
class Dispatch {
  final int     id;
  final String  dispatchNo;
  final String  vehicleReg;
  final String  driverName;
  final String  origin;
  final String  destination;
  final String  status;
  final String? date;
  final String? startTime;
  final String? endTime;
  final int?    distance;
  final double? fuelUsed;
  final String? purpose;
  final String? approvedBy;

  Dispatch({
    required this.id,
    required this.dispatchNo,
    required this.vehicleReg,
    required this.driverName,
    required this.origin,
    required this.destination,
    required this.status,
    this.date,
    this.startTime,
    this.endTime,
    this.distance,
    this.fuelUsed,
    this.purpose,
    this.approvedBy,
  });

  factory Dispatch.fromJson(Map<String, dynamic> j) => Dispatch(
    id:          (j['id']          as num).toInt(),
    dispatchNo:  j['dispatchNo']  as String? ?? '',
    vehicleReg:  j['vehicleReg']  as String? ?? '',
    driverName:  j['driverName']  as String? ?? '',
    origin:      j['origin']      as String? ?? '',
    destination: j['destination'] as String? ?? '',
    status:      j['status']      as String? ?? 'pending',
    date:        j['date']        as String?,
    startTime:   j['startTime']   as String?,
    endTime:     j['endTime']     as String?,
    distance:    (j['distance']   as num?)?.toInt(),
    fuelUsed:    (j['fuelUsed']   as num?)?.toDouble(),
    purpose:     j['purpose']     as String?,
    approvedBy:  j['approvedBy']  as String?,
  );
}

// ── Vehicle (for approver assignment) ────────────────────────────────────────
class Vehicle {
  final int    id;
  final String regNo;
  final String make;
  final String model;
  final String status;
  final String? fuelType;

  Vehicle({required this.id, required this.regNo, required this.make,
    required this.model, required this.status, this.fuelType});

  factory Vehicle.fromJson(Map<String, dynamic> j) => Vehicle(
    id:       (j['id'] as num).toInt(),
    regNo:    j['regNo']   as String? ?? '',
    make:     j['make']    as String? ?? '',
    model:    j['model']   as String? ?? '',
    status:   j['status']  as String? ?? 'active',
    fuelType: j['fuelType'] as String?,
  );

  String get displayLabel => '$regNo — $make $model';
}

// ── Driver ────────────────────────────────────────────────────────────────────
class Driver {
  final int    id;
  final String name;
  final String licenseNo;
  final String status;
  final String? phone;

  Driver({required this.id, required this.name, required this.licenseNo,
    required this.status, this.phone});

  factory Driver.fromJson(Map<String, dynamic> j) => Driver(
    id:        (j['id'] as num).toInt(),
    name:      j['name']      as String? ?? '',
    licenseNo: j['licenseNo'] as String? ?? '',
    status:    j['status']    as String? ?? 'active',
    phone:     j['phone']     as String?,
  );
}
