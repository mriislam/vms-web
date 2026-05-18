import {
  CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, ToolOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber,
  Popconfirm, Row, Select, Spin, Table, Tag, Tooltip, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useVehicleOptions, useVendorOptions } from '../hooks/useLookupOptions';
import { maintenanceService } from '../services/maintenanceService';
import { formatCurrency, formatDate, statusColor } from '../utils/helpers';

const COLS_DEF = [
  { key:'vehicleReg',  columnTitle:'Vehicle',     title:'Vehicle',     dataIndex:'vehicleReg' },
  { key:'type',        columnTitle:'Type',        title:'Type',        dataIndex:'type' },
  { key:'description', columnTitle:'Description', title:'Description', dataIndex:'description' },
  { key:'cost',        columnTitle:'Cost',        title:'Cost',        dataIndex:'cost',        render:v=>formatCurrency(v) },
  { key:'date',        columnTitle:'Date',        title:'Date',        dataIndex:'date',        render:d=>formatDate(d) },
  { key:'status',      columnTitle:'Status',      title:'Status',      dataIndex:'status',      render:s=><Tag color={statusColor(s)}>{s?.replace('_',' ').toUpperCase()}</Tag> },
  { key:'vendor',      columnTitle:'Vendor',      title:'Vendor',      dataIndex:'vendor',      defaultVisible:false },
  { key:'nextDue',     columnTitle:'Next Due',    title:'Next Due',    dataIndex:'nextDue',     defaultVisible:false, render:d=>d?formatDate(d):'—' },
  { key:'odometer',    columnTitle:'Odometer',    title:'Odometer',    dataIndex:'odometer',    defaultVisible:false, render:v=>v!=null?`${Number(v).toLocaleString()} km`:'—' },
  { key:'completedBy', columnTitle:'Completed By',title:'Completed By',dataIndex:'completedBy', defaultVisible:false, render:v=>v??'—' },
  { key:'partsUsed',   columnTitle:'Parts Used',  title:'Parts Used',  dataIndex:'partsUsed',   defaultVisible:false },
];

const STATUS_FLOW  = { pending:'in_progress', in_progress:'completed' };
const STATUS_LABEL = { pending:'Start Work', in_progress:'Mark Complete' };

