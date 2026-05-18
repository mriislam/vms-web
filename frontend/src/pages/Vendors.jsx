import {
  DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, ShopOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag,
} from 'antd';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { vendorService } from '../services/vendorService';
import { formatCurrency } from '../utils/helpers';

const CATEGORIES = ['Parts','Fuel','Tyres','Insurance','Lubricant','Electrical','Body Work','Other'];
const CITIES     = ['Dhaka','Chittagong','Sylhet','Rajshahi','Narayanganj','Gazipur'];

const COLS_DEF = [
  { key:'name',        columnTitle:'Vendor Name',  title:'Vendor Name',  dataIndex:'name' },
  { key:'contact',     columnTitle:'Contact',      title:'Contact',      dataIndex:'contact' },
  { key:'phone',       columnTitle:'Phone',        title:'Phone',        dataIndex:'phone' },
  { key:'category',    columnTitle:'Category',     title:'Category',     dataIndex:'category' },
  { key:'city',        columnTitle:'City',         title:'City',         dataIndex:'city' },
  { key:'status',      columnTitle:'Status',       title:'Status',       dataIndex:'status',      render:s=><Tag color={s==='active'?'green':'red'}>{s?.toUpperCase()}</Tag> },
  { key:'email',       columnTitle:'Email',        title:'Email',        dataIndex:'email',       defaultVisible:false },
  { key:'address',     columnTitle:'Address',      title:'Address',      dataIndex:'address',     defaultVisible:false },
  { key:'taxId',       columnTitle:'Tax ID',       title:'Tax ID',       dataIndex:'taxId',       defaultVisible:false },
  { key:'bankAccount', columnTitle:'Bank Account', title:'Bank Account', dataIndex:'bankAccount', defaultVisible:false },
  { key:'creditLimit', columnTitle:'Credit Limit', title:'Credit Limit', dataIndex:'creditLimit', defaultVisible:false, render:v=>v>0?formatCurrency(v):'—' },
];

export default function Vendors() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('vendors', vendorService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('vendors', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:110,
    render:(_,r)=>(
      <div style={{display:'flex',gap:2}}>
        <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
        <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
        <Popconfirm title="Delete this vendor?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
        </Popconfirm>
      </div>
    ),
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return(!q||r.name?.toLowerCase().includes(q)||r.contact?.toLowerCase().includes(q)||r.category?.toLowerCase().includes(q))
      &&(statusFilter==='all'||r.status===statusFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>save(editRecord?.id??null, v));
  }

  const active=data.filter(r=>r.status==='active').length;
  const inactive=data.filter(r=>r.status==='inactive').length;
  const cats=[...new Set(data.map(r=>r.category))].length;

  return (
    <div>
      <PageHeader icon={<ShopOutlined/>} color="#722ed1" title="Vendors" subtitle="Supplier directory and contract management"
        stats={[{label:'Active',value:active,color:'#52c41a'},{label:'Inactive',value:inactive,color:'#ff4d4f'},{label:'Categories',value:cats,color:'#722ed1'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Vendor</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search name, contact, category…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:280}} allowClear/>
          <Select value={statusFilter} onChange={setStatus} style={{width:130}} options={[{value:'all',label:'All Status'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<ShopOutlined/>} color="#722ed1"
        title={editRecord?`Edit — ${editRecord.name}`:'Add New Vendor'}
        subtitle={editRecord?'Update vendor profile and details':'Register a new supplier or service provider'}
        okText={editRecord?'Update Vendor':'Add Vendor'} width={680}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Company Info" color="#722ed1">
            <Row gutter={16}>
              <Col span={16}><Form.Item name="name"     label="Vendor Name" rules={[{required:true}]}><Input/></Form.Item></Col>
              <Col span={8}> <Form.Item name="category" label="Category"    rules={[{required:true}]}><Select options={CATEGORIES.map(c=>({value:c,label:c}))}/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="city"    label="City">   <Select options={CITIES.map(c=>({value:c,label:c}))} allowClear/></Form.Item></Col>
              <Col span={12}><Form.Item name="address" label="Address"><Input/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="status" label="Status" rules={[{required:true}]}><Select options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Contact Details" color="#1677ff">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="contact" label="Contact Person" rules={[{required:true}]}><Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="phone"   label="Phone"          rules={[{required:true}]}><Input/></Form.Item></Col>
            </Row>
            <Form.Item name="email" label="Email"><Input type="email"/></Form.Item>
          </FormSection>
          <FormSection title="Financial" color="#fa8c16">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="taxId"       label="Tax ID / TIN"><Input/></Form.Item></Col>
              <Col span={8}><Form.Item name="bankAccount" label="Bank Account"><Input/></Form.Item></Col>
              <Col span={8}><Form.Item name="creditLimit" label="Credit Limit (৳)"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Vendor — ${viewRecord.name}`:''} width={480}
        extra={<div style={{display:'flex',gap:8}}>
          <Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button>
          <Popconfirm title="Delete vendor?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>{remove(viewRecord.id);setViewRecord(null);}}>
            <Button size="small" danger icon={<DeleteOutlined/>}>Delete</Button>
          </Popconfirm></div>}>
        {viewRecord&&<Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Name"    span={2}>{viewRecord.name}</Descriptions.Item>
          <Descriptions.Item label="Status"          ><Tag color={viewRecord.status==='active'?'green':'red'}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
          <Descriptions.Item label="Category"        >{viewRecord.category}</Descriptions.Item>
          <Descriptions.Item label="Contact"         >{viewRecord.contact}</Descriptions.Item>
          <Descriptions.Item label="Phone"           >{viewRecord.phone}</Descriptions.Item>
          <Descriptions.Item label="Email"  span={2} >{viewRecord.email}</Descriptions.Item>
          <Descriptions.Item label="City"            >{viewRecord.city}</Descriptions.Item>
          <Descriptions.Item label="Address"         >{viewRecord.address}</Descriptions.Item>
          <Descriptions.Item label="Tax ID"          >{viewRecord.taxId}</Descriptions.Item>
          <Descriptions.Item label="Bank Account"    >{viewRecord.bankAccount}</Descriptions.Item>
          <Descriptions.Item label="Credit Limit"    >{viewRecord.creditLimit>0?formatCurrency(viewRecord.creditLimit):'—'}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  );
}
