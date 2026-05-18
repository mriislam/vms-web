import {
  DeleteOutlined, EditOutlined, ExperimentOutlined, EyeOutlined, PlusOutlined, SearchOutlined,
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
import { filterOption, useDriverOptions, useVehicleOptions } from '../hooks/useLookupOptions';
import { fuelService } from '../services/fuelService';
import { formatCurrency, formatDate } from '../utils/helpers';

const COLS_DEF = [
  { key:'vehicleReg',   columnTitle:'Vehicle',     title:'Vehicle',     dataIndex:'vehicleReg' },
  { key:'driverName',   columnTitle:'Driver',      title:'Driver',      dataIndex:'driverName' },
  { key:'liters',       columnTitle:'Liters',      title:'Liters',      dataIndex:'liters',        render:v=>v!=null?`${v} L`:'—' },
  { key:'pricePerLiter',columnTitle:'Price/Liter', title:'Price/Liter', dataIndex:'pricePerLiter', render:v=>formatCurrency(v) },
  { key:'total',        columnTitle:'Total',       title:'Total',       dataIndex:'total',         render:v=>formatCurrency(v) },
  { key:'station',      columnTitle:'Station',     title:'Station',     dataIndex:'station' },
  { key:'date',         columnTitle:'Date',        title:'Date',        dataIndex:'date',          render:d=>formatDate(d) },
  { key:'fuelType',     columnTitle:'Fuel Type',   title:'Fuel Type',   dataIndex:'fuelType',      defaultVisible:false, render:t=><Tag color={t==='Diesel'?'blue':t==='CNG'?'green':'orange'}>{t}</Tag> },
  { key:'odoBefore',    columnTitle:'Odo Before',  title:'Odo Before',  dataIndex:'odoBefore',     defaultVisible:false, render:v=>v!=null?`${Number(v).toLocaleString()} km`:'—' },
  { key:'odoAfter',     columnTitle:'Odo After',   title:'Odo After',   dataIndex:'odoAfter',      defaultVisible:false, render:v=>v!=null?`${Number(v).toLocaleString()} km`:'—' },
  { key:'slipNo',       columnTitle:'Slip No',     title:'Slip No',     dataIndex:'slipNo',        defaultVisible:false },
  { key:'approvedBy',   columnTitle:'Approved By', title:'Approved By', dataIndex:'approvedBy',    defaultVisible:false },
];

export default function Fuel() {
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('fuel', fuelService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const vehicleOptions = useVehicleOptions();
  const driverOptions  = useDriverOptions();

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('fuel', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:110,
    render:(_,r)=>(
      <div style={{display:'flex',gap:2}}>
        <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
        <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
        <Popconfirm title="Delete this fuel entry?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
        </Popconfirm>
      </div>
    ),
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return !q||r.vehicleReg?.toLowerCase().includes(q)||r.driverName?.toLowerCase().includes(q)||r.station?.toLowerCase().includes(q);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r,date:r.date?dayjs(r.date):null});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>{
      const total=(v.liters||0)*(v.pricePerLiter||0);
      const payload={...v,total,date:v.date?.format('YYYY-MM-DD')??null};
      save(editRecord?.id??null, payload);
    });
  }

  const totalLiters = data.reduce((s,r)=>s+(r.liters||0),0);
  const totalCost   = data.reduce((s,r)=>s+(r.total||0),0);

  return (
    <div>
      <PageHeader icon={<ExperimentOutlined/>} color="#ff4d4f" title="Fuel Records" subtitle="Track fuel consumption and costs across the fleet"
        stats={[{label:'Entries',value:data.length,color:'#ff4d4f'},{label:'Total Litres',value:`${totalLiters.toFixed(1)} L`,color:'#fa8c16'},{label:'Total Cost',value:formatCurrency(totalCost),color:'#722ed1'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Add Entry</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search vehicle, driver, station…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:280}} allowClear/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<ExperimentOutlined/>} color="#ff4d4f"
        title={editRecord?'Edit Fuel Entry':'Add Fuel Entry'}
        subtitle={editRecord?'Update the fuel record':'Log a new fuel refill record'}
        okText={editRecord?'Update':'Add Entry'} width={660}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Vehicle & Driver" color="#ff4d4f">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="vehicleReg" label="Vehicle Reg No" rules={[{required:true}]}>
                <Select showSearch placeholder="Search vehicle…" options={vehicleOptions} filterOption={filterOption} />
              </Form.Item></Col>
              <Col span={12}><Form.Item name="driverName" label="Driver Name" rules={[{required:true}]}>
                <Select showSearch placeholder="Search driver…" options={driverOptions} filterOption={filterOption} />
              </Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Fuel Details" color="#fa8c16">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="liters"        label="Liters"       rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0} step={0.5}/></Form.Item></Col>
              <Col span={8}><Form.Item name="pricePerLiter" label="Price/Liter ৳" rules={[{required:true}]}><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="fuelType" label="Fuel Type" rules={[{required:true}]}><Select options={['Diesel','Petrol','CNG'].map(f=>({value:f,label:f}))}/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="date" label="Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}}/></Form.Item></Col>
              <Col span={8}><Form.Item name="odoBefore" label="Odo Before (km)"><InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
              <Col span={8}><Form.Item name="odoAfter"  label="Odo After (km)"> <InputNumber style={{width:'100%'}} min={0}/></Form.Item></Col>
            </Row>
          </FormSection>
          <FormSection title="Station & Approval" color="#722ed1">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="station"    label="Fuel Station"><Input placeholder="Station name"/></Form.Item></Col>
              <Col span={12}><Form.Item name="approvedBy" label="Approved By"><Input/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Fuel Entry — ${viewRecord.slipNo}`:''} width={460}
        extra={<div style={{display:'flex',gap:8}}><Button size="small" icon={<EditOutlined/>} onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button></div>}>
        {viewRecord&&<Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Slip No"   >{viewRecord.slipNo}</Descriptions.Item>
          <Descriptions.Item label="Fuel Type" ><Tag color={viewRecord.fuelType==='Diesel'?'blue':'green'}>{viewRecord.fuelType}</Tag></Descriptions.Item>
          <Descriptions.Item label="Vehicle"   >{viewRecord.vehicleReg}</Descriptions.Item>
          <Descriptions.Item label="Driver"    >{viewRecord.driverName}</Descriptions.Item>
          <Descriptions.Item label="Station"   >{viewRecord.station}</Descriptions.Item>
          <Descriptions.Item label="Date"      >{formatDate(viewRecord.date)}</Descriptions.Item>
          <Descriptions.Item label="Liters"    >{viewRecord.liters} L</Descriptions.Item>
          <Descriptions.Item label="Price/L"   >{formatCurrency(viewRecord.pricePerLiter)}</Descriptions.Item>
          <Descriptions.Item label="Total"     >{formatCurrency(viewRecord.total)}</Descriptions.Item>
          <Descriptions.Item label="Approved"  >{viewRecord.approvedBy}</Descriptions.Item>
          <Descriptions.Item label="Odo Before">{viewRecord.odoBefore?.toLocaleString()} km</Descriptions.Item>
          <Descriptions.Item label="Odo After" >{viewRecord.odoAfter?.toLocaleString()} km</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  );
}
