import {
  DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, WalletOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useVehicleOptions, useVendorOptions } from '../hooks/useLookupOptions';
import { expenseService } from '../services/expenseService';
import { formatCurrency, formatDate } from '../utils/helpers';

const CATEGORIES = ['fuel','maintenance','insurance','parking','toll','salary','office','misc'];
const PAYMENTS   = ['cash','cheque','bank_transfer','mobile_banking'];

const COLS_DEF = [
  { key:'expenseNo',   columnTitle:'Expense No',   title:'Expense No',   dataIndex:'expenseNo' },
  { key:'category',    columnTitle:'Category',     title:'Category',     dataIndex:'category' },
  { key:'description', columnTitle:'Description',  title:'Description',  dataIndex:'description' },
  { key:'amount',      columnTitle:'Amount',       title:'Amount',       dataIndex:'amount',      render:v=>formatCurrency(v) },
  { key:'vehicleReg',  columnTitle:'Vehicle',      title:'Vehicle',      dataIndex:'vehicleReg',  render:v=>v??'—' },
  { key:'date',        columnTitle:'Date',         title:'Date',         dataIndex:'date',        render:d=>formatDate(d) },
  { key:'vendor',      columnTitle:'Vendor',       title:'Vendor',       dataIndex:'vendor',      defaultVisible:false },
  { key:'paymentMode', columnTitle:'Payment Mode', title:'Payment Mode', dataIndex:'paymentMode', defaultVisible:false },
  { key:'billNo',      columnTitle:'Bill No',      title:'Bill No',      dataIndex:'billNo',      defaultVisible:false, render:v=>v??'—' },
  { key:'tax',         columnTitle:'Tax',          title:'Tax',          dataIndex:'tax',         defaultVisible:false, render:v=>formatCurrency(v) },
  { key:'approvedBy',  columnTitle:'Approved By',  title:'Approved By',  dataIndex:'approvedBy',  defaultVisible:false },
];

export default function Expenses() {
  const [search, setSearch]         = useState('');
  const [catFilter, setCat]         = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('expenses', expenseService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const vehicleOptions = useVehicleOptions();
  const vendorOptions  = useVendorOptions();

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('expenses', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:110,
    render:(_,r)=>(
      <div style={{display:'flex',gap:2}}>
        <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
        <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
        <Popconfirm title="Delete expense?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
        </Popconfirm>
      </div>
    ),
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return(!q||r.expenseNo?.toLowerCase().includes(q)||r.description?.toLowerCase().includes(q)||r.category?.toLowerCase().includes(q))
      &&(catFilter==='all'||r.category===catFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r,date:r.date?dayjs(r.date):null});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>{
      const payload={...v,date:v.date?.format('YYYY-MM-DD')??null};
      save(editRecord?.id??null, payload);
    });
  }

  const total = data.reduce((s,r)=>s+(r.amount||0),0);
  const cats  = [...new Set(data.map(r=>r.category))].length;

  return (
    <div>
      <PageHeader icon={<WalletOutlined/>} color="#13c2c2" title="Expenses" subtitle="Fleet expenditure tracking and approvals"
        stats={[{label:'Entries',value:data.length,color:'#13c2c2'},{label:'Categories',value:cats,color:'#722ed1'},{label:'Total',value:formatCurrency(total),color:'#ff4d4f'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Expense</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search expense no, description…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:280}} allowClear/>
          <Select value={catFilter} onChange={setCat} style={{width:150}} options={[{value:'all',label:'All Categories'},...CATEGORIES.map(c=>({value:c,label:c}))]}/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<WalletOutlined/>} color="#13c2c2"
        title={editRecord?`Edit — ${editRecord.expenseNo}`:'Add New Expense'}
        subtitle={editRecord?'Update the expense record':'Log a fleet expenditure entry'}
        okText={editRecord?'Update':'Add Expense'} width={660}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Expense Details" color="#13c2c2">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="category"   label="Category" rules={[{required:true}]}><Select options={CATEGORIES.map(c=>({value:c,label:c}))}/></Form.Item></Col>
              <Col span={12}><Form.Item name="date"       label="Date"     rules={[{required:true}]}><DatePicker style={{width:'100%'}}/></Form.Item></Col>
            </Row>
            <Form.Item name="description" label="Description" rules={[{required:true}]}><Input/></Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="amount"     label="Amount (৳)"   rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="tax"        label="Tax (৳)">      <InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="vehicleReg" label="Vehicle Reg">
                <Select showSearch allowClear placeholder="Search vehicle…" options={vehicleOptions} filterOption={filterOption} />
              </Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Payment & Approval" color="#722ed1">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="vendor" label="Vendor">
                <Select showSearch allowClear placeholder="Search vendor…" options={vendorOptions} filterOption={filterOption} />
              </Form.Item></Col>
              <Col span={12}><Form.Item name="paymentMode" label="Payment Mode"> <Select options={PAYMENTS.map(p=>({value:p,label:p.replace(/_/g,' ')}))}/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="billNo"     label="Bill No">    <Input/></Form.Item></Col>
              <Col span={12}><Form.Item name="approvedBy" label="Approved By"><Input/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Expense — ${viewRecord.expenseNo}`:''} width={460}
        extra={<Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button>}>
        {viewRecord&&<Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Expense No"  >{viewRecord.expenseNo}</Descriptions.Item>
          <Descriptions.Item label="Category"    >{viewRecord.category}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{viewRecord.description}</Descriptions.Item>
          <Descriptions.Item label="Amount"      >{formatCurrency(viewRecord.amount)}</Descriptions.Item>
          <Descriptions.Item label="Tax"         >{formatCurrency(viewRecord.tax)}</Descriptions.Item>
          <Descriptions.Item label="Date"        >{formatDate(viewRecord.date)}</Descriptions.Item>
          <Descriptions.Item label="Vehicle"     >{viewRecord.vehicleReg??'—'}</Descriptions.Item>
          <Descriptions.Item label="Vendor"      >{viewRecord.vendor}</Descriptions.Item>
          <Descriptions.Item label="Payment"     >{viewRecord.paymentMode}</Descriptions.Item>
          <Descriptions.Item label="Bill No"     >{viewRecord.billNo??'—'}</Descriptions.Item>
          <Descriptions.Item label="Approved By" >{viewRecord.approvedBy}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  );
}
