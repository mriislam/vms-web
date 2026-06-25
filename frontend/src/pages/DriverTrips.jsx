import {
  CarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  EnvironmentOutlined, PlayCircleOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  Badge, Button, Card, Col, Descriptions, Drawer, Empty, Modal,
  Row, Spin, Steps, Tag, Timeline, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import apiClient from '../services/apiClient';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const statusConfig = {
  pending:     { color: 'default',   label: 'Pending',     icon: <ClockCircleOutlined /> },
  approved:    { color: 'processing', label: 'Approved',    icon: <CarOutlined /> },
  in_progress: { color: 'success',   label: 'In Progress', icon: <PlayCircleOutlined /> },
  completed:   { color: 'success',   label: 'Completed',   icon: <CheckCircleOutlined /> },
  rejected:    { color: 'error',     label: 'Rejected',    icon: null },
};

async function driverAction(tripId, action) {
  const res = await apiClient.post(`/driver/trips/${tripId}/${action}`);
  return res.data?.data;
}

export default function DriverTrips() {
  const [detail, setDetail] = useState(null);
  const [acting, setActing] = useState(null); // tripId being mutated

  const { data: trips, isLoading, refetch } = useApiCrud('driver-trips', {
    getAll: () => apiClient.get('/driver/trips').then((r) => ({ data: { data: r.data?.data ?? [] } })),
  });

  const pending    = trips.filter((t) => t.status === 'approved').length;
  const inProgress = trips.filter((t) => t.status === 'in_progress').length;
  const done       = trips.filter((t) => t.status === 'completed').length;

  async function handleAction(trip, action) {
    const label = action === 'start' ? 'start' : 'end';
    Modal.confirm({
      title: `${action === 'start' ? 'Start' : 'End'} trip ${trip.reqNo}?`,
      content: action === 'start'
        ? `Confirm departure from ${trip.fromLocation}.`
        : `Confirm arrival at ${trip.toLocation}.`,
      okText: action === 'start' ? 'Start Trip' : 'End Trip',
      okButtonProps: { type: 'primary', danger: action === 'end' },
      onOk: async () => {
        setActing(trip.id);
        try {
          await driverAction(trip.id, action);
          message.success(`Trip ${action === 'start' ? 'started' : 'completed'} successfully`);
          refetch?.();
        } catch {
          message.error('Action failed — please try again');
        } finally {
          setActing(null);
        }
      },
    });
  }

  return (
    <div>
      <PageHeader
        icon={<CarOutlined />} color="#52c41a" title="My Trips"
        subtitle="View and manage your assigned vehicle trips"
        stats={[
          { label: 'Ready to Start', value: pending,    color: '#1677ff' },
          { label: 'In Progress',    value: inProgress, color: '#fa8c16' },
          { label: 'Completed',      value: done,       color: '#52c41a' },
        ]}
      />

      <Spin spinning={isLoading}>
        {trips.length === 0 && !isLoading ? (
          <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
            <Empty description="No trips assigned to you yet" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {trips.map((trip) => {
              const sc = statusConfig[trip.status] ?? statusConfig.pending;
              const isActing = acting === trip.id;
              return (
                <Col xs={24} md={12} xl={8} key={trip.id}>
                  <Card
                    size="small"
                    style={{ borderRadius: 12, borderLeft: `4px solid ${sc.color === 'processing' ? '#1677ff' : sc.color === 'success' ? '#52c41a' : '#d9d9d9'}` }}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{trip.reqNo}</Text>
                        <Badge status={sc.color} text={sc.label} />
                      </div>
                    }
                    actions={[
                      trip.status === 'approved' && (
                        <Button
                          key="start" type="primary" icon={<PlayCircleOutlined />}
                          loading={isActing} size="small"
                          onClick={() => handleAction(trip, 'start')}
                        >
                          Start Trip
                        </Button>
                      ),
                      trip.status === 'in_progress' && (
                        <Button
                          key="end" type="primary" danger icon={<CheckCircleOutlined />}
                          loading={isActing} size="small"
                          onClick={() => handleAction(trip, 'end')}
                        >
                          End Trip
                        </Button>
                      ),
                      <Button key="detail" type="link" size="small" onClick={() => setDetail(trip)}>
                        Details
                      </Button>,
                    ].filter(Boolean)}
                  >
                    {/* Route */}
                    <div style={{ marginBottom: 12 }}>
                      <Steps
                        direction="vertical" size="small" current={trip.status === 'in_progress' ? 1 : trip.status === 'completed' ? 2 : 0}
                        style={{ marginLeft: 4 }}
                        items={[
                          {
                            title: <Text style={{ fontSize: 13 }}>{trip.fromLocation || '—'}</Text>,
                            description: trip.fromDatetime
                              ? dayjs(trip.fromDatetime).format('DD MMM HH:mm')
                              : 'Departure',
                            icon: <EnvironmentOutlined style={{ color: '#1677ff' }} />,
                          },
                          {
                            title: <Text style={{ fontSize: 13 }}>{trip.toLocation || '—'}</Text>,
                            description: trip.toDatetime
                              ? dayjs(trip.toDatetime).format('DD MMM HH:mm')
                              : 'Arrival',
                            icon: <EnvironmentOutlined style={{ color: '#52c41a' }} />,
                          },
                        ]}
                      />
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {trip.distanceKm && (
                        <Tag color="blue">{trip.distanceKm} km</Tag>
                      )}
                      {trip.passengers && (
                        <Tag icon={<UserOutlined />}>{trip.passengers} pax</Tag>
                      )}
                      {trip.vehicleReg && (
                        <Tag icon={<CarOutlined />}>{trip.vehicleReg}</Tag>
                      )}
                      {trip.priority && (
                        <Tag color={trip.priority === 'urgent' ? 'red' : trip.priority === 'high' ? 'orange' : 'default'}>
                          {trip.priority?.toUpperCase()}
                        </Tag>
                      )}
                    </div>

                    {trip.purpose && (
                      <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                        {trip.purpose}
                      </Text>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* Detail drawer */}
      <Drawer
        open={!!detail} onClose={() => setDetail(null)}
        title={detail ? `Trip ${detail.reqNo}` : ''} width={460}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Status" span={2}>
                <Badge status={statusConfig[detail.status]?.color ?? 'default'} text={statusConfig[detail.status]?.label ?? detail.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Booking No">{detail.reqNo}</Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={detail.priority === 'urgent' ? 'red' : detail.priority === 'high' ? 'orange' : 'blue'}>
                  {detail.priority?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Purpose" span={2}>{detail.purpose}</Descriptions.Item>
              <Descriptions.Item label="From" span={2}>
                {detail.fromLocation}
                {detail.fromLat && <div style={{ fontSize: 11, color: '#888' }}>📍 {detail.fromLat?.toFixed(4)}, {detail.fromLng?.toFixed(4)}</div>}
              </Descriptions.Item>
              <Descriptions.Item label="To" span={2}>
                {detail.toLocation}
                {detail.toLat && <div style={{ fontSize: 11, color: '#888' }}>📍 {detail.toLat?.toFixed(4)}, {detail.toLng?.toFixed(4)}</div>}
              </Descriptions.Item>
              <Descriptions.Item label="Depart">
                {detail.fromDatetime ? dayjs(detail.fromDatetime).format('DD MMM YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Arrive">
                {detail.toDatetime ? dayjs(detail.toDatetime).format('DD MMM YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Distance">{detail.distanceKm ? `${detail.distanceKm} km` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Passengers">{detail.passengers ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Vehicle">{detail.vehicleReg ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Approved By">{detail.approvedBy ?? '—'}</Descriptions.Item>
              {detail.remarks && (
                <Descriptions.Item label="Notes" span={2}>{detail.remarks}</Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5}>Trip Timeline</Title>
            <Timeline
              items={[
                { color: 'blue',  children: `Booking submitted${detail.createdAt ? ' — ' + dayjs(detail.createdAt).format('DD MMM HH:mm') : ''}` },
                detail.status !== 'pending' && { color: 'green', children: `Approved by ${detail.approvedBy ?? 'manager'}` },
                detail.status === 'in_progress' || detail.status === 'completed'
                  ? { color: 'orange', children: 'Trip started' }
                  : detail.fromDatetime
                    ? { color: 'grey',   children: `Scheduled departure: ${dayjs(detail.fromDatetime).format('DD MMM HH:mm')}` }
                    : null,
                detail.status === 'completed'
                  ? { color: 'green', children: 'Trip completed ✓' }
                  : detail.toDatetime
                    ? { color: 'grey', children: `Scheduled arrival: ${dayjs(detail.toDatetime).format('DD MMM HH:mm')}` }
                    : null,
              ].filter(Boolean)}
            />

            {detail.status === 'approved' && (
              <Button block type="primary" icon={<PlayCircleOutlined />} style={{ marginTop: 16 }}
                loading={acting === detail.id}
                onClick={() => { setDetail(null); handleAction(detail, 'start'); }}>
                Start This Trip
              </Button>
            )}
            {detail.status === 'in_progress' && (
              <Button block type="primary" danger icon={<CheckCircleOutlined />} style={{ marginTop: 16 }}
                loading={acting === detail.id}
                onClick={() => { setDetail(null); handleAction(detail, 'end'); }}>
                Mark Trip Completed
              </Button>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
