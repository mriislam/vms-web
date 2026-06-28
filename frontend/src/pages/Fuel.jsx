import {
  CalculatorOutlined, DeleteOutlined, EditOutlined,
  ExperimentOutlined, EyeOutlined, PlusOutlined,
  SaveOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge, Button, Card, Col, DatePicker, Descriptions, Divider, Drawer,
  Form, Input, InputNumber, Popconfirm, Row, Select, Space, Spin,
  Table, Tag, Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useVehicleOptions, useDriverOptions } from '../hooks/useLookupOptions';
import { fuelService } from '../services/fuelService';
import apiClient from '../services/apiClient';
import { formatCurrency, formatDate } from '../utils/helpers';

const { Text } = Typography;

// Fuel type → color / icon mapping
const FUEL_META = {
  Diesel:   { color: '#1677ff', bg: '#e6f4ff', icon: '🛢️' },
  Petrol:   { color: '#f97316', bg: '#fff7ed', icon: '⛽' },
  CNG:      { color: '#10b981', bg: '#ecfdf5', icon: '🔵' },
  Octane:   { color: '#8b5cf6', bg: '#f5f3ff', icon: '🔥' },
  Electric: { color: '#06b6d4', bg: '#ecfeff', icon: '⚡' },
};
const fuelColor = (t) => FUEL_META[t]?.color ?? '#94a3b8';
const fuelBg    = (t) => FUEL_META[t]?.bg    ?? '#f8faff';
const fuelIcon  = (t) => FUEL_META[t]?.icon  ?? '⛽';

const COLS_DEF = [
  { key:'vehicleReg',    columnTitle:'Vehicle',      title:'Vehicle',      dataIndex:'vehicleReg' },
  { key:'driverName',    columnTitle:'Driver',       title:'Driver',       dataIndex:'driverName' },
  { key:'fuelType',      columnTitle:'Fuel Type',    title:'Type',         dataIndex:'fuelType',
    render: t => <Tag style={{ background:fuelBg(t), color:fuelColor(t), border:`1px solid ${fuelColor(t)}40`, borderRadius:20, fontWeight:700, padding:'1px 10px' }}>{fuelIcon(t)} {t}</Tag> },
  { key:'liters',        columnTitle:'Quantity',     title:'Quantity',     dataIndex:'liters',        render:(v,r)=>v!=null?`${v} ${r.fuelType==='CNG'?'kg':r.fuelType==='Electric'?'kWh':'L'}`:'—' },
  { key:'pricePerLiter', columnTitle:'Price/Unit',   title:'Price/Unit',   dataIndex:'pricePerLiter', render:v=>formatCurrency(v) },
  { key:'total',         columnTitle:'Total Cost',   title:'Total',        dataIndex:'total',         render:v=><span style={{ fontWeight:700, color:'#6366f1' }}>{formatCurrency(v)}</span> },
  { key:'station',       columnTitle:'Station',      title:'Station',      dataIndex:'station' },
  { key:'date',          columnTitle:'Date',         title:'Date',         dataIndex:'date',          render:d=>formatDate(d) },
  { key:'odoBefore',     columnTitle:'Odo Before',   title:'Odo Before',   dataIndex:'odoBefore',     defaultVisible:false, render:v=>v!=null?`${Number(v).toLocaleString()} km`:'—' },
  { key:'odoAfter',      columnTitle:'Odo After',    title:'Odo After',    dataIndex:'odoAfter',      defaultVisible:false, render:v=>v!=null?`${Number(v).toLocaleString()} km`:'—' },
  { key:'slipNo',        columnTitle:'Slip No',      title:'Slip No',      dataIndex:'slipNo',        defaultVisible:false },
  { key:'approvedBy',    columnTitle:'Approved By',  title:'Approved By',  dataIndex:'approvedBy',    defaultVisible:false },
];

const ALL_FUEL_TYPES = ['Diesel','Petrol','CNG','Octane','Electric'];

