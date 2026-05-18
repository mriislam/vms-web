import {
  DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, TeamOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { coordinatorService } from '../services/coordinatorService';
import { formatDate, statusColor } from '../utils/helpers';

const ZONES = ['Dhaka North', 'Dhaka South', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur'];

const COLUMNS_DEF = [
  { key:'name',             columnTitle:'Name',              title:'Name',              dataIndex:'name' },
  { key:'empId',            columnTitle:'Emp ID',            title:'Emp ID',            dataIndex:'empId' },
  { key:'phone',            columnTitle:'Phone',             title:'Phone',             dataIndex:'phone' },
  { key:'zone',             columnTitle:'Zone',              title:'Zone',              dataIndex:'zone', render:(z)=><Tag color="blue">{z}</Tag> },
  { key:'assignedVehicles', columnTitle:'Assigned Vehicles', title:'Vehicles',          dataIndex:'assignedVehicles' },
  { key:'status',           columnTitle:'Status',            title:'Status',            dataIndex:'status', render:(s)=><Tag color={statusColor(s)}>{s?.toUpperCase()}</Tag> },
  { key:'email',            columnTitle:'Email',             title:'Email',             dataIndex:'email',    defaultVisible:false },
  { key:'joinDate',         columnTitle:'Join Date',         title:'Join Date',         dataIndex:'joinDate', defaultVisible:false, render:(d)=>formatDate(d) },
  { key:'nid',              columnTitle:'NID',               title:'NID',               dataIndex:'nid',      defaultVisible:false },
  { key:'address',          columnTitle:'Address',           title:'Address',           dataIndex:'address',  defaultVisible:false },
];

export default function Coordinators() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('coordinators', coordinatorService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('coordinators', COLUMNS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title:'Actions', key:'actions', fixed:'right', width:110,
      render:(_,r)=>(
        <div style={{display:'flex',gap:2}}>
          <Button type="link" size="small" icon={<EyeOutlined/>}  onClick={()=>setViewRecord(r)}/>
          <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
          <Popconfirm title="Remove this coordinator?" okText="Remove" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((d)=>{
    const q=search.toLowerCase();
    return(!q||d.name?.toLowerCase().includes(q)||d.empId?.toLowerCase().includes(q)||d.zone?.toLowerCase().includes(q))
      &&(statusFilter==='all'||d.status===statusFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}

  function openEdit(record){
    setEditRecord(record);
    form.setFieldsValue({ ...record, joinDate: record.joinDate ? dayjs(record.joinDate) : null });
    setModalOpen(true);
  }

  function handleSubmit(){
    form.validateFields().then((values)=>{
      const payload={ ...values, joinDate: values.joinDate?.format('YYYY-MM-DD')??null };
      save(editRecord?.id??null, payload);
    });
  }

  const active   = data.filter((c)=>c.status==='active').length;
  const inactive = data.filter((c)=>c.status==='inactive').length;
  const zones    = [...new Set(data.map((c)=>c.zone))].length;

  return (
    <div>
      <PageHeader
        icon={<TeamOutlined/>} color="#52c41a" title="Coordinators"
        subtitle="Fleet coordinators and zone assignment management"
        stats={[
          { label:'Active',   value:active,   color:'#52c41a' },
          { label:'Inactive', value:inactive, color:'#ff4d4f' },
          { label:'Zones',    value:zones,    color:'#1677ff' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined/>} onClick={openAdd} style={{background:'#52c41a',borderColor:'#52c41a'}}>
            Add Coordinator
          </Button>
        }
      />

      <Card size="small" style={{borderRadius:12,marginBottom:12}}>
        <Row gutter={[12,12]}>
          <Col flex="1">
            <Input prefix={<SearchOutlined/>} placeholder="Search by name, emp ID or zone…" value={search} onChange={(e)=>setSearch(e.target.value)} allowClear/>
          </Col>
          <Col>
            <Select value={statusFilter} onChange={setStatus} style={{width:140}}
              options={[{value:'all',label:'All Status'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
          </Col>
        </Row>
      </Card>

      <Card size="small" style={{borderRadius:12}} extra={<ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/>}>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" rowKey="id" scroll={{x:'max-content'}} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal
        open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        title={editRecord?'Edit Coordinator':'Add Coordinator'}
        subtitle={editRecord?`Editing ${editRecord.name}`:'Enter coordinator details'}
        icon={<TeamOutlined/>} color="#52c41a" okText={editRecord?'Update':'Add'}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Personal Info" color="#52c41a">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="name"  label="Full Name"    rules={[{required:true}]}><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="empId" label="Employee ID"  rules={[{required:true}]}><Input placeholder="EMP-XXX"/></Form.Item></Col>
              <Col span={12}><Form.Item name="phone" label="Phone"        rules={[{required:true}]}><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="email" label="Email"        rules={[{required:true,type:'email'}]}><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="nid"   label="NID Number"  ><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="joinDate" label="Join Date"><DatePicker style={{width:'100%'}}/></Form.Item></Col>
              <Col span={24}><Form.Item name="address" label="Address"   ><Input/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Assignment" color="#1677ff">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="zone"             label="Zone"              rules={[{required:true}]}><Select options={ZONES.map(z=>({value:z,label:z}))}/></Form.Item></Col>
              <Col span={12}><Form.Item name="assignedVehicles" label="Assigned Vehicles"><InputNumber min={0} style={{width:'100%'}}/></Form.Item></Col>
              <Col span={12}><Form.Item name="status"           label="Status"            rules={[{required:true}]}><Select options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Coordinator — ${viewRecord.name}`:''} width={400}>
        {viewRecord&&(
          <>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:56,height:56,borderRadius:'50%',margin:'0 auto 10px',background:'#52c41a20',border:'2px solid #52c41a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                <TeamOutlined style={{color:'#52c41a'}}/>
              </div>
              <Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag>
            </div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Name"     span={2}>{viewRecord.name}</Descriptions.Item>
              <Descriptions.Item label="Emp ID"        >{viewRecord.empId}</Descriptions.Item>
              <Descriptions.Item label="Zone"          ><Tag color="blue">{viewRecord.zone}</Tag></Descriptions.Item>
              <Descriptions.Item label="Phone"         >{viewRecord.phone}</Descriptions.Item>
              <Descriptions.Item label="Email"         >{viewRecord.email}</Descriptions.Item>
              <Descriptions.Item label="NID"     span={2}>{viewRecord.nid||'—'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{viewRecord.address||'—'}</Descriptions.Item>
              <Descriptions.Item label="Join Date"     >{formatDate(viewRecord.joinDate)}</Descriptions.Item>
              <Descriptions.Item label="Vehicles"      >{viewRecord.assignedVehicles}</Descriptions.Item>
            </Descriptions>
            <div style={{marginTop:16,display:'flex',gap:8}}>
              <Button onClick={()=>{setViewRecord(null);openEdit(viewRecord);}} style={{flex:1}} icon={<EditOutlined/>}>Edit</Button>
              <Popconfirm title="Remove this coordinator?" okText="Remove" okButtonProps={{danger:true}} onConfirm={()=>{remove(viewRecord.id);setViewRecord(null);}}>
                <Button danger style={{flex:1}} icon={<DeleteOutlined/>}>Remove</Button>
              </Popconfirm>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
