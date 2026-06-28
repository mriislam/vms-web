import {
  DeleteOutlined, EditOutlined, EyeOutlined, LockOutlined, PlusOutlined,
  QrcodeOutlined, SafetyOutlined, SearchOutlined, UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Card, Col, Descriptions, Drawer, Form, Input, Popconfirm,
  Row, Select, Spin, Switch, Table, Tag, Tooltip, message,
} from 'antd';
import apiClient from '../services/apiClient';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { userService } from '../services/userService';
import { formatDate, formatDateTime } from '../utils/helpers';

const roleColor = { admin: 'red', manager: 'orange', operator: 'blue', viewer: 'default' };
const DEPARTMENTS = ['IT', 'Operations', 'Finance', 'HR', 'Admin', 'Logistics'];

const COLUMNS_DEF = [
  { key: 'username',   columnTitle: 'Username',    title: 'Username',    dataIndex: 'username' },
  { key: 'fullName',   columnTitle: 'Full Name',   title: 'Full Name',   dataIndex: 'fullName' },
  { key: 'email',      columnTitle: 'Email',       title: 'Email',       dataIndex: 'email' },
  { key: 'role',       columnTitle: 'Role',        title: 'Role',        dataIndex: 'role',       render: (r) => <Tag color={roleColor[r]}>{r?.toUpperCase()}</Tag> },
  { key: 'status',     columnTitle: 'Status',      title: 'Status',      dataIndex: 'status',     render: (s) => <Tag color={s === 'active' ? 'green' : 'red'}>{s?.toUpperCase()}</Tag> },
  { key: 'lastLogin',  columnTitle: 'Last Login',  title: 'Last Login',  dataIndex: 'lastLogin',  render: (d) => formatDateTime(d) },
  { key: 'phone',      columnTitle: 'Phone',       title: 'Phone',       dataIndex: 'phone',      defaultVisible: false },
  { key: 'department', columnTitle: 'Department',  title: 'Department',  dataIndex: 'department', defaultVisible: false },
  { key: 'createdAt',  columnTitle: 'Created At',  title: 'Created At',  dataIndex: 'createdAt',  defaultVisible: false, render: (d) => formatDate(d) },
  { key: 'loginCount', columnTitle: 'Login Count', title: 'Login Count', dataIndex: 'loginCount', defaultVisible: false },
];

