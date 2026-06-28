import {
  CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
  PlusOutlined, SaveOutlined, ShopOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Col, Divider, Form, Input, InputNumber,
  Modal, Row, Select, Space, Steps, Table, Tag, Typography, message,
} from 'antd';
import { useEffect, useState } from 'react';
import { serviceCenterService } from '../services/serviceCenterService';
import { formatCurrency } from '../utils/helpers';

const { Text } = Typography;

const WORKFLOW_STEPS = [
  { title: 'Draft' },
  { title: 'Sent to SC' },
  { title: 'Estimated' },
  { title: 'Pending Approval' },
  { title: 'Done' },
];

const WF_STATUS_STEP = {
  draft:            0,
  pending_estimate: 1,
  pending_approval: 3,
  approved:         4,
  in_progress:      4,
  completed:        5,
};

const WF_COLOR = {
  draft:            '#94a3b8',
  pending_estimate: '#f59e0b',
  pending_approval: '#6366f1',
  approved:         '#10b981',
  rejected:         '#f43f5e',
  in_progress:      '#06b6d4',
  completed:        '#10b981',
};

export default function MaintenanceWorkflow({ record, onRefresh, inventoryItems = [] }) {
  const qc = useQueryClient();
  const [workflowForm] = Form.useForm();
  const [actionModal, setActionModal] = useState(null);
  const [editingParts, setEditingParts] = useState(false);
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState({ partName: '', quantity: 1, unit: 'Pcs', unitCost: 0, fromInventory: false, inventoryId: null });

  const maintId = record?.id;

  const { data: savedParts = [], isLoading: partsLoading } = useQuery({
    queryKey: ['maint-parts', maintId],
    queryFn:  () => serviceCenterService.getParts(maintId).then(r => r.data?.data ?? []),
    enabled:  !!maintId,
  });

  useEffect(() => {
    if (!editingParts) setParts(savedParts);
  }, [savedParts, editingParts]);

  const { data: serviceCenters = [] } = useQuery({
    queryKey: ['service-centers-active'],
    queryFn:  () => serviceCenterService.getActive().then(r => r.data?.data ?? []),
  });

  const savePartsMut = useMutation({
    mutationFn: () => serviceCenterService.saveParts(maintId, parts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maint-parts', maintId] });
      setEditingParts(false);
      message.success('Parts saved');
      onRefresh?.();
    },
    onError: () => message.error('Failed to save parts'),
  });

  const workflowMut = useMutation({
    mutationFn: (body) => serviceCenterService.workflow(maintId, body),
    onSuccess: () => {
      setActionModal(null);
      workflowForm.resetFields();
      message.success('Workflow updated');
      onRefresh?.();
    },
    onError: (e) => message.error(e?.response?.data?.message ?? 'Action failed'),
  });

  if (!record) return null;

  const ws   = record.workflowStatus ?? 'draft';
  const step = WF_STATUS_STEP[ws] ?? 0;

  function addPart() {
    if (!newPart.partName.trim()) { message.warning('Enter part name'); return; }
    const total = (newPart.quantity ?? 0) * (newPart.unitCost ?? 0);
    setParts(prev => [...prev, { ...newPart, totalCost: total, _tempId: Date.now() }]);
    setNewPart({ partName: '', quantity: 1, unit: 'Pcs', unitCost: 0, fromInventory: false, inventoryId: null });
  }

  function removePart(idx) { setParts(prev => prev.filter((_, i) => i !== idx)); }

  function updatePart(idx, field, val) {
    setParts(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: val };
      updated.totalCost = (updated.quantity ?? 0) * (updated.unitCost ?? 0);
      return updated;
    }));
  }

  const displayParts = editingParts ? parts : savedParts;
  const totalCost    = displayParts.reduce((s, p) => s + (p.totalCost ?? 0), 0);

  const partsColumns = [
    {
      title: 'Part / Service', dataIndex: 'partName', key: 'name',
      render: (v, _, i) => editingParts
        ? <Input size="small" value={v} onChange={e => updatePart(i, 'partName', e.target.value)} style={{ minWidth: 130, borderRadius: 8 }} />
        : <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 75,
      render: (v, _, i) => editingParts
        ? <InputNumber size="small" value={v} min={0.01} step={0.5} onChange={val => updatePart(i, 'quantity', val)} style={{ width: 70 }} />
        : v,
    },
    {
      title: 'Unit', dataIndex: 'unit', key: 'unit', width: 72,
      render: (v, _, i) => editingParts
        ? <Select size="small" value={v} onChange={val => updatePart(i, 'unit', val)} style={{ width: 68 }}
            options={['Pcs', 'L', 'kg', 'Set', 'm'].map(u => ({ value: u, label: u }))} />
        : v,
    },
    {
      title: 'Unit Cost (৳)', dataIndex: 'unitCost', key: 'cost', width: 120,
      render: (v, _, i) => editingParts
        ? <InputNumber size="small" value={v} min={0} precision={2} onChange={val => updatePart(i, 'unitCost', val)} style={{ width: 105 }} />
        : formatCurrency(v),
    },
    {
      title: 'Total', dataIndex: 'totalCost', key: 'total', width: 115,
      render: v => <span style={{ fontWeight: 800, color: '#6366f1' }}>{formatCurrency(v)}</span>,
    },
    {
      title: 'Source', dataIndex: 'fromInventory', key: 'src', width: 95,
      render: v => <Tag color={v ? 'processing' : 'default'} style={{ borderRadius: 20, fontSize: 11 }}>{v ? 'Stock' : 'External'}</Tag>,
    },
    ...(editingParts ? [{
      title: '', key: 'del', width: 36,
      render: (_, __, i) => <Button danger type="link" size="small" onClick={() => removePart(i)} style={{ padding: 0 }}>✕</Button>,
    }] : []),
  ];

  return (
    <div>
      {/* Workflow progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Tag style={{
            background: `${WF_COLOR[ws]}18`, color: WF_COLOR[ws], borderColor: `${WF_COLOR[ws]}40`,
            borderRadius: 20, fontWeight: 800, fontSize: 12, padding: '3px 14px',
          }}>
            {ws.replace(/_/g, ' ').toUpperCase()}
          </Tag>
          {record.serviceCenterId && (() => {
            const sc = serviceCenters.find(s => s.id === record.serviceCenterId);
            return sc ? (
              <Text style={{ fontSize: 12, color: '#64748b' }}>
                <ShopOutlined style={{ marginRight: 4 }} />{sc.name}
              </Text>
            ) : null;
          })()}
        </div>
        <Steps current={step} size="small" items={WORKFLOW_STEPS} />
      </div>

      {/* Cost summary row */}
      {(record.estimatedCost > 0 || record.approvedCost > 0) && (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          {record.estimatedCost > 0 && (
            <Col span={12}>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '8px 14px' }}>
                <Text style={{ fontSize: 11, color: '#92400e', display: 'block' }}>SC Estimate</Text>
                <Text style={{ fontWeight: 800, color: '#f59e0b', fontSize: 16 }}>{formatCurrency(record.estimatedCost)}</Text>
                {record.invoiceNo && <Text style={{ fontSize: 11, color: '#92400e', display: 'block' }}>Ref: {record.invoiceNo}</Text>}
              </div>
            </Col>
          )}
          {record.approvedCost > 0 && (
            <Col span={12}>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '8px 14px' }}>
                <Text style={{ fontSize: 11, color: '#065f46', display: 'block' }}>Approved Cost</Text>
                <Text style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>{formatCurrency(record.approvedCost)}</Text>
              </div>
            </Col>
          )}
        </Row>
      )}

      {/* Parts table */}
      <Divider orientation="left" orientationMargin={0} style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#6366f1' }}>⚙ Parts &amp; Services</span>
      </Divider>

      <Table
        dataSource={displayParts}
        columns={partsColumns}
        size="small"
        rowKey={(r, i) => r.id ?? r._tempId ?? i}
        pagination={false}
        loading={partsLoading}
        locale={{ emptyText: 'No parts listed yet' }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell colSpan={3} index={0} />
            <Table.Summary.Cell index={1}>
              <span style={{ fontWeight: 700, fontSize: 12, float: 'right' }}>Total:</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>
              <span style={{ fontWeight: 900, color: '#6366f1', fontSize: 14 }}>{formatCurrency(totalCost)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell colSpan={2} index={3} />
          </Table.Summary.Row>
        )}
      />

      {/* New part row when editing */}
      {editingParts && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(99,102,241,0.04)', borderRadius: 10, border: '1px dashed rgba(99,102,241,0.3)' }}>
          <Row gutter={8} align="middle" wrap>
            <Col>
              <Select size="small" value={newPart.fromInventory}
                onChange={v => setNewPart(p => ({ ...p, fromInventory: v, inventoryId: null, partName: '', unitCost: 0 }))}
                style={{ width: 110 }}
                options={[{ value: false, label: 'External' }, { value: true, label: 'From Stock' }]} />
            </Col>
            {newPart.fromInventory ? (
              <Col flex="auto">
                <Select size="small" showSearch placeholder="Pick inventory item…" style={{ width: '100%', minWidth: 160 }}
                  filterOption={(input, opt) => opt?.label?.toLowerCase().includes(input.toLowerCase())}
                  options={inventoryItems.map(i => ({ value: i.id, label: `${i.name} (${i.itemCode ?? ''})` }))}
                  onChange={(id) => {
                    const item = inventoryItems.find(it => it.id === id);
                    setNewPart(p => ({ ...p, inventoryId: id, partName: item?.name ?? '', itemCode: item?.itemCode, unitCost: item?.unitPrice ?? 0 }));
                  }} />
              </Col>
            ) : (
              <Col flex="auto">
                <Input size="small" placeholder="Part or service name" value={newPart.partName}
                  onChange={e => setNewPart(p => ({ ...p, partName: e.target.value }))} style={{ borderRadius: 8 }} />
              </Col>
            )}
            <Col>
              <InputNumber size="small" value={newPart.quantity} min={0.01} step={0.5}
                onChange={v => setNewPart(p => ({ ...p, quantity: v }))} style={{ width: 68 }} placeholder="Qty" />
            </Col>
            <Col>
              <Select size="small" value={newPart.unit} onChange={v => setNewPart(p => ({ ...p, unit: v }))} style={{ width: 65 }}
                options={['Pcs', 'L', 'kg', 'Set', 'm'].map(u => ({ value: u, label: u }))} />
            </Col>
            <Col>
              <InputNumber size="small" value={newPart.unitCost} min={0} precision={2}
                onChange={v => setNewPart(p => ({ ...p, unitCost: v }))} style={{ width: 90 }} placeholder="৳" />
            </Col>
            <Col>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addPart} style={{ borderRadius: 8 }}>Add</Button>
            </Col>
          </Row>
        </div>
      )}

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        {!editingParts ? (
          <Button size="small" icon={<PlusOutlined />}
            onClick={() => { setParts([...savedParts]); setEditingParts(true); }}>
            {savedParts.length ? 'Edit Parts' : 'Add Parts'}
          </Button>
        ) : (
          <>
            <Button type="primary" size="small" icon={<SaveOutlined />}
              loading={savePartsMut.isPending} onClick={() => savePartsMut.mutate()}>
              Save Parts
            </Button>
            <Button size="small" onClick={() => { setEditingParts(false); setParts(savedParts); }}>Cancel</Button>
          </>
        )}
      </div>

      {/* Approver notes */}
      {record.approverNotes && (
        <Alert style={{ marginTop: 12 }} showIcon
          type={ws === 'rejected' ? 'error' : 'info'}
          message={ws === 'rejected' ? 'Rejection Reason' : 'Approver Notes'}
          description={record.approverNotes} />
      )}

      {/* Workflow action buttons */}
      <Divider style={{ marginTop: 14, marginBottom: 12 }} />
      <Space wrap>
        {ws === 'draft' && (
          <Button type="primary" icon={<ShopOutlined />}
            onClick={() => { workflowForm.resetFields(); setActionModal('submit'); }}>
            Submit to Service Center
          </Button>
        )}
        {ws === 'pending_estimate' && (
          <Button type="primary" icon={<FileTextOutlined />}
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', border: 'none' }}
            onClick={() => { workflowForm.resetFields(); setActionModal('estimate'); }}>
            Enter Cost Estimate
          </Button>
        )}
        {ws === 'pending_approval' && (
          <>
            <Button type="primary" icon={<CheckCircleOutlined />}
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none' }}
              onClick={() => {
                workflowForm.setFieldsValue({ approvedCost: record.estimatedCost });
                setActionModal('approve');
              }}>
              Approve &amp; Set Final Cost
            </Button>
            <Button danger icon={<CloseCircleOutlined />}
              onClick={() => { workflowForm.resetFields(); setActionModal('reject'); }}>
              Reject
            </Button>
          </>
        )}
        {ws === 'approved' && (
          <Button onClick={() => workflowMut.mutate({ action: 'start' })} loading={workflowMut.isPending}>
            Mark In Progress
          </Button>
        )}
        {ws === 'in_progress' && (
          <Button type="primary" onClick={() => workflowMut.mutate({ action: 'complete' })} loading={workflowMut.isPending}>
            Mark Completed
          </Button>
        )}
      </Space>

      {/* Action modals */}
      <Modal
        open={!!actionModal} onCancel={() => setActionModal(null)} footer={null}
        destroyOnClose width={460}
        title={
          actionModal === 'submit'   ? '📤 Submit to Service Center' :
          actionModal === 'estimate' ? '💰 Enter Cost Estimate' :
          actionModal === 'approve'  ? '✅ Approve Maintenance' :
                                       '❌ Reject Request'
        }
      >
        <Form form={workflowForm} layout="vertical" style={{ marginTop: 12 }}>
          {actionModal === 'submit' && (
            <>
              <Form.Item name="serviceCenterId" label="Select Service Center" rules={[{ required: true, message: 'Choose a service center' }]}>
                <Select showSearch placeholder="Choose workshop…"
                  filterOption={(input, opt) => opt?.label?.toLowerCase().includes(input.toLowerCase())}
                  options={serviceCenters.map(sc => ({
                    value: sc.id,
                    label: `${sc.name}${sc.phone ? ` — ${sc.phone}` : ''}`,
                  }))} />
              </Form.Item>
              <Form.Item name="requesterNotes" label="Notes for Service Center (optional)">
                <Input.TextArea rows={3} placeholder="Describe the problem or parts needed…" style={{ borderRadius: 10, resize: 'none' }} />
              </Form.Item>
            </>
          )}

          {actionModal === 'estimate' && (
            <>
              <Alert type="info" showIcon style={{ marginBottom: 12 }}
                message="Enter the cost estimate. This will go to the approver for review." />
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="invoiceNo" label="Quotation / Invoice No">
                    <Input placeholder="INV-2026-001" style={{ borderRadius: 10 }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="invoiceDate" label="Invoice Date">
                    <Input type="date" style={{ borderRadius: 10, width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="estimatedCost" label="Total Estimated Cost (৳)" rules={[{ required: true, message: 'Enter the cost' }]}>
                <InputNumber style={{ width: '100%', height: 44, fontSize: 18, fontWeight: 700 }}
                  min={0} precision={2} placeholder="0.00" />
              </Form.Item>
            </>
          )}

          {actionModal === 'approve' && (
            <>
              <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#64748b' }}>SC Estimate: </Text>
                <Text strong style={{ color: '#6366f1', fontSize: 16 }}>{formatCurrency(record.estimatedCost)}</Text>
              </div>
              <Form.Item name="approvedCost" label="Approved Final Cost (৳) — adjust if needed" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%', height: 44, fontSize: 18, fontWeight: 700 }} min={0} precision={2} />
              </Form.Item>
              <Form.Item name="approverNotes" label="Notes (optional)">
                <Input.TextArea rows={2} style={{ borderRadius: 10, resize: 'none' }} />
              </Form.Item>
            </>
          )}

          {actionModal === 'reject' && (
            <Form.Item name="approverNotes" label="Reason for Rejection" rules={[{ required: true, message: 'State the reason' }]}>
              <Input.TextArea rows={4} placeholder="Why is this request being rejected…" style={{ borderRadius: 10, resize: 'none' }} />
            </Form.Item>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setActionModal(null)}>Cancel</Button>
            <Button type="primary" loading={workflowMut.isPending}
              danger={actionModal === 'reject'}
              style={actionModal === 'approve'
                ? { background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none' }
                : undefined}
              onClick={() => workflowForm.validateFields().then(v =>
                workflowMut.mutate({ action: actionModal, ...v })
              )}>
              {actionModal === 'submit'   ? 'Submit'          :
               actionModal === 'estimate' ? 'Submit Estimate' :
               actionModal === 'approve'  ? 'Approve'         : 'Reject'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
