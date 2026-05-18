import {
  DeleteOutlined, EditOutlined, EyeOutlined, LaptopOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { inventoryService } from '../services/inventoryService';
import { formatCurrency, formatDate } from '../utils/helpers';

const statusMap = { in_stock:'green', low_stock:'orange', out_of_stock:'red' };

const COLS_DEF = [
  { key:'itemCode',     columnTitle:'Item Code',     title:'Item Code',     dataIndex:'itemCode' },
  { key:'name',         columnTitle:'Name',          title:'Name',          dataIndex:'name' },
  { key:'category',     columnTitle:'Category',      title:'Category',      dataIndex:'category' },
  { key:'qty',          columnTitle:'Qty',           title:'Qty',           dataIndex:'qty',           render:(v,r)=>`${v} ${r.unit}` },
  { key:'unitPrice',    columnTitle:'Unit Price',    title:'Unit Price',    dataIndex:'unitPrice',     render:v=>formatCurrency(v) },
  { key:'status',       columnTitle:'Status',        title:'Status',        dataIndex:'status',        render:s=><Tag color={statusMap[s]}>{s?.replace(/_/g,' ').toUpperCase()}</Tag> },
  { key:'location',     columnTitle:'Location',      title:'Location',      dataIndex:'location',      defaultVisible:false },
  { key:'minQty',       columnTitle:'Min Qty',       title:'Min Qty',       dataIndex:'minQty',        defaultVisible:false },
  { key:'lastRestocked',columnTitle:'Last Restocked',title:'Last Restocked',dataIndex:'lastRestocked', defaultVisible:false, render:d=>formatDate(d) },
  { key:'supplier',     columnTitle:'Supplier',      title:'Supplier',      dataIndex:'supplier',      defaultVisible:false },
];

export default function Inventory() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('inventory', inventoryService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('inventory', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:110,
    render:(_,r)=>(
      <div style={{display:'flex',gap:2}}>
        <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
        <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
        <Popconfirm title="Delete this item?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
        </Popconfirm>
      </div>
    ),
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return(!q||r.name?.toLowerCase().includes(q)||r.itemCode?.toLowerCase().includes(q)||r.category?.toLowerCase().includes(q))
      &&(statusFilter==='all'||r.status===statusFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r,lastRestocked:r.lastRestocked?dayjs(r.lastRestocked):null});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>{
      const payload={...v,lastRestocked:v.lastRestocked?.format('YYYY-MM-DD')??null};
      save(editRecord?.id??null, payload);
    });
  }

  const inStock = data.filter(r=>r.status==='in_stock').length;
  const low     = data.filter(r=>r.status==='low_stock').length;
  const out     = data.filter(r=>r.status==='out_of_stock').length;

  return (
    <div>
      <PageHeader icon={<LaptopOutlined/>} color="#a0d911" title="Inventory" subtitle="Spare parts and consumables stock management"
        stats={[{label:'In Stock',value:inStock,color:'#52c41a'},{label:'Low Stock',value:low,color:'#fa8c16'},{label:'Out of Stock',value:out,color:'#ff4d4f'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Item</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search item name, code, category…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:300}} allowClear/>
          <Select value={statusFilter} onChange={setStatus} style={{width:160}} options={[{value:'all',label:'All Status'},{value:'in_stock',label:'In Stock'},{value:'low_stock',label:'Low Stock'},{value:'out_of_stock',label:'Out of Stock'}]}/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<LaptopOutlined/>} color="#a0d911"
        title={editRecord?`Edit — ${editRecord.name}`:'Add Inventory Item'}
        subtitle={editRecord?'Update item details and stock levels':'Register a new spare part or consumable'}
        okText={editRecord?'Update Item':'Add Item'} width={660}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Item Details" color="#a0d911">
            <Row gutter={16}>
              <Col span={16}><Form.Item name="name"     label="Item Name" rules={[{required:true}]}><Input/></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="category" label="Category" rules={[{required:true}]}>
                  <Select options={[
                    'Spare Parts','Lubricants','Tyres & Tubes','Tools & Equipment',
                    'Safety Equipment','Electrical','Fuel Supply','Office Supplies',
                    'Consumables','Other',
                  ].map((c) => ({ value: c, label: c }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="location" label="Storage Location"><Input placeholder="Shelf A1"/></Form.Item></Col>
              <Col span={12}><Form.Item name="supplier" label="Supplier"><Input/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Stock Levels" color="#1677ff">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="qty"    label="Current Qty" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="unit" label="Unit" rules={[{required:true}]}>
                  <Select options={[
                    'Piece','Set','Litre','Kg','Box','Meter','Roll','Pair','Pack','Bottle','Other',
                  ].map((u) => ({ value: u, label: u }))} />
                </Form.Item>
              </Col>
              <Col span={8}><Form.Item name="minQty" label="Min Qty (Alert)"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="unitPrice"     label="Unit Price (৳)" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="lastRestocked" label="Last Restocked"><DatePicker style={{width:'100%'}}/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Item — ${viewRecord.itemCode}`:''} width={460}
        extra={<Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button>}>
        {viewRecord&&<Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Item Code"      >{viewRecord.itemCode}</Descriptions.Item>
          <Descriptions.Item label="Status"         ><Tag color={statusMap[viewRecord.status]}>{viewRecord.status?.replace(/_/g,' ').toUpperCase()}</Tag></Descriptions.Item>
          <Descriptions.Item label="Name" span={2}  >{viewRecord.name}</Descriptions.Item>
          <Descriptions.Item label="Category"       >{viewRecord.category}</Descriptions.Item>
          <Descriptions.Item label="Unit"           >{viewRecord.unit}</Descriptions.Item>
          <Descriptions.Item label="Qty"            >{viewRecord.qty} {viewRecord.unit}</Descriptions.Item>
          <Descriptions.Item label="Min Qty"        >{viewRecord.minQty}</Descriptions.Item>
          <Descriptions.Item label="Unit Price"     >{formatCurrency(viewRecord.unitPrice)}</Descriptions.Item>
          <Descriptions.Item label="Total Value"    >{formatCurrency((viewRecord.qty||0)*(viewRecord.unitPrice||0))}</Descriptions.Item>
          <Descriptions.Item label="Location"       >{viewRecord.location}</Descriptions.Item>
          <Descriptions.Item label="Supplier"       >{viewRecord.supplier}</Descriptions.Item>
          <Descriptions.Item label="Last Restocked" >{formatDate(viewRecord.lastRestocked)}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  );
}