export default function Maintenance() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('maintenance', maintenanceService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const vehicleOptions = useVehicleOptions();
  const vendorOptions  = useVendorOptions();

  const advanceMut = useMutation({
    mutationFn: (id) => maintenanceService.advance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); message.success('Status advanced'); },
    onError: () => message.error('Failed to advance status'),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('maintenance', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:140,
    render:(_,r)=>{
      const ns=STATUS_FLOW[r.status];
      return (
        <div style={{display:'flex',gap:2}}>
          <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
          {r.status!=='completed'&&<Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>}
          {ns&&<Tooltip title={STATUS_LABEL[r.status]}><Button type="link" size="small" icon={<CheckCircleOutlined/>} style={{color:'#52c41a'}} onClick={()=>advanceMut.mutate(r.id)}/></Tooltip>}
          {r.status!=='completed'&&<Popconfirm title="Delete?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined/>}/></Popconfirm>}
        </div>
      );
    },
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return(!q||r.vehicleReg?.toLowerCase().includes(q)||r.type?.toLowerCase().includes(q)||r.vendor?.toLowerCase().includes(q))
      &&(statusFilter==='all'||r.status===statusFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r,date:r.date?dayjs(r.date):null,nextDue:r.nextDue?dayjs(r.nextDue):null});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>{
      const payload={...v,date:v.date?.format('YYYY-MM-DD')??null,nextDue:v.nextDue?.format('YYYY-MM-DD')??null};
      save(editRecord?.id??null, payload);
    });
  }

  const pending    = data.filter(r=>r.status==='pending').length;
  const inProgress = data.filter(r=>r.status==='in_progress').length;
  const totalCost  = data.filter(r=>r.status==='completed').reduce((s,r)=>s+(r.cost||0),0);

  return (
    <div>
      <PageHeader icon={<ToolOutlined/>} color="#fa541c" title="Maintenance" subtitle="Vehicle service records and scheduled upkeep"
        stats={[{label:'Pending',value:pending,color:'#faad14'},{label:'In Progress',value:inProgress,color:'#1677ff'},{label:'Cost (Done)',value:formatCurrency(totalCost),color:'#fa541c'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Log Maintenance</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search vehicle, type, vendor…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:280}} allowClear/>
          <Select value={statusFilter} onChange={setStatus} style={{width:150}} options={[{value:'all',label:'All Status'},{value:'pending',label:'Pending'},{value:'in_progress',label:'In Progress'},{value:'completed',label:'Completed'}]}/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<ToolOutlined/>} color="#fa541c"
        title={editRecord?'Edit Maintenance Record':'Log Maintenance'}
        subtitle={editRecord?'Update the service record':'Record a new vehicle service or repair'}
        okText={editRecord?'Update':'Log Maintenance'} width={680}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Service Info" color="#fa541c">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="vehicleReg" label="Vehicle Reg No" rules={[{required:true}]}>
                <Select showSearch placeholder="Search vehicle…" options={vehicleOptions} filterOption={filterOption} />
              </Form.Item></Col>
              <Col span={12}><Form.Item name="type"       label="Service Type" rules={[{required:true}]}>
                <Select options={['oil_change','tyre','brake','ac','service','electrical','body_work','inspection'].map(t=>({value:t,label:t.replace('_',' ')}))}/>
              </Form.Item></Col>
            </Row>
            <Form.Item name="description" label="Description"><Input.TextArea rows={2}/></Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="date"     label="Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}}/></Form.Item></Col>
              <Col span={8}><Form.Item name="odometer" label="Odometer (km)"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="cost"     label="Cost (৳)" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Vendor & Parts" color="#1677ff">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="vendor" label="Vendor">
                <Select showSearch allowClear placeholder="Search vendor…" options={vendorOptions} filterOption={filterOption} />
              </Form.Item></Col>
              <Col span={12}><Form.Item name="completedBy" label="Completed By"><Input placeholder="Technician name"/></Form.Item></Col>
            </Row>
            <Form.Item name="partsUsed" label="Parts Used"><Input.TextArea rows={2} placeholder="List parts used…"/></Form.Item>
          </FormSection>
          <FormSection title="Scheduling" color="#722ed1">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="nextDue" label="Next Due Date"><DatePicker style={{width:'100%'}}/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Maintenance — ${viewRecord.vehicleReg}`:''} width={500}
        extra={viewRecord?.status!=='completed'&&<div style={{display:'flex',gap:8}}>
          <Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button>
          {STATUS_FLOW[viewRecord?.status]&&<Button size="small" type="primary" onClick={()=>{advanceMut.mutate(viewRecord.id);setViewRecord(null);}}>{STATUS_LABEL[viewRecord?.status]}</Button>}
        </div>}>
        {viewRecord&&<Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Vehicle"     >{viewRecord.vehicleReg}</Descriptions.Item>
          <Descriptions.Item label="Status"      ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.replace('_',' ').toUpperCase()}</Tag></Descriptions.Item>
          <Descriptions.Item label="Type"        >{viewRecord.type}</Descriptions.Item>
          <Descriptions.Item label="Date"        >{formatDate(viewRecord.date)}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{viewRecord.description}</Descriptions.Item>
          <Descriptions.Item label="Cost"        >{formatCurrency(viewRecord.cost)}</Descriptions.Item>
          <Descriptions.Item label="Vendor"      >{viewRecord.vendor}</Descriptions.Item>
          <Descriptions.Item label="Odometer"    >{viewRecord.odometer?.toLocaleString()} km</Descriptions.Item>
          <Descriptions.Item label="Completed By">{viewRecord.completedBy??'—'}</Descriptions.Item>
          <Descriptions.Item label="Next Due"    >{viewRecord.nextDue?formatDate(viewRecord.nextDue):'—'}</Descriptions.Item>
          <Descriptions.Item label="Parts Used" span={2}>{viewRecord.partsUsed}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  );
}
