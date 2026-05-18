import {
  DeleteOutlined, EditOutlined, EyeOutlined, GlobalOutlined, PlusOutlined, SearchOutlined,
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
import { routeService } from '../services/routeService';

const COLUMNS_DEF = [
  { key:'routeCode',        columnTitle:'Route Code',        title:'Route Code',        dataIndex:'routeCode' },
  { key:'name',             columnTitle:'Name',              title:'Name',              dataIndex:'name' },
  { key:'distance',         columnTitle:'Distance',          title:'Distance',          dataIndex:'distance',         render:(v)=>`${v} km` },
  { key:'estimatedTime',    columnTitle:'Est. Time',         title:'Est. Time',         dataIndex:'estimatedTime' },
  { key:'stops',            columnTitle:'Stops',             title:'Stops',             dataIndex:'stops' },
  { key:'status',           columnTitle:'Status',            title:'Status',            dataIndex:'status',           render:(s)=><Tag color={s==='active'?'green':'red'}>{s?.toUpperCase()}</Tag> },
  { key:'highway',          columnTitle:'Highway',           title:'Highway',           dataIndex:'highway',          defaultVisible:false },
  { key:'tollCost',         columnTitle:'Toll Cost',         title:'Toll Cost',         dataIndex:'tollCost',         defaultVisible:false, render:(v)=>`৳${v}` },
  { key:'assignedVehicles', columnTitle:'Assigned Vehicles', title:'Assigned Vehicles', dataIndex:'assignedVehicles', defaultVisible:false },
  { key:'lastUsed',         columnTitle:'Last Used',         title:'Last Used',         dataIndex:'lastUsed',         defaultVisible:false },
];

export default function Routes() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('routes', routeService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('routes', COLUMNS_DEF);

  const columns = [
    ...visibleColumns,
    {
      title:'Actions', key:'actions', fixed:'right', width:110,
      render:(_,r)=>(
        <div style={{display:'flex',gap:2}}>
          <Button type="link" size="small" icon={<EyeOutlined/>}  onClick={()=>setViewRecord(r)}/>
          <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
          <Popconfirm title="Delete this route?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filtered = data.filter((r)=>{
    const q=search.toLowerCase();
    return(!q||r.name?.toLowerCase().includes(q)||r.routeCode?.toLowerCase().includes(q)||r.highway?.toLowerCase().includes(q))
      &&(statusFilter==='all'||r.status===statusFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(record){setEditRecord(record);form.setFieldsValue({...record});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then((values)=>save(editRecord?.id??null, values));
  }

  const active   = data.filter((r)=>r.status==='active').length;
  const inactive = data.filter((r)=>r.status==='inactive').length;
  const totalKm  = data.reduce((s,r)=>s+(r.distance||0),0);

  return (
    <div>
      <PageHeader
        icon={<GlobalOutlined/>} color="#722ed1" title="Routes"
        subtitle="Fleet route registry and travel path management"
        stats={[
          { label:'Active',   value:active,          color:'#52c41a' },
          { label:'Inactive', value:inactive,         color:'#ff4d4f' },
          { label:'Total KM', value:`${totalKm} km`, color:'#722ed1' },
        ]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Route</Button>}
      />

      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search name, code or highway…" prefix={<SearchOutlined/>} value={search} onChange={(e)=>setSearch(e.target.value)} style={{width:280}} allowClear/>
          <Select value={statusFilter} onChange={setStatus} style={{width:130}} options={[{value:'all',label:'All Status'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal
        open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<GlobalOutlined/>} color="#722ed1"
        title={editRecord?`Edit Route — ${editRecord.routeCode}`:'Add New Route'}
        subtitle={editRecord?'Update the route information below':'Define a new fleet travel route'}
        okText={editRecord?'Update Route':'Add Route'} width={620}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Route Identity" color="#722ed1">
            <Form.Item name="name" label="Route Name" rules={[{required:true}]}>
              <Input placeholder="e.g. Dhaka - Chittagong"/>
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="highway" label="Highway / Road"><Input/></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="status" label="Status" rules={[{required:true}]}>
                  <Select options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
          <FormSection title="Journey Metrics" color="#1677ff">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="distance"      label="Distance (km)" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="estimatedTime" label="Est. Travel Time"><Input placeholder="5h"/></Form.Item></Col>
              <Col span={8}><Form.Item name="stops"         label="No. of Stops"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="tollCost" label="Toll Cost (৳)"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Additional Notes" color="#13c2c2">
            <Form.Item name="notes" label="Route Notes / Remarks" style={{marginBottom:4}}>
              <Input.TextArea rows={2} placeholder="Any special instructions, diversions, or hazards…"/>
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer
        open={!!viewRecord} onClose={()=>setViewRecord(null)}
        title={viewRecord?`Route — ${viewRecord.routeCode}`:''} width={460}
        extra={
          <div style={{display:'flex',gap:8}}>
            <Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button>
            <Popconfirm title="Delete this route?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>{remove(viewRecord.id);setViewRecord(null);}}>
              <Button size="small" danger icon={<DeleteOutlined/>}>Delete</Button>
            </Popconfirm>
          </div>
        }
      >
        {viewRecord&&(
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Route Code"        >{viewRecord.routeCode}</Descriptions.Item>
            <Descriptions.Item label="Status"            ><Tag color={viewRecord.status==='active'?'green':'red'}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Name"      span={2} >{viewRecord.name}</Descriptions.Item>
            <Descriptions.Item label="Distance"          >{viewRecord.distance} km</Descriptions.Item>
            <Descriptions.Item label="Est. Time"         >{viewRecord.estimatedTime}</Descriptions.Item>
            <Descriptions.Item label="Stops"             >{viewRecord.stops}</Descriptions.Item>
            <Descriptions.Item label="Highway"           >{viewRecord.highway}</Descriptions.Item>
            <Descriptions.Item label="Toll Cost"         >৳{viewRecord.tollCost}</Descriptions.Item>
            <Descriptions.Item label="Assigned Vehicles" >{viewRecord.assignedVehicles}</Descriptions.Item>
            <Descriptions.Item label="Last Used"         >{viewRecord.lastUsed??'—'}</Descriptions.Item>
            {viewRecord.notes&&<Descriptions.Item label="Notes" span={2}>{viewRecord.notes}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
