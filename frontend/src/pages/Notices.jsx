import {
  CheckOutlined, DeleteOutlined, DownloadOutlined, EditOutlined,
  NotificationOutlined, PaperClipOutlined, PlusOutlined, TeamOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge, Button, Card, Col, Drawer, Form, Input, List, Popconfirm,
  Row, Select, Spin, Tag, Tooltip, Typography, Upload, message,
} from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import FormModal, { FormSection } from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { noticeService } from '../services/noticeService';
import { formatDate, formatDateTime } from '../utils/helpers';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

const priorityColor  = { high: 'red', medium: 'orange', low: 'blue' };
const priorityBg     = { high: '#ff4d4f10', medium: '#fa8c1610', low: '#1677ff10' };
const priorityBorder = { high: '#ff4d4f30', medium: '#fa8c1630', low: '#1677ff30' };
const priorityLeft   = { high: '#ff4d4f',   medium: '#fa8c16',   low: '#1677ff' };
const CATEGORIES = ['General', 'Operations', 'Finance', 'HR', 'Safety', 'IT'];

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip';

export default function Notices() {
  const [priorityFilter, setPriority] = useState('all');
  const [categoryFilter, setCategory] = useState('all');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editRecord, setEditRecord]   = useState(null);
  const [readersNotice, setReadersNotice] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticeService.getAll().then((r) => r.data.data ?? []),
  });

  const { data: readers = [], isFetching: readersLoading } = useQuery({
    queryKey: ['notice-reads', readersNotice?.id],
    queryFn: () => noticeService.getReads(readersNotice.id).then((r) => r.data.data ?? []),
    enabled: !!readersNotice,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => noticeService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); message.success('Notice removed'); },
  });
  const readMut = useMutation({
    mutationFn: (id) => noticeService.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); message.success('Marked as read'); },
  });
  const removeAttachMut = useMutation({
    mutationFn: (id) => noticeService.removeAttachment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      setEditRecord((prev) => prev ? { ...prev, attachmentName: null } : prev);
      message.success('Attachment removed');
    },
  });

  const high   = data.filter((n) => n.priority === 'high').length;
  const medium = data.filter((n) => n.priority === 'medium').length;
  const low    = data.filter((n) => n.priority === 'low').length;

  const filtered = data.filter((n) =>
    (priorityFilter === 'all' || n.priority === priorityFilter) &&
    (categoryFilter === 'all' || n.category === categoryFilter)
  );

  function openAdd() {
    setEditRecord(null);
    setPendingFile(null);
    form.resetFields();
    setModalOpen(true);
  }
  function openEdit(r) {
    setEditRecord(r);
    setPendingFile(null);
    form.setFieldsValue({ ...r });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      let saved;
      if (editRecord) {
        const res = await noticeService.update(editRecord.id, values);
        saved = res.data.data;
      } else {
        const res = await noticeService.create(values);
        saved = res.data.data;
      }
      if (pendingFile) {
        await noticeService.uploadAttachment(saved.id, pendingFile);
      }
      qc.invalidateQueries({ queryKey: ['notices'] });
      setModalOpen(false);
      setPendingFile(null);
      message.success(editRecord ? 'Notice updated' : 'Notice posted');
    } catch {
      message.error('Failed to save notice');
    } finally {
      setSaving(false);
    }
  }

  const uploadProps = {
    accept: ACCEPTED,
    maxCount: 1,
    beforeUpload: (file) => { setPendingFile(file); return false; },
    onRemove: () => setPendingFile(null),
    fileList: pendingFile ? [{ uid: '-1', name: pendingFile.name, status: 'done' }] : [],
  };

  const existingAttach = editRecord?.attachmentName && !pendingFile;

  return (
    <div>
      <PageHeader
        icon={<NotificationOutlined />}
        color="#faad14"
        title="Notices"
        subtitle="Fleet announcements, alerts and staff communications"
        stats={[
          { label: 'High',   value: high,   color: '#ff4d4f' },
          { label: 'Medium', value: medium, color: '#fa8c16' },
          { label: 'Low',    value: low,    color: '#1677ff' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
            style={{ background: '#faad14', borderColor: '#faad14', color: '#000' }}>
            Post Notice
          </Button>
        }
      />

      <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
        <Row gutter={[12, 12]}>
          <Col>
            <Select value={priorityFilter} onChange={setPriority} style={{ width: 150 }}
              options={[{ value:'all',label:'All Priorities' },{ value:'high',label:'High' },{ value:'medium',label:'Medium' },{ value:'low',label:'Low' }]} />
          </Col>
          <Col>
            <Select value={categoryFilter} onChange={setCategory} style={{ width: 150 }}
              options={[{ value:'all',label:'All Categories' },...CATEGORIES.map((c) => ({ value:c,label:c }))]} />
          </Col>
        </Row>
      </Card>

      <Card size="small" style={{ borderRadius: 12 }}>
        <Spin spinning={isLoading}>
          {filtered.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>No notices found</div>
          )}
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              style={{
                padding: '16px',
                marginBottom: idx < filtered.length - 1 ? 12 : 0,
                borderRadius: 10,
                background: priorityBg[item.priority],
                border: `1px solid ${priorityBorder[item.priority]}`,
                borderLeft: `4px solid ${priorityLeft[item.priority] ?? '#8c8c8c'}`,
                opacity: item.readByMe ? 0.82 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    {!item.readByMe && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1677ff', display: 'inline-block', flexShrink: 0 }} />
                    )}
                    <Text strong style={{ fontSize: 14, fontFamily: "'Roboto','Noto Sans Bengali',sans-serif" }}>
                      {item.title}
                    </Text>
                    <Tag color={priorityColor[item.priority]}>{item.priority?.toUpperCase()}</Tag>
                    <Tag color="default">{item.category}</Tag>
                    {item.readByMe && <Tag color="success" style={{ fontSize: 11 }}>Read</Tag>}
                  </div>
                  <Paragraph style={{ marginBottom: 6, fontSize: 13, fontFamily: "'Roboto','Noto Sans Bengali',sans-serif", lineHeight: 1.7 }}>
                    {item.body}
                  </Paragraph>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Posted by: <b>{item.postedBy}</b></Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.date)}</Text>
                    <Tooltip title="View who read this">
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                        onClick={() => setReadersNotice(item)}
                      >
                        <TeamOutlined style={{ marginRight: 4 }} />
                        {item.readCount ?? 0} read
                      </Text>
                    </Tooltip>
                    {item.attachmentName && (
                      <Tooltip title={`Download: ${item.attachmentName}`}>
                        <Button
                          type="link"
                          size="small"
                          icon={<PaperClipOutlined />}
                          style={{ padding: 0, fontSize: 12, height: 'auto' }}
                          onClick={() => noticeService.downloadAttachment(item.id, item.attachmentName)}
                        >
                          {item.attachmentName}
                          <DownloadOutlined style={{ marginLeft: 4 }} />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                  {!item.readByMe && (
                    <Tooltip title="Mark as read">
                      <Button
                        type="text" size="small" icon={<CheckOutlined />}
                        style={{ color: '#52c41a' }}
                        loading={readMut.isPending}
                        onClick={() => readMut.mutate(item.id)}
                      />
                    </Tooltip>
                  )}
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(item)} />
                  <Popconfirm title="Delete this notice?" okText="Delete" okButtonProps={{ danger: true }}
                    onConfirm={() => deleteMut.mutate(item.id)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))}
        </Spin>
      </Card>

      {/* Post / Edit Modal */}
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={saving}
        title={editRecord ? 'Edit Notice' : 'Post Notice'}
        subtitle={editRecord ? 'Update notice content' : 'Publish a new announcement'}
        icon={<NotificationOutlined />}
        color="#faad14"
        okText={editRecord ? 'Update' : 'Post'}
        width={780}
      >
        <Form form={form} layout="vertical" size="small">
          <FormSection title="Notice Details" color="#faad14">
            <Form.Item
              name="title"
              label={<span style={{ display:'flex',alignItems:'center',gap:8 }}>Title <Tag style={{ fontSize:10,margin:0 }}>EN</Tag><Tag color="blue" style={{ fontSize:10,margin:0 }}>বাংলা</Tag></span>}
              rules={[{ required: true, message: 'Enter a title' }]}
            >
              <Input placeholder="Notice title / বিজ্ঞপ্তির শিরোনাম"
                style={{ fontFamily:"'Roboto','Noto Sans Bengali',sans-serif" }} showCount maxLength={120} />
            </Form.Item>
            <Form.Item
              name="body"
              label={<span style={{ display:'flex',alignItems:'center',gap:8 }}>Content <Tag style={{ fontSize:10,margin:0 }}>EN</Tag><Tag color="blue" style={{ fontSize:10,margin:0 }}>বাংলা</Tag></span>}
              rules={[{ required: true, message: 'Enter notice content' }]}
            >
              <Input.TextArea rows={4} placeholder="Write notice content…"
                style={{ fontFamily:"'Roboto','Noto Sans Bengali',sans-serif" }} showCount maxLength={1000} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                  <Select options={[{ value:'high',label:'High' },{ value:'medium',label:'Medium' },{ value:'low',label:'Low' }]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Select options={CATEGORIES.map((c) => ({ value:c,label:c }))} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="postedBy" label="Posted By" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Admin" />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormSection title="Attachment" color="#8c8c8c">
            <Form.Item label="Attach File" style={{ marginBottom: existingAttach ? 8 : 0 }}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} size="small">
                  {pendingFile ? 'Replace File' : 'Choose File'}
                </Button>
              </Upload>
              <div style={{ marginTop: 4, fontSize: 11, color: '#8c8c8c' }}>
                Supported: PDF, Word, Excel, PowerPoint, images, ZIP · Max 20 MB
              </div>
            </Form.Item>
            {existingAttach && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: '#f5f5f5', borderRadius: 6, border: '1px solid #e8e8e8',
              }}>
                <PaperClipOutlined style={{ color: '#1677ff' }} />
                <Text style={{ fontSize: 12, flex: 1 }}>{editRecord.attachmentName}</Text>
                <Popconfirm title="Remove this attachment?" okText="Remove" okButtonProps={{ danger: true }}
                  onConfirm={() => removeAttachMut.mutate(editRecord.id)}>
                  <Button type="link" size="small" danger loading={removeAttachMut.isPending}>
                    Remove
                  </Button>
                </Popconfirm>
              </div>
            )}
          </FormSection>
        </Form>
      </FormModal>

      {/* Readers Drawer */}
      <Drawer
        open={!!readersNotice}
        onClose={() => setReadersNotice(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined style={{ color: '#1677ff' }} />
            <span>Read By</span>
            <Badge count={readers.length} style={{ background: '#1677ff' }} />
          </div>
        }
        width={400}
      >
        {readersNotice && (
          <>
            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13 }}>{readersNotice.title}</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={priorityColor[readersNotice.priority]}>{readersNotice.priority?.toUpperCase()}</Tag>
                <Tag color="default">{readersNotice.category}</Tag>
              </div>
            </div>
            <Spin spinning={readersLoading}>
              {readers.length === 0 && !readersLoading && (
                <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>No one has read this notice yet</div>
              )}
              <List
                dataSource={readers}
                renderItem={(r) => (
                  <List.Item style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#1677ff20',
                        border: '1.5px solid #1677ff40', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, color: '#1677ff', fontSize: 14, flexShrink: 0,
                      }}>
                        {(r.fullName || r.username)?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{r.fullName || r.username}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>@{r.username}</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {r.readAt ? dayjs(r.readAt).fromNow() : ''}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                          {r.readAt ? formatDateTime(r.readAt) : ''}
                        </Text>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Spin>
          </>
        )}
      </Drawer>
    </div>
  );
}