// ── Fuel Price Card ────────────────────────────────────────────────────────────
function FuelPriceCard({ price, onEdit }) {
  const m = FUEL_META[price.fuelType] ?? { color:'#94a3b8', bg:'#f8faff', icon:'⛽' };
  return (
    <Card
      size="small"
      style={{
        borderRadius:14, border:`1.5px solid ${m.color}25`,
        background:`linear-gradient(135deg,${m.bg},#fff)`,
        boxShadow:`0 4px 16px ${m.color}12`, height:'100%',
      }}
      styles={{ body:{ padding:'14px 16px' } }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ fontSize:28, lineHeight:1 }}>{m.icon}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:m.color }}>{price.fuelType}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>
              per {price.unit ?? 'Liter'}
            </div>
          </div>
        </div>
        <Tooltip title="Edit price">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(price)}
            style={{ color:m.color, borderRadius:8 }} />
        </Tooltip>
      </div>
      <div style={{ marginTop:12 }}>
        <div style={{ fontSize:26, fontWeight:900, color:m.color, lineHeight:1, letterSpacing:'-0.02em' }}>
          ৳ {Number(price.pricePerUnit).toLocaleString('en-BD', { minimumFractionDigits:2 })}
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
          Updated {price.updatedBy ? `by ${price.updatedBy}` : ''} · {price.effectiveDate ?? '—'}
        </div>
        {price.notes && (
          <div style={{ marginTop:6, fontSize:11, color:'#64748b', background:'rgba(0,0,0,0.04)',
            padding:'4px 8px', borderRadius:6 }}>{price.notes}</div>
        )}
      </div>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Fuel() {
  const qc = useQueryClient();

  // Fuel price state
  const [priceModal, setPriceModal] = useState(false);
  const [editPrice,  setEditPrice]  = useState(null);
  const [priceForm]  = Form.useForm();

  // Calculator state
  const [calcOpen,  setCalcOpen]  = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [calcForm]  = Form.useForm();
  const [calculating, setCalculating] = useState(false);

  // Fuel records
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();

  // Fetch fuel prices
  const { data: prices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['fuel-prices'],
    queryFn: () => apiClient.get('/fuel-prices').then(r => r.data?.data ?? []),
    staleTime: 30_000,
  });

  const savePriceMut = useMutation({
    mutationFn: (body) => editPrice?.id
      ? apiClient.put(`/fuel-prices/${editPrice.id}`, body)
      : apiClient.post('/fuel-prices', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel-prices'] });
      setPriceModal(false);
      message.success('Fuel price updated');
    },
    onError: () => message.error('Failed to update fuel price'),
  });

  const vehicleOptions = useVehicleOptions();
  const driverOptions  = useDriverOptions();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('fuel', fuelService, {
    onSaveSuccess: () => setModalOpen(false),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } =
    useColumnPicker('fuel', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:110,
    render:(_,r) => (
      <div style={{ display:'flex', gap:2 }}>
        <Button type="link" size="small" icon={<EyeOutlined/>}  onClick={()=>setViewRecord(r)}/>
        <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
        <Popconfirm title="Delete this fuel entry?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
        </Popconfirm>
      </div>
    ),
  }];

  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    return !q || r.vehicleReg?.toLowerCase().includes(q) ||
      r.driverName?.toLowerCase().includes(q) || r.station?.toLowerCase().includes(q);
  });

  function openPriceEdit(p) {
    setEditPrice(p ?? null);
    priceForm.setFieldsValue(p ?? { unit:'Liter', effectiveDate: dayjs().format('YYYY-MM-DD') });
    setPriceModal(true);
  }

  function openAdd()  { setEditRecord(null); form.resetFields(); setModalOpen(true); }
  function openEdit(r){ setEditRecord(r); form.setFieldsValue({...r, date:r.date?dayjs(r.date):null}); setModalOpen(true); }

  function handleSubmit() {
    form.validateFields().then(v => {
      const total = (v.liters||0) * (v.pricePerLiter||0);
      save(editRecord?.id ?? null, { ...v, total, date:v.date?.format('YYYY-MM-DD')??null });
    });
  }

  async function runCalculator() {
    const vals = await calcForm.validateFields();
    setCalculating(true);
    try {
      const res = await apiClient.get(`/fuel-prices/calculate?vehicleReg=${vals.vehicleReg}&distanceKm=${vals.distanceKm}`);
      setCalcResult(res.data?.data);
    } catch { message.error('Calculation failed'); }
    finally { setCalculating(false); }
  }

  // Auto-fill price from fuel price table when fuel type changes in form
  function onFuelTypeChange(ft) {
    const p = prices.find(x => x.fuelType === ft);
    if (p) form.setFieldValue('pricePerLiter', Number(p.pricePerUnit));
  }

  const totalLiters = data.reduce((s,r)=>s+(r.liters||0), 0);
  const totalCost   = data.reduce((s,r)=>s+(r.total||0), 0);

  return (
    <div>
      <PageHeader
        icon={<ExperimentOutlined/>} color="#f43f5e" title="Fuel Management"
        subtitle="Set fuel prices, track consumption and calculate costs"
        stats={[
          { label:'Records',    value:data.length,                        color:'#f43f5e' },
          { label:'Total',      value:`${totalLiters.toFixed(1)} L`,      color:'#f97316' },
          { label:'Total Cost', value:formatCurrency(totalCost),          color:'#8b5cf6' },
        ]}
        actions={
          <Space>
            <Button icon={<CalculatorOutlined/>} onClick={()=>{setCalcResult(null);calcForm.resetFields();setCalcOpen(true)}}
              style={{ borderRadius:10, fontWeight:600 }}>
              Cost Calculator
            </Button>
            <Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}
              style={{ borderRadius:10, fontWeight:700 }}>
              Add Record
            </Button>
          </Space>
        }
      />

      {/* ── Fuel Price Settings ──────────────────────────────────────────── */}
      <Card
        title={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:4, height:18, borderRadius:3, background:'linear-gradient(#6366f1,#8b5cf6)' }} />
            <span style={{ fontWeight:800, fontSize:13 }}>Fuel Price Settings</span>
            <Tag color="processing" style={{ borderRadius:20, fontWeight:700, marginLeft:4 }}>Live Rates</Tag>
          </div>
        }
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined/>}
            onClick={()=>openPriceEdit(null)}
            style={{ borderRadius:8, fontWeight:700, color:'#fff' }}>
            Add Fuel Type
          </Button>
        }
        style={{ marginBottom:16, borderRadius:14 }}
        styles={{ body:{ paddingTop:16 } }}
      >
        <Spin spinning={pricesLoading}>
          <Row gutter={[12,12]}>
            {prices.map(p => (
              <Col key={p.id} xs={12} sm={8} md={6} lg={4}>
                <FuelPriceCard price={p} onEdit={openPriceEdit} />
              </Col>
            ))}
            {prices.length === 0 && !pricesLoading && (
              <Col span={24}>
                <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>
                  No fuel prices set. Click "Add Fuel Type" to get started.
                </div>
              </Col>
            )}
          </Row>
        </Spin>
        {prices.length > 0 && (
          <div style={{ marginTop:12, fontSize:11, color:'#94a3b8', textAlign:'right' }}>
            💡 Prices are auto-filled when logging a fuel record. Update regularly to keep costs accurate.
          </div>
        )}
      </Card>

      {/* ── Fuel Records Table ────────────────────────────────────────────── */}
      <Card size="small" style={{ borderRadius:14 }}>
        <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
          <Input placeholder="Search vehicle, driver, station…" prefix={<SearchOutlined/>}
            value={search} onChange={e=>setSearch(e.target.value)} style={{ width:280, borderRadius:10 }} allowClear/>
          <div style={{ marginLeft:'auto' }}>
            <ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/>
          </div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small"
            scroll={{ x:'max-content' }} rowKey="id"
            pagination={{ pageSize:10, showSizeChanger:true,
              showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}`, pageSizeOptions:['10','25','50','100'] }}/>
        </Spin>
      </Card>

      {/* ── Fuel Price Modal ─────────────────────────────────────────────── */}
      <FormModal open={priceModal} onClose={()=>setPriceModal(false)}
        onSubmit={() => priceForm.validateFields().then(v => savePriceMut.mutate(v))}
        confirmLoading={savePriceMut.isPending}
        icon={<ExperimentOutlined/>} color="#6366f1"
        title={editPrice ? `Edit — ${editPrice.fuelType} Price` : 'Add Fuel Type & Price'}
        subtitle="Set the current market rate for this fuel type"
        okText="Save Price" width={480}>
        <Form form={priceForm} layout="vertical" size="middle">
          <FormSection title="Fuel Type" color="#6366f1">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="fuelType" label="Fuel Type" rules={[{required:true}]}>
                  <Select options={ALL_FUEL_TYPES.map(f=>({ value:f, label:`${fuelIcon(f)} ${f}` }))}
                    placeholder="Select fuel type" disabled={!!editPrice} style={{ borderRadius:10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="unit" label="Unit" rules={[{required:true}]}>
                  <Select options={[{value:'Liter',label:'Liter'},{value:'kg',label:'kg (CNG)'},{value:'kWh',label:'kWh (Electric)'}]}
                    style={{ borderRadius:10 }} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
          <FormSection title="Pricing" color="#f97316">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="pricePerUnit" label="Price per Unit (৳)" rules={[{required:true}]}>
                  <InputNumber style={{ width:'100%', height:40, fontSize:16, fontWeight:700 }}
                    min={0} precision={2} prefix="৳" placeholder="0.00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="effectiveDate" label="Effective Date" rules={[{required:true}]}>
                  <Input type="date" style={{ borderRadius:10, height:40 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Notes (optional)">
              <Input placeholder="e.g. BPC official rate, revised after budget" style={{ borderRadius:10 }} />
            </Form.Item>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── Fuel Record CRUD Modal ──────────────────────────────────────── */}
      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit}
        confirmLoading={isSaving} icon={<ExperimentOutlined/>} color="#f43f5e"
        title={editRecord?'Edit Fuel Record':'Log Fuel Refill'}
        subtitle={editRecord?'Update this fuel entry':'Record a new fuel fill-up'}
        okText={editRecord?'Update':'Save Record'} width={660}>
        <Form form={form} layout="vertical" size="middle">
          <FormSection title="Vehicle & Driver" color="#f43f5e">
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item name="vehicleReg" label="Vehicle" rules={[{required:true}]}>
                  <Select showSearch placeholder="Select vehicle…" options={vehicleOptions}
                    filterOption={filterOption} style={{ borderRadius:10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="driverName" label="Driver" rules={[{required:true}]}>
                  <Select showSearch placeholder="Select driver…" options={driverOptions}
                    filterOption={filterOption} style={{ borderRadius:10 }} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
          <FormSection title="Fuel Details" color="#f97316">
            <Row gutter={14}>
              <Col span={8}>
                <Form.Item name="fuelType" label="Fuel Type" rules={[{required:true}]}>
                  <Select placeholder="Select type…" onChange={onFuelTypeChange}
                    style={{ borderRadius:10 }}
                    options={ALL_FUEL_TYPES.map(f=>({
                      value:f,
                      label:<span>{fuelIcon(f)} {f}</span>
                    }))} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="liters" label="Quantity (L / kg / kWh)" rules={[{required:true}]}>
                  <InputNumber style={{ width:'100%' }} min={0} step={0.5} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="pricePerLiter" label="Price per Unit (৳)" rules={[{required:true}]}>
                  <InputNumber style={{ width:'100%' }} min={0} precision={2}
                    placeholder="Auto-fills from price table" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={14}>
              <Col span={8}>
                <Form.Item name="date" label="Date" rules={[{required:true}]}>
                  <DatePicker style={{ width:'100%', borderRadius:10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="odoBefore" label="Odo Before (km)">
                  <InputNumber style={{ width:'100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="odoAfter" label="Odo After (km)">
                  <InputNumber style={{ width:'100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
          <FormSection title="Station & Approval" color="#8b5cf6">
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item name="station" label="Fuel Station">
                  <Input placeholder="Station name" style={{ borderRadius:10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="approvedBy" label="Approved By">
                  <Input style={{ borderRadius:10 }} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      {/* ── Cost Calculator Drawer ──────────────────────────────────────── */}
      <Drawer open={calcOpen} onClose={()=>setCalcOpen(false)}
        title={<><CalculatorOutlined style={{ color:'#6366f1', marginRight:8 }}/>Fuel Cost Calculator</>}
        width={440}>
        <Form form={calcForm} layout="vertical" style={{ marginTop:8 }}>
          <Form.Item name="vehicleReg" label="Vehicle" rules={[{required:true,message:'Select a vehicle'}]}>
            <Select showSearch placeholder="Select vehicle…" options={vehicleOptions} filterOption={filterOption}
              style={{ borderRadius:10 }} />
          </Form.Item>
          <Form.Item name="distanceKm" label="Distance (km)" rules={[{required:true,message:'Enter distance'}]}>
            <InputNumber style={{ width:'100%', borderRadius:10, height:42, fontSize:16 }}
              min={1} max={10000} placeholder="e.g. 175" />
          </Form.Item>
          <Button type="primary" block loading={calculating} onClick={runCalculator}
            icon={<CalculatorOutlined/>}
            style={{ height:44, borderRadius:12, fontWeight:700, marginBottom:20,
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none',
              boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}>
            Calculate Cost
          </Button>
        </Form>

        {calcResult && (
          <div>
            <Divider>Calculation Result</Divider>
            <div style={{ background:'#f8faff', borderRadius:12, padding:16,
              border:'1px solid rgba(99,102,241,0.15)', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <Text style={{ color:'#64748b', fontSize:12 }}>Vehicle</Text>
                <Text strong style={{ fontSize:13 }}>{calcResult.vehicleReg}</Text>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <Text style={{ color:'#64748b', fontSize:12 }}>Distance</Text>
                <Text strong>{calcResult.distanceKm} km</Text>
              </div>
              {calcResult.isHybrid && (
                <Tag color="processing" style={{ marginBottom:10, borderRadius:20 }}>🔋 Hybrid Vehicle</Tag>
              )}
            </div>

            {(calcResult.breakdown ?? []).map((b, i) => (
              <div key={i} style={{ marginBottom:10, padding:14, borderRadius:12,
                background: fuelBg(b.fuelType),
                border:`1.5px solid ${fuelColor(b.fuelType)}25` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:20 }}>{fuelIcon(b.fuelType)}</span>
                    <div>
                      <div style={{ fontWeight:800, color:fuelColor(b.fuelType), fontSize:13 }}>{b.fuelType}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{b.ratePerKm} · ৳{b.pricePerUnit}/{b.unit}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:900, fontSize:18, color:fuelColor(b.fuelType) }}>
                      ৳ {Number(b.estimatedCost).toLocaleString('en-BD', { minimumFractionDigits:2 })}
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{b.unitsUsed} {b.unit} used</div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))',
              border:'2px solid rgba(99,102,241,0.2)', borderRadius:14, padding:'16px 18px',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#6366f1' }}>
                Total Estimated Cost
              </Text>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:900, fontSize:24, color:'#6366f1', lineHeight:1 }}>
                  ৳ {Number(calcResult.totalEstimatedCost).toLocaleString('en-BD', { minimumFractionDigits:2 })}
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>BDT</div>
              </div>
            </div>
            <div style={{ marginTop:10, fontSize:11, color:'#94a3b8', textAlign:'center' }}>
              Based on current fuel prices and vehicle consumption rate. Actual cost may vary.
            </div>
          </div>
        )}
      </Drawer>

      {/* ── View Drawer ─────────────────────────────────────────────────── */}
      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)}
        title={viewRecord?`Fuel Record — ${viewRecord.slipNo??'N/A'}`:''} width={460}
        extra={<Button size="small" icon={<EditOutlined/>}
          onClick={()=>{setViewRecord(null);openEdit(viewRecord);}}>Edit</Button>}>
        {viewRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Slip No"    >{viewRecord.slipNo}</Descriptions.Item>
            <Descriptions.Item label="Fuel Type"  >
              <Tag style={{ background:fuelBg(viewRecord.fuelType), color:fuelColor(viewRecord.fuelType),
                border:`1px solid ${fuelColor(viewRecord.fuelType)}40`, borderRadius:20, fontWeight:700 }}>
                {fuelIcon(viewRecord.fuelType)} {viewRecord.fuelType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Vehicle"    >{viewRecord.vehicleReg}</Descriptions.Item>
            <Descriptions.Item label="Driver"     >{viewRecord.driverName}</Descriptions.Item>
            <Descriptions.Item label="Quantity"   >{viewRecord.liters} L</Descriptions.Item>
            <Descriptions.Item label="Price/Unit" >{formatCurrency(viewRecord.pricePerLiter)}</Descriptions.Item>
            <Descriptions.Item label="Total"      span={2}>
              <span style={{ fontWeight:800, fontSize:16, color:'#6366f1' }}>{formatCurrency(viewRecord.total)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Date"       >{formatDate(viewRecord.date)}</Descriptions.Item>
            <Descriptions.Item label="Station"    >{viewRecord.station??'—'}</Descriptions.Item>
            <Descriptions.Item label="Odo Before" >{viewRecord.odoBefore?`${viewRecord.odoBefore} km`:'—'}</Descriptions.Item>
            <Descriptions.Item label="Odo After"  >{viewRecord.odoAfter?`${viewRecord.odoAfter} km`:'—'}</Descriptions.Item>
            {viewRecord.approvedBy && (
              <Descriptions.Item label="Approved By" span={2}>{viewRecord.approvedBy}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
