import {
  CalendarOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input,
  Popconfirm, Progress, Row, Select, Spin, Statistic, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import ColumnPicker from '../components/ColumnPicker';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { useApiCrud } from '../hooks/useApiCrud';
import { useColumnPicker } from '../hooks/useColumnPicker';
import { filterOption, useDriverOptions } from '../hooks/useLookupOptions';
import { driverLeaveService } from '../services/driverLeaveService';
import { formatDate, statusColor } from '../utils/helpers';

const { Text } = Typography;

const LEAVE_QUOTA  = { Annual: 14, Sick: 10, Casual: 7 };
const LEAVE_COLORS = { Annual: '#1677ff', Sick: '#ff4d4f', Casual: '#52c41a' };

const COLS_DEF = [
  { key:'driverName', columnTitle:'Driver',      title:'Driver',      dataIndex:'driverName' },
  { key:'leaveType',  columnTitle:'Leave Type',  title:'Leave Type',  dataIndex:'leaveType' },
  { key:'fromDate',   columnTitle:'From',        title:'From',        dataIndex:'fromDate',    render:d=>formatDate(d) },
  { key:'toDate',     columnTitle:'To',          title:'To',          dataIndex:'toDate',      render:d=>formatDate(d) },
  { key:'days',       columnTitle:'Days',        title:'Days',        dataIndex:'days' },
  { key:'status',     columnTitle:'Status',      title:'Status',      dataIndex:'status',      render:s=><Tag color={statusColor(s)}>{s?.toUpperCase()}</Tag> },
  { key:'reason',     columnTitle:'Reason',      title:'Reason',      dataIndex:'reason',      defaultVisible:false },
  { key:'appliedOn',  columnTitle:'Applied On',  title:'Applied On',  dataIndex:'appliedOn',   defaultVisible:false, render:d=>formatDate(d) },
  { key:'approvedBy', columnTitle:'Approved By', title:'Approved By', dataIndex:'approvedBy',  defaultVisible:false, render:v=>v??'—' },
  { key:'replacedBy', columnTitle:'Replaced By', title:'Replaced By', dataIndex:'replacedBy',  defaultVisible:false, render:v=>v??'—' },
];

export default function DriverLeave() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, save, remove, isSaving } = useApiCrud('driver-leave', driverLeaveService, {
    onSaveSuccess: () => setModalOpen(false),
  });
  const driverOptions = useDriverOptions();

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => driverLeaveService.setStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-leave'] }); message.success('Status updated'); },
    onError: () => message.error('Failed to update status'),
  });

  const { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns } = useColumnPicker('driver-leave', COLS_DEF);

  const columns = [...visibleColumns, {
    title:'Actions', key:'actions', fixed:'right', width:150,
    render:(_,r)=>(
      <div style={{display:'flex',gap:2}}>
        <Button type="link" size="small" icon={<EyeOutlined/>} onClick={()=>setViewRecord(r)}/>
        {r.status==='pending'&&<>
          <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openEdit(r)}/>
          <Tooltip title="Approve"><Button type="link" size="small" icon={<CheckOutlined/>} style={{color:'#52c41a'}} onClick={()=>statusMut.mutate({id:r.id,status:'approved'})}/></Tooltip>
          <Tooltip title="Reject"> <Button type="link" size="small" icon={<CloseOutlined/>}  danger onClick={()=>statusMut.mutate({id:r.id,status:'rejected'})}/></Tooltip>
          <Popconfirm title="Delete?" okText="Delete" okButtonProps={{danger:true}} onConfirm={()=>remove(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined/>}/>
          </Popconfirm>
        </>}
      </div>
    ),
  }];

  const filtered = data.filter(r=>{
    const q=search.toLowerCase();
    return(!q||r.driverName?.toLowerCase().includes(q)||r.leaveType?.toLowerCase().includes(q))
      &&(statusFilter==='all'||r.status===statusFilter);
  });

  function openAdd(){setEditRecord(null);form.resetFields();setModalOpen(true);}
  function openEdit(r){setEditRecord(r);form.setFieldsValue({...r,fromDate:r.fromDate?dayjs(r.fromDate):null,toDate:r.toDate?dayjs(r.toDate):null,appliedOn:r.appliedOn?dayjs(r.appliedOn):null});setModalOpen(true);}

  function handleSubmit(){
    form.validateFields().then(v=>{
      const fromDate=v.fromDate?.format('YYYY-MM-DD')??null;
      const toDate=v.toDate?.format('YYYY-MM-DD')??null;
      const days=fromDate&&toDate?dayjs(toDate).diff(dayjs(fromDate),'day')+1:v.days??1;
      const payload={...v,fromDate,toDate,days,appliedOn:v.appliedOn?.format('YYYY-MM-DD')??dayjs().format('YYYY-MM-DD')};
      save(editRecord?.id??null, payload);
    });
  }

  const pending=data.filter(r=>r.status==='pending').length;
  const approved=data.filter(r=>r.status==='approved').length;
  const rejected=data.filter(r=>r.status==='rejected').length;

  return (
    <div>
      <PageHeader icon={<CalendarOutlined/>} color="#eb2f96" title="Driver Leave" subtitle="Driver absence requests and approval management"
        stats={[{label:'Pending',value:pending,color:'#faad14'},{label:'Approved',value:approved,color:'#52c41a'},{label:'Rejected',value:rejected,color:'#ff4d4f'}]}
        actions={<Button type="primary" icon={<PlusOutlined/>} onClick={openAdd}>Apply Leave</Button>}
      />
      <Card size="small" style={{borderRadius:12}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <Input placeholder="Search driver or leave type…" prefix={<SearchOutlined/>} value={search} onChange={e=>setSearch(e.target.value)} style={{width:260}} allowClear/>
          <Select value={statusFilter} onChange={setStatus} style={{width:130}} options={[{value:'all',label:'All Status'},{value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'}]}/>
          <div style={{marginLeft:'auto'}}><ColumnPicker allColumns={allColumns} visibleKeys={visibleKeys} onChange={setVisible} onReset={resetToDefault}/></div>
        </div>
        <Spin spinning={isLoading}>
          <Table dataSource={filtered} columns={columns} size="small" scroll={{x:'max-content'}} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`, pageSizeOptions: ['10', '25', '50', '100'] }}/>
        </Spin>
      </Card>

      <FormModal open={modalOpen} onClose={()=>setModalOpen(false)} onSubmit={handleSubmit} confirmLoading={isSaving}
        icon={<CalendarOutlined/>} color="#eb2f96"
        title={editRecord?'Edit Leave Request':'Apply for Leave'}
        subtitle={editRecord?'Update leave application details':'Submit a driver leave request'}
        okText={editRecord?'Update':'Submit Application'} width={620}>
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Leave Details" color="#eb2f96">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="driverName" label="Driver" rules={[{required:true}]}>
                <Select showSearch placeholder="Search driver…" options={driverOptions} filterOption={filterOption} />
              </Form.Item></Col>
              <Col span={12}><Form.Item name="leaveType"  label="Leave Type" rules={[{required:true}]}><Select options={['Annual','Sick','Casual'].map(t=>({value:t,label:t}))}/></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="fromDate" label="From Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}}/></Form.Item></Col>
              <Col span={12}><Form.Item name="toDate"   label="To Date"   rules={[{required:true}]}><DatePicker style={{width:'100%'}}/></Form.Item></Col>
            </Row>
            <Form.Item name="reason" label="Reason" rules={[{required:true}]}><Input.TextArea rows={2}/></Form.Item>
          </FormSection>
          <FormSection title="Coverage" color="#1677ff">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="replacedBy"  label="Replaced By"><Input placeholder="Replacement driver"/></Form.Item></Col>
              <Col span={12}><Form.Item name="appliedOn"   label="Applied On"> <DatePicker style={{width:'100%'}}/></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </FormModal>

      <Drawer open={!!viewRecord} onClose={()=>setViewRecord(null)} title={viewRecord?`Leave — ${viewRecord.driverName}`:''} width={480}
        extra={viewRecord?.status==='pending'&&<div style={{display:'flex',gap:8}}>
          <Button size="small" type="primary" icon={<CheckOutlined/>} onClick={()=>{statusMut.mutate({id:viewRecord.id,status:'approved'});setViewRecord(null);}}>Approve</Button>
          <Button size="small" danger icon={<CloseOutlined/>} onClick={()=>{statusMut.mutate({id:viewRecord.id,status:'rejected'});setViewRecord(null);}}>Reject</Button>
        </div>}>
        {viewRecord&&(()=>{
          const balance = {};
          return (
            <>
              <div style={{background:'linear-gradient(135deg,#eb2f9610 0%,#1677ff08 100%)',border:'1px solid #eb2f9625',borderRadius:12,padding:'16px 18px',marginBottom:20}}>
                <Text style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#eb2f96',display:'block',marginBottom:14}}>
                  Leave Balance — {viewRecord.driverName}
                </Text>
                <Row gutter={[12,0]} style={{marginBottom:16}}>
                  {Object.entries(LEAVE_QUOTA).map(([type])=>{
                    const b=balance[type]??{used:0,total:LEAVE_QUOTA[type]};
                    const remaining=b.total-b.used;
                    return (
                      <Col key={type} span={8}>
                        <div style={{background:LEAVE_COLORS[type]+'10',border:`1px solid ${LEAVE_COLORS[type]}30`,borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                          <Statistic value={remaining} suffix={<span style={{fontSize:11}}>/{b.total}</span>} valueStyle={{fontSize:22,fontWeight:800,color:LEAVE_COLORS[type],lineHeight:1.2}}/>
                          <Text style={{fontSize:11,color:LEAVE_COLORS[type],fontWeight:600,display:'block',marginTop:2}}>{type}</Text>
                          <Text type="secondary" style={{fontSize:10,display:'block'}}>{b.used} used</Text>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
                {Object.entries(LEAVE_QUOTA).map(([type])=>{
                  const b=balance[type]??{used:0,total:LEAVE_QUOTA[type]};
                  const pct=Math.round((b.used/b.total)*100);
                  return (
                    <div key={type} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <Text style={{fontSize:12,fontWeight:500}}>{type}</Text>
                        <Text type="secondary" style={{fontSize:11}}>{b.used} of {b.total} days used</Text>
                      </div>
                      <Progress percent={pct} size="small" showInfo={false} strokeColor={pct>=80?'#ff4d4f':pct>=50?'#fa8c16':LEAVE_COLORS[type]} trailColor={LEAVE_COLORS[type]+'18'}/>
                    </div>
                  );
                })}
              </div>
              <Text style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#8c8c8c',display:'block',marginBottom:10}}>Request Details</Text>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Status"      ><Tag color={statusColor(viewRecord.status)}>{viewRecord.status?.toUpperCase()}</Tag></Descriptions.Item>
                <Descriptions.Item label="Leave Type"  ><Tag color={LEAVE_COLORS[viewRecord.leaveType]??'default'}>{viewRecord.leaveType}</Tag></Descriptions.Item>
                <Descriptions.Item label="From"        >{formatDate(viewRecord.fromDate)}</Descriptions.Item>
                <Descriptions.Item label="To"          >{formatDate(viewRecord.toDate)}</Descriptions.Item>
                <Descriptions.Item label="Days"        >{viewRecord.days}</Descriptions.Item>
                <Descriptions.Item label="Applied On"  >{formatDate(viewRecord.appliedOn)}</Descriptions.Item>
                <Descriptions.Item label="Approved By" >{viewRecord.approvedBy??'—'}</Descriptions.Item>
                <Descriptions.Item label="Replaced By" >{viewRecord.replacedBy??'—'}</Descriptions.Item>
                <Descriptions.Item label="Reason" span={2}>{viewRecord.reason}</Descriptions.Item>
              </Descriptions>
            </>
          );
        })()}
      </Drawer>
    </div>
  );
}
