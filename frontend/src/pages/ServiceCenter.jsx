import {
  DeleteOutlined, EditOutlined, EyeOutlined,
  PlusOutlined, SearchOutlined, ShopOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input,
  Popconfirm, Row, Select, Spin, Table, Tag, message,
} from 'antd';
import { useState } from 'react';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { serviceCenterService } from '../services/serviceCenterService';

const STATUS_COLOR = { active: 'success', inactive: 'error' };
const SPECIALIZATIONS = [
  'General Service', 'Engine & Transmission', 'Brakes & Suspension',
  'Tyres & Wheels', 'Electrical & Electronics', 'AC & Cooling',
  'Body & Paint', 'PM Maintenance', 'Heavy Vehicles', 'EV & Hybrid',
];

export default function ServiceCenter() {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('service-centers', serviceCenterService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name',
      render: (v) => <span style={{ fontWeight:700 }}>{v}</span> },
    { title: 'Contact', dataIndex: 'contactPerson', key: 'contact' },
    { title: 'Phone',   dataIndex: 'phone',         key: 'phone' },
    { title: 'Specialization', dataIndex: 'specialization', key: 'spec',
      render: v => v ? v.split(',').map(s =>
        <Tag key={s} style={{ borderRadius:20, fontWeight:600, margin:'2px' }}>{s.trim()}</Tag>
      ) : '—' },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: s => <Tag color={STATUS_COLOR[s]}>{s?.toUpperCase()}</Tag> },
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 110,
      render: (_, r) => (
        <div style={{ display:'flex', gap:2 }}>
          <Button type="link" size="small" icon={<EyeOutlined/>}  onClick={()=>setViewRecord(r)}/>
          <Button type="link" size="small" icon={<EditOutlined/>}
            onClick={()=>{ setEditRecord(r); form.setFieldsValue({...r, specialization:r.specialization?.split(',')}); setModalOpen(true); }}/>
          <Popconfirm title="Delete this service center?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.contactPerson?.toLowerCase().includes(q);
  });

  function openAdd() { setEditRecord(null); form.resetFields(); form.setFieldValue('status','active'); setModalOpen(true); }

  function handleSubmit() {
    form.validateFields().then(v => {
      const payload = { ...v, specialization: Array.isArray(v.specialization) ? v.specialization.join(',') : (v.specialization ?? '') };
      save(editRecord?.id ?? null, payload);
    });
  }

  const active   = data.filter(s => s.status === 'active').length;
  const inactive = data.filter(s => s.status === 'inactive').length;

  return (
    <div>
      <PageHeader icon={<ShopOutlined/>} color="#06b6d4" title="Service Centers"
        subtitle="Manage approved workshops and vendors for vehicle maintenance"
        stats={[
          { label:'Total',    value:data.length, color:'#06b6d4' },
          { label:'Active',   value:active,      color:'#10b981' },
          { label:'Inactive', value:inactive,    color:'#f43f5e' },
        ]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Service Center</Button>}
      />

      <Card size="small" style={{ borderRadius:14 }}>
        <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
          <Input placeholder="Search by name or contact…" prefix={<SearchOutlined/>}
            value={search} onChange={e=>setSearch(e.target.value)} style={{ width:300, borderRadius:10 }} allowClear/>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small"
            scroll={{ x:'max-content' }} rowKey="id"
            pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}/>
        </Spin>
      </Card>

      {/* Add / Edit Modal */}
      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving} icon={<ShopOutlined/>} color="#06b6d4"
        title={editRecord ? `Edit — ${editRecord.name}` : 'Add Service Center'}
        subtitle={editRecord ? 'Update workshop details' : 'Register a new service center or workshop'}
        okText={editRecord ? 'Update' : 'Add Service Center'} width={680}>
        <Form form={form} layout="vertical" size="middle">
          <FormSection title="Basic Information" color="#06b6d4">
            <Row gutter={14}>
              <Col span={16}>
                <Form.Item name="name" label="Service Center Name" rules={[{required:true}]}>
                  <Input placeholder="e.g. Dhaka Motors Workshop" style={{ borderRadius:10 }}/>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="status" label="Status">
                  <Select options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item name="contactPerson" label="Contact Person">
                  <Input placeholder="Name" style={{ borderRadius:10 }}/>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="phone" label="Phone">
                  <Input placeholder="01XXXXXXXXX" style={{ borderRadius:10 }}/>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item name="email" label="Email">
                  <Input placeholder="workshop@example.com" style={{ borderRadius:10 }}/>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="taxId" label="Tax / BIN No (optional)">
                  <Input placeholder="VAT registration" style={{ borderRadius:10 }}/>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={2} placeholder="Full workshop address" style={{ borderRadius:10, resize:'none' }}/>
            </Form.Item>
          </FormSection>
          <FormSection title="Specialization" color="#8b5cf6">
            <Form.Item name="specialization" label="Areas of Expertise"
              tooltip="Select all service types this center handles">
              <Select mode="multiple" placeholder="Select specializations…"
                options={SPECIALIZATIONS.map(s=>({value:s,label:s}))}/>
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* View Drawer */}
      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)}
        title={viewRecord?.name ?? ''} width={440}
        extra={<Button size="small" icon={<EditOutlined/>}
          onClick={()=>{setViewRecord(null);setEditRecord(viewRecord);form.setFieldsValue({...viewRecord,specialization:viewRecord?.specialization?.split(',')});setModalOpen(true);}}>
          Edit
        </Button>}>
        {viewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{viewRecord.name}</Descriptions.Item>
            <Descriptions.Item label="Contact">{viewRecord.contactPerson??'—'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{viewRecord.phone??'—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewRecord.email??'—'}</Descriptions.Item>
            <Descriptions.Item label="Tax ID">{viewRecord.taxId??'—'}</Descriptions.Item>
            <Descriptions.Item label="Address">{viewRecord.address??'—'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[viewRecord.status]}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Specialization">
              {viewRecord.specialization?.split(',').map(s=><Tag key={s} style={{borderRadius:20,margin:'2px'}}>{s.trim()}</Tag>)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
