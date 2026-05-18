import {
  CheckCircleOutlined, ClockCircleOutlined, ControlOutlined,
  DeleteOutlined, PlusOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, Popconfirm, Row, Select, Space,
  Table, Tag, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { filterOption, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';

const { Title, Text } = Typography;

const TPT_USERS = [
  'Central Control', 'Admin Section', 'Labour Section', 'Towing', 'DG Secretariat',
  'JD Admin Sir', 'TPT Workshop', 'AD Shariful', 'TPT Duty Officer', 'Admin Wing',
  'Security Section', 'TPT Section', 'Internal Wing', 'Finance Section', 'IT Section',
  'Logistics Wing', 'Protocol Section', 'Legal Section', 'Welfare Section', 'Mess Bazar',
];

let idSeq = 100;

const MOCK_ASSIGNMENTS = [
  { id: 1,  user: 'Central Control',   vehicle: 'DM-DA-11-0400', driver: 'Rana Hasan' },
  { id: 2,  user: 'Admin Section',      vehicle: 'DM-THA-13-5942', driver: 'Abdul Alim' },
  { id: 3,  user: 'Labour Section',     vehicle: 'DM-GHA-11-5664', driver: 'Farhan Ali' },
  { id: 4,  user: 'Towing',             vehicle: 'DM-AU-11-5026',  driver: 'Md. Shah Alam' },
  { id: 5,  user: 'DG Secretariat',     vehicle: 'DM-GHA-14-4620', driver: 'Mizan Mia' },
];

export default function TPTRequisition() {
  const vehicleOptions = useVehicleOptions();
  const driverOptions  = useDriverOptions();

  const [topUser,    setTopUser]    = useState(null);
  const [topVehicle, setTopVehicle] = useState(null);
  const [topDriver,  setTopDriver]  = useState(null);

  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [trips,       setTrips]       = useState([]);

  /* ── Top-bar: add new assignment ── */
  function handleTopAdd() {
    if (!topUser || !topVehicle || !topDriver) {
      message.warning('Please select User Name, Vehicle Name and Driver Name');
      return;
    }
    if (assignments.some((a) => a.user === topUser)) {
      message.warning(`${topUser} already has an assigned vehicle`);
      return;
    }
    setAssignments((prev) => [...prev, { id: ++idSeq, user: topUser, vehicle: topVehicle, driver: topDriver }]);
    setTopUser(null); setTopVehicle(null); setTopDriver(null);
    message.success('Assignment added to TPT list');
  }

  /* ── Per-row: update vehicle or driver ── */
  function updateRow(id, field, value) {
    setAssignments((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  /* ── Per-row: start trip (Add button in table) ── */
  function handleStartTrip(record) {
    if (!record.vehicle || !record.driver) {
      message.warning('Please select both vehicle and driver before starting the trip');
      return;
    }
    const existing = trips.find((t) => t.user === record.user && !t.tripEnd);
    if (existing) { message.warning(`${record.user} already has an active trip`); return; }
    setTrips((prev) => [...prev, {
      id:        ++idSeq,
      user:      record.user,
      vehicle:   record.vehicle,
      driver:    record.driver,
      tripStart: dayjs().format('DD-MM-YYYY HH:mm:ss'),
      tripEnd:   null,
    }]);
    message.success(`Trip started for ${record.user}`);
  }

  /* ── Per-row: delete assignment ── */
  function handleDelete(id) {
    setAssignments((prev) => prev.filter((r) => r.id !== id));
    message.success('Assignment removed');
  }

  /* ── Trip log: end trip ── */
  function handleTripEnd(id) {
    setTrips((prev) => prev.map((t) =>
      t.id === id ? { ...t, tripEnd: dayjs().format('DD-MM-YYYY HH:mm:ss') } : t
    ));
    message.success('Trip ended');
  }

  /* ── Columns: Listed User for TPT Trip ── */
  const assignCols = [
    { title: 'SL', width: 52, render: (_, __, i) => <Text style={{ color: '#8c8c8c' }}>{i + 1}</Text> },
    { title: 'User Name', dataIndex: 'user', key: 'user', width: 180, render: (v) => <Text strong>{v}</Text> },
    {
      title: 'Vehicle Name', key: 'vehicle', width: 200,
      render: (_, r) => (
        <Select
          showSearch size="small" style={{ width: '100%' }}
          value={r.vehicle} placeholder="Select vehicle"
          options={vehicleOptions.length ? vehicleOptions : [{ value: r.vehicle, label: r.vehicle }]}
          filterOption={filterOption}
          onChange={(v) => updateRow(r.id, 'vehicle', v)}
        />
      ),
    },
    {
      title: 'Driver Name', key: 'driver', width: 200,
      render: (_, r) => (
        <Select
          showSearch size="small" style={{ width: '100%' }}
          value={r.driver} placeholder="Select driver"
          options={driverOptions.length ? driverOptions : [{ value: r.driver, label: r.driver }]}
          filterOption={filterOption}
          onChange={(v) => updateRow(r.id, 'driver', v)}
        />
      ),
    },
    {
      title: 'Action', key: 'action', width: 140, align: 'center',
      render: (_, r) => (
        <Space size={6}>
          <Button
            size="small" type="primary" icon={<PlusOutlined />}
            style={{ background: '#389e0d', borderColor: '#389e0d', minWidth: 68 }}
            onClick={() => handleStartTrip(r)}
          >
            Add
          </Button>
          <Popconfirm
            title="Remove this assignment?"
            okText="Delete" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r.id)}
          >
            <Button size="small" danger style={{ minWidth: 68 }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── Columns: List TPT Trip ── */
  const tripCols = [
    { title: 'SL', width: 52, render: (_, __, i) => <Text style={{ color: '#8c8c8c' }}>{i + 1}</Text> },
    { title: 'User Name',    dataIndex: 'user',    key: 'user',    width: 180, render: (v) => <Text strong>{v}</Text> },
    { title: 'Vehicle Name', dataIndex: 'vehicle', key: 'vehicle', width: 160 },
    { title: 'Driver Name',  dataIndex: 'driver',  key: 'driver',  width: 200 },
    {
      title: 'Trip Start', dataIndex: 'tripStart', key: 'tripStart', width: 170,
      render: (v) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{v}</Tag>,
    },
    {
      title: 'Trip End', dataIndex: 'tripEnd', key: 'tripEnd', width: 170,
      render: (v) => v
        ? <Tag color="green" style={{ fontFamily: 'monospace' }}>{v}</Tag>
        : <Tag color="default">N/A</Tag>,
    },
    {
      title: 'Action', key: 'action', width: 120, align: 'center',
      render: (_, r) => r.tripEnd ? (
        <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>
      ) : (
        <Popconfirm title="Mark this trip as ended?" okText="End Trip" onConfirm={() => handleTripEnd(r.id)}>
          <Button size="small" danger style={{ minWidth: 80 }}>Trip End</Button>
        </Popconfirm>
      ),
    },
  ];

  const activeTrips    = trips.filter((t) => !t.tripEnd).length;
  const completedTrips = trips.filter((t) =>  t.tripEnd).length;

  return (
    <div>
      <PageHeader
        icon={<ControlOutlined />} color="#096dd9" title="TPT Control Requisition"
        subtitle="Assign vehicles and drivers to users, then control trip start and end in real time"
        stats={[
          { label: 'Assigned',   value: assignments.length, color: '#096dd9' },
          { label: 'Active Trips',    value: activeTrips,    color: '#fa8c16' },
          { label: 'Completed',  value: completedTrips, color: '#52c41a' },
        ]}
      />

      {/* ── Top assignment bar ── */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="none">
            <Text strong style={{ color: '#ff4d4f' }}>User Name *</Text>
          </Col>
          <Col flex="220px">
            <Select
              showSearch style={{ width: '100%' }} placeholder="Please Select..."
              value={topUser} onChange={setTopUser} allowClear
              options={TPT_USERS.map((u) => ({ value: u, label: u }))}
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
            />
          </Col>

          <Col flex="none">
            <Text strong style={{ color: '#ff4d4f' }}>Vehicle Name *</Text>
          </Col>
          <Col flex="220px">
            <Select
              showSearch style={{ width: '100%' }} placeholder="Please Select..."
              value={topVehicle} onChange={setTopVehicle} allowClear
              options={vehicleOptions} filterOption={filterOption}
            />
          </Col>

          <Col flex="none">
            <Text strong style={{ color: '#ff4d4f' }}>Driver Name *</Text>
          </Col>
          <Col flex="220px">
            <Select
              showSearch style={{ width: '100%' }} placeholder="Please Select..."
              value={topDriver} onChange={setTopDriver} allowClear
              options={driverOptions} filterOption={filterOption}
            />
          </Col>

          <Col flex="none">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleTopAdd}
              style={{ background: '#096dd9' }}>
              Add
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── Listed User for TPT Trip ── */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16 }}
        title={
          <div>
            <Title level={5} style={{ margin: 0 }}>Listed User for TPT Trip</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Shows {assignments.length} entries
            </Text>
          </div>
        }
      >
        <Table
          dataSource={assignments}
          columns={assignCols}
          size="small"
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '25', '50'] }}
          rowClassName={(_, i) => i % 2 === 0 ? '' : 'ant-table-row-alt'}
        />
      </Card>

      {/* ── List TPT Trip ── */}
      <Card
        size="small"
        style={{ borderRadius: 12 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClockCircleOutlined style={{ color: '#096dd9' }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>List TPT Trip</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>Shows {trips.length} entries</Text>
            </div>
          </div>
        }
      >
        <Table
          dataSource={trips}
          columns={tripCols}
          size="small"
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '25', '50'] }}
          locale={{ emptyText: 'No trips started yet. Use the Add button in the assignment table above.' }}
          rowClassName={(r) => r.tripEnd ? 'ant-table-row-completed' : ''}
        />
      </Card>
    </div>
  );
}