export default function UserAdmin() {
  const [search, setSearch]         = useState('');
  const [roleFilter, setRole]       = useState('all');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [pwdModal, setPwdModal]     = useState(null);
  const [pwdForm] = Form.useForm();
  const [form] = Form.useForm();
  // 2FA state
  const [mfaSetup,   setMfaSetup]   = useState(null);  // { secret, otpUri }
  const [mfaCode,    setMfaCode]    = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disableMfaCode, setDisableMfaCode] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('users', userService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => userService.toggleStatus(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); message.success('Status updated'); },
  });

  const resetPwdMut = useMutation({
    mutationFn: ({ id, body }) => userService.resetPassword(id, body),
    onSuccess: () => { setPwdModal(null); message.success('Password reset successfully'); },
    onError: () => message.error('Failed to reset password'),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('user-admin', COLUMNS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title: 'Actions', key: 'actions', fixed: 'right', width: 130,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Button type="link" size="small" icon={<EyeOutlined />}  onClick={() => setViewRecord(r)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button type="link" size="small" icon={<LockOutlined />} onClick={() => openPwdModal(r)} title="Reset Password" />
          <Popconfirm title="Delete this user?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((d) => {
    const q = search.toLowerCase();
    return (!q || d.username?.toLowerCase().includes(q) || d.fullName?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q))
      && (roleFilter === 'all' || d.role === roleFilter)
      && (statusFilter === 'all' || d.status === statusFilter);
  });

  function openAdd() { setEditRecord(null); form.resetFields(); setMfaSetup(null); setMfaCode(''); setModalOpen(true); }
  function openEdit(record) { setEditRecord(record); form.setFieldsValue({ ...record }); setMfaSetup(null); setMfaCode(''); setDisableMfaCode(''); setModalOpen(true); }

  async function startMfaSetup() {
    setMfaLoading(true);
    try {
      const res = await apiClient.get('/auth/setup-mfa');
      setMfaSetup(res.data.data);
      setMfaCode('');
    } catch { message.error('Failed to generate 2FA setup — ensure you are logged in as this user'); }
    finally { setMfaLoading(false); }
  }

  async function confirmEnableMfa() {
    if (mfaCode.length !== 6) { message.warning('Enter the 6-digit code from Google Authenticator'); return; }
    setMfaLoading(true);
    try {
      await apiClient.post('/auth/enable-mfa', { code: mfaCode });
      message.success('✓ 2FA enabled successfully');
      setMfaSetup(null); setMfaCode('');
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (e) { message.error(e?.response?.data?.message ?? 'Invalid code. Try again.'); }
    finally { setMfaLoading(false); }
  }

  async function confirmDisableMfa() {
    if (disableMfaCode.length !== 6) { message.warning('Enter the 6-digit code to confirm disabling 2FA'); return; }
    setMfaLoading(true);
    try {
      await apiClient.post('/auth/disable-mfa', { code: disableMfaCode });
      message.success('2FA disabled');
      setDisableMfaCode('');
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (e) { message.error(e?.response?.data?.message ?? 'Invalid code'); }
    finally { setMfaLoading(false); }
  }
  function openPwdModal(record) { setPwdModal(record); pwdForm.resetFields(); }

  function handleSubmit() {
    form.validateFields().then((values) => save(editRecord?.id ?? null, values));
  }

  function handlePwdReset() {
    pwdForm.validateFields().then((values) => {
      resetPwdMut.mutate({ id: pwdModal.id, body: { newPassword: values.newPassword } });
    });
  }

  const active   = data.filter((u) => u.status === 'active').length;
  const inactive = data.filter((u) => u.status === 'inactive').length;
  const roles    = [...new Set(data.map((u) => u.role))].length;

  return (
    <div>
      <PageHeader
        icon={<UserOutlined />}
        color="#ff4d4f"
        title="User Administration"
        subtitle="System user accounts, roles and access control"
        stats={[
          { label: 'Active Users', value: active,   color: '#52c41a' },
          { label: 'Inactive',     value: inactive, color: '#ff4d4f' },
          { label: 'Roles',        value: roles,    color: '#722ed1' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}>
            Add User
          </Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
        <Row gutter={[12, 12]}>
          <Col flex="1">
            <Input prefix={<SearchOutlined />} placeholder="Search by username, name or email…" value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
          </Col>
          <Col>
            <Select value={roleFilter} onChange={setRole} style={{ width: 130 }}
              options={[{value:'all',label:'All Roles'},{value:'admin',label:'Admin'},{value:'manager',label:'Manager'},{value:'operator',label:'Operator'},{value:'viewer',label:'Viewer'}]} />
          </Col>
          <Col>
            <Select value={statusFilter} onChange={setStatus} style={{ width: 130 }}
              options={[{value:'all',label:'All Status'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} />
          </Col>
        </Row>
      </Card>

      <Card size="small" style={{ borderRadius: 12 }} extra={<ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault} />}>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" rowKey="id" scroll={{ x: 'max-content' }} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }} />
        </Spin>
      </Card>

      {/* Add / Edit Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        title={editRecord ? 'Edit User' : 'Add User'}
        subtitle={editRecord ? `Editing ${editRecord.username}` : 'Create a new system user'}
        icon={<UserOutlined />} color="#ff4d4f" okText={editRecord ? 'Update' : 'Create'}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Account Info" color="#ff4d4f">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="username" label="Username" rules={[{required:true}]}><Input placeholder="username"/></Form.Item></Col>
              <Col span={12}><Form.Item name="fullName" label="Full Name" rules={[{required:true}]}><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="email" label="Email" rules={[{required:true,type:'email'}]}><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="phone" label="Phone"><Input/></Form.Item></Col>
              {!editRecord && (
                <Col span={12}>
                  <Form.Item name="password" label="Password" rules={[{required:true,min:6}]}>
                    <Input.Password placeholder="Initial password"/>
                  </Form.Item>
                </Col>
              )}
            </Row>
          </FormSection>
          <FormSection title="Role & Access" color="#722ed1">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="role" label="Role" rules={[{required:true}]}><Select options={[{value:'admin',label:'Admin'},{value:'manager',label:'Manager'},{value:'operator',label:'Operator'},{value:'viewer',label:'Viewer'}]}/></Form.Item></Col>
              <Col span={12}><Form.Item name="department" label="Department"><Select options={DEPARTMENTS.map(d=>({value:d,label:d}))}/></Form.Item></Col>
              <Col span={12}><Form.Item name="status" label="Status" rules={[{required:true}]}><Select options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/></Form.Item></Col>
            </Row>
          </FormSection>

          {/* ── 2FA Section (edit only) ─────────────────────────────── */}
          {editRecord && (
            <FormSection title="Two-Factor Authentication (2FA)" color="#6366f1" icon={<SafetyOutlined />}>
              {editRecord.mfaEnabled ? (
                /* ── 2FA ENABLED ── */
                <div style={{ background:'rgba(16,185,129,0.06)', border:'1.5px solid rgba(16,185,129,0.25)',
                  borderRadius:12, padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'rgba(16,185,129,0.15)',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <SafetyOutlined style={{ color:'#10b981', fontSize:18 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, color:'#10b981', fontSize:14 }}>2FA Active ✓</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>Google Authenticator is protecting this account</div>
                    </div>
                    <Tag color="success" style={{ fontWeight:700, borderRadius:20, padding:'2px 12px' }}>ENABLED</Tag>
                  </div>
                  <div style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize:12, color:'#64748b', marginBottom:8, fontWeight:600 }}>
                      🔑 To disable 2FA, enter a code from your authenticator app:
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Input placeholder="6-digit code" maxLength={6} value={disableMfaCode}
                        onChange={e => setDisableMfaCode(e.target.value.replace(/\D/g,''))}
                        style={{ width:160, textAlign:'center', fontSize:22, fontWeight:800,
                          letterSpacing:6, borderRadius:10, border:'2px solid #e2e8f0' }} />
                      <Button danger loading={mfaLoading} onClick={confirmDisableMfa}
                        disabled={disableMfaCode.length !== 6}
                        style={{ borderRadius:10, fontWeight:700, height:40 }}>
                        Disable 2FA
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !mfaSetup ? (
                /* ── 2FA DISABLED — step 0: call to action ── */
                <div style={{ background:'rgba(99,102,241,0.04)', border:'1.5px dashed rgba(99,102,241,0.3)',
                  borderRadius:12, padding:'20px', textAlign:'center' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
                  <div style={{ fontWeight:800, fontSize:15, color:'#1e293b', marginBottom:4 }}>
                    Two-Factor Authentication is OFF
                  </div>
                  <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
                    Add an extra layer of security using Google Authenticator
                  </div>
                  <Button type="primary" icon={<QrcodeOutlined />} loading={mfaLoading} onClick={startMfaSetup}
                    size="large"
                    style={{ borderRadius:10, fontWeight:700, background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      border:'none', boxShadow:'0 4px 14px rgba(99,102,241,0.4)', height:44, paddingInline:28 }}>
                    Enable Google Authenticator
                  </Button>
                </div>
              ) : (
                /* ── 2FA SETUP — step 1+2: scan + verify ── */
                <div>
                  {/* Steps indicator */}
                  <div style={{ display:'flex', gap:0, marginBottom:20 }}>
                    {['Scan QR Code', 'Verify Code', 'Done!'].map((s, i) => (
                      <div key={s} style={{ flex:1, textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center' }}>
                          {i > 0 && <div style={{ flex:1, height:2, background: i === 1 ? '#6366f1' : '#e2e8f0', marginTop:-10 }} />}
                          <div style={{
                            width:28, height:28, borderRadius:'50%', margin:'0 auto',
                            background: i <= 1 ? '#6366f1' : '#e2e8f0',
                            color: i <= 1 ? '#fff' : '#94a3b8',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontWeight:800, fontSize:13,
                          }}>{i + 1}</div>
                          {i < 2 && <div style={{ flex:1, height:2, background:'#e2e8f0', marginTop:-10 }} />}
                        </div>
                        <div style={{ fontSize:11, color: i <= 1 ? '#6366f1' : '#94a3b8', marginTop:4, fontWeight:600 }}>{s}</div>
                      </div>
                    ))}
                  </div>

                  {/* Step 1: QR code */}
                  <div style={{ background:'#fafbff', border:'1px solid rgba(99,102,241,0.12)',
                    borderRadius:12, padding:'16px', marginBottom:14, textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
                      📱 Open Google Authenticator → Add account → Scan QR code
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', marginBottom:12 }}>
                      Or manually enter the key:&nbsp;
                      <code style={{ background:'#f1f5f9', padding:'3px 8px', borderRadius:6,
                        fontSize:12, fontWeight:700, color:'#6366f1', letterSpacing:1 }}>
                        {mfaSetup.secret}
                      </code>
                    </div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(mfaSetup.otpUri)}`}
                      alt="2FA QR Code"
                      style={{ borderRadius:14, border:'4px solid #6366f1',
                        boxShadow:'0 8px 24px rgba(99,102,241,0.25)' }}
                      width={200} height={200}
                    />
                  </div>

                  {/* Step 2: Enter code */}
                  <div style={{ background:'#fff', border:'1px solid rgba(99,102,241,0.15)',
                    borderRadius:12, padding:'16px' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:12 }}>
                      ✅ Step 2 — Enter the 6-digit code from your app to confirm:
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <Input placeholder="0 0 0 0 0 0" maxLength={6} value={mfaCode}
                        onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
                        style={{ width:180, textAlign:'center', fontSize:24, fontWeight:900,
                          letterSpacing:8, borderRadius:10, border:'2px solid #6366f1',
                          background:'#eef1ff', height:50 }} />
                      <Button type="primary" loading={mfaLoading} onClick={confirmEnableMfa}
                        disabled={mfaCode.length !== 6} size="large"
                        style={{ borderRadius:10, fontWeight:700, height:50, paddingInline:22,
                          background:'linear-gradient(135deg,#059669,#06b6d4)', border:'none' }}>
                        Verify &amp; Enable 2FA
                      </Button>
                      <Button onClick={() => { setMfaSetup(null); setMfaCode(''); }}
                        style={{ borderRadius:10, height:50 }}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </FormSection>
          )}
        </Form>
      </FormModal>

      {/* Reset Password Modal */}
      <FormModal open={!!pwdModal} onClose={() => setPwdModal(null)} onSubmit={handlePwdReset} confirmLoading={resetPwdMut.isPending}
        title="Reset Password" subtitle={pwdModal ? `Reset password for ${pwdModal.username}` : ''}
        icon={<LockOutlined />} color="#722ed1" okText="Reset Password" width={440}>
        <Form form={pwdForm} layout="vertical" size="small">
          <Form.Item name="newPassword" label="New Password" rules={[{required:true,min:6,message:'Minimum 6 characters'}]}>
            <Input.Password placeholder="New password"/>
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['newPassword']}
            rules={[{required:true},{validator(_,value){
              if(!value||pwdForm.getFieldValue('newPassword')===value) return Promise.resolve();
              return Promise.reject(new Error('Passwords do not match'));
            }}]}>
            <Input.Password placeholder="Confirm password"/>
          </Form.Item>
        </Form>
      </FormModal>

      {/* View Drawer */}
      <Drawer open={!!viewRecord} onClose={() => setViewRecord(null)} title={viewRecord ? `User — ${viewRecord.username}` : ''} width={420}>
        {viewRecord && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width:56,height:56,borderRadius:'50%',margin:'0 auto 10px',background:'#ff4d4f20',border:'2px solid #ff4d4f',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>
                <UserOutlined style={{ color: '#ff4d4f' }} />
              </div>
              <Tag color={roleColor[viewRecord.role]}>{viewRecord.role?.toUpperCase()}</Tag>
              <Tag color={viewRecord.status === 'active' ? 'green' : 'red'} style={{ marginLeft: 4 }}>{viewRecord.status?.toUpperCase()}</Tag>
            </div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Username"  span={2}>{viewRecord.username}</Descriptions.Item>
              <Descriptions.Item label="Full Name" span={2}>{viewRecord.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email"     span={2}>{viewRecord.email}</Descriptions.Item>
              <Descriptions.Item label="Phone"          >{viewRecord.phone}</Descriptions.Item>
              <Descriptions.Item label="Department"     >{viewRecord.department}</Descriptions.Item>
              <Descriptions.Item label="Created"        >{formatDate(viewRecord.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Login Count"    >{viewRecord.loginCount}</Descriptions.Item>
              <Descriptions.Item label="Last Login" span={2}>{formatDateTime(viewRecord.lastLogin)}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button onClick={() => { setViewRecord(null); openEdit(viewRecord); }} style={{ flex: 1 }} icon={<EditOutlined />}>Edit</Button>
              <Button onClick={() => { setViewRecord(null); openPwdModal(viewRecord); }} style={{ flex: 1 }} icon={<LockOutlined />}>Reset Pwd</Button>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontWeight: 500 }}>Account Status</span>
              <Switch checked={viewRecord.status === 'active'} checkedChildren="Active" unCheckedChildren="Inactive"
                onChange={() => { toggleMut.mutate(viewRecord.id); setViewRecord((p) => ({ ...p, status: p.status === 'active' ? 'inactive' : 'active' })); }} />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
