import {
  DeleteOutlined, EditOutlined, EyeOutlined, HomeOutlined, PlusOutlined, SearchOutlined,
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
import { parkingService } from '../services/parkingService';
import { formatDate } from '../utils/helpers';

const VEHICLES = ['DHK-1234','DHK-5678','CTG-0091','SYL-3322','DHK-7741'];

const COLS_DEF = [
  { key:'slotNo',      columnTitle:'Slot No',      title:'Slot No',      dataIndex:'slotNo' },
  { key:'vehicleReg',  columnTitle:'Vehicle',      title:'Vehicle',      dataIndex:'vehicleReg' },
  { key:'type',        columnTitle:'Type',         title:'Type',         dataIndex:'type' },
  { key:'zone',        columnTitle:'Zone',         title:'Zone',         dataIndex:'zone' },
  { key:'status',      columnTitle:'Status',       title:'Status',       dataIndex:'status', render:s=><Tag color={s==='available'?'green':'blue'}>{s?.toUpperCase()}</Tag> },
  { key:'monthlyFee',  columnTitle:'Monthly Fee',  title:'Monthly Fee',  dataIndex:'monthlyFee',  defaultVisible:false, render:v=>`৳${(v||0).toLocaleString()}` },
  { key:'parkedSince', columnTitle:'Parked Since', title:'Parked Since', dataIndex:'parkedSince', defaultVisible:false, render:d=>d?formatDate(d):'—' },
];

export default function Parking() {
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('parking', parkingService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('parking', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:130,
    render:(_,r)=>(
      <div style={{display:'flex',gap:2}}>
        <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
        <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
        <Popconfirm title="Remove this slot?" okText="Remove" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
        </Popconfirm>
      </div>
    ),
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return !q||r.slotNo?.toLowerCase().includes(q)||r.vehicleReg?.toLowerCase().includes(q)||r.zone?.toLowerCase().includes(q);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r,parkedSince:r.parkedSince?dayjs(r.parkedSince):null});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>{
      const vehicleReg=v.vehicleReg||null;
      const status=vehicleReg?'occupied':'available';
      const payload={...v,vehicleReg,status,parkedSince:v.parkedSince?.format('YYYY-MM-DD')??null};
      save(editRecord?.id??null, payload);
    });
  }

  const total=data.length,occupied=data.filter(r=>r.status==='occupied').length,available=data.filter(r=>r.status==='available').length;

  return (
    <div>
      <PageHeader icon={<HomeOutlined/>} color="#1890ff" title="Parking" subtitle="Vehicle parking slot allocation and management"
        stats={[{label:'Total Slots',value:total,color:'#1890ff'},{label:'Occupied',value:occupied,color:'#ff4d4f'},{label:'Available',value:available,color:'#52c41a'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Slot</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search slot, vehicle, zone…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:260}} allowClear/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<HomeOutlined/>} color="#1890ff"
        title={editRecord?`Manage Slot — ${editRecord.slotNo}`:'Add Parking Slot'}
        subtitle={editRecord?'Update slot assignment or details':'Register a new parking bay'}
        okText={editRecord?'Update':'Add Slot'} width={560}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Slot Details" color="#1890ff">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="type" label="Type" rules={[{required:true}]}><Select options={['Covered','Open','Underground'].map(t=>({value:t,label:t}))}/></Form.Item></Col>
              <Col span={8}><Form.Item name="zone" label="Zone" rules={[{required:true}]}><Select options={['Zone A','Zone B','Zone C','Zone D'].map(z=>({value:z,label:z}))}/></Form.Item></Col>
              <Col span={8}><Form.Item name="monthlyFee" label="Monthly Fee (৳)"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Assignment" color="#52c41a">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="vehicleReg" label="Assigned Vehicle"><Select options={[{value:'',label:'— None (Available) —'},...VEHICLES.map(v=>({value:v,label:v}))]} allowClear/></Form.Item></Col>
              <Col span={12}><Form.Item name="parkedSince" label="Parked Since"><DatePicker style={{width:'100%'}}/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Slot — ${viewRecord.slotNo}`:''} width={400}
        extra={<Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Manage</Button>}>
        {viewRecord&&<Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Slot No"      >{viewRecord.slotNo}</Descriptions.Item>
          <Descriptions.Item label="Status"       ><Tag color={viewRecord.status==='available'?'green':'blue'}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
          <Descriptions.Item label="Type"         >{viewRecord.type}</Descriptions.Item>
          <Descriptions.Item label="Zone"         >{viewRecord.zone}</Descriptions.Item>
          <Descriptions.Item label="Vehicle"      >{viewRecord.vehicleReg||'—'}</Descriptions.Item>
          <Descriptions.Item label="Monthly Fee"  >৳{viewRecord.monthlyFee?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Parked Since" >{viewRecord.parkedSince?formatDate(viewRecord.parkedSince):'—'}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  );
}
