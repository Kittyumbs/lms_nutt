import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, List, Avatar, Space, Popconfirm, message, Segmented } from 'antd';
import { PlusOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../src/firebase'; // Adjusted path to firebase.ts

type ResourceLink = {
  id?: string;
  url: string;
  userTitle?: string;
  pageTitle?: string;
  faviconUrl?: string;
  domain?: string;
  createdAt?: any;
  updatedAt?: any;
};

function toFavicon(url: string) {
  try {
    const u = new URL(url);
    return `${u.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

function toHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function UsefulDocsDrawer() {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [filterDomain, setFilterDomain] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Load realtime list
  useEffect(() => {
    const q = query(collection(db, 'usefulLinks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: ResourceLink[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<ResourceLink, 'id'>) }));
      setLinks(items);
    });
    return () => unsub();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const displayTitle = (item: ResourceLink) =>
    item.userTitle?.trim() ||
    item.pageTitle?.trim() ||
    toHostname(item.url);

  const getDomain = (item: ResourceLink) => {
    const host = item.domain || toHostname(item.url);
    return host.split('.')[0];
  };

  // domains pills (dynamic from data)
  const domainOptions = React.useMemo(() => {
    const set = new Set<string>();
    links.forEach(l => set.add(getDomain(l)));
    return Array.from(set).sort();
  }, [links]);

  // filtered list
  const filteredLinks = React.useMemo(() => {
    if (filterDomain === 'ALL') return links;
    return links.filter(l => getDomain(l) === filterDomain);
  }, [links, filterDomain]);

  const onAdd = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const url: string = values.url.trim();
      const userTitleRaw: string | undefined = values.title?.trim();
      const userTitle = userTitleRaw && userTitleRaw.length > 0 ? userTitleRaw : undefined;

      // basic URL check
      new URL(url);

      const faviconUrl = toFavicon(url); // may be undefined
      const pageTitle = ''; // optional for now
      const domain = new URL(url).hostname;

      // Build payload WITHOUT any undefined fields
      const docData: Omit<ResourceLink, 'id'> = {
        url,
        domain,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(userTitle ? { userTitle } : {}),
        ...(pageTitle ? { pageTitle } : {}),
        ...(faviconUrl ? { faviconUrl } : {}),
      };

      await addDoc(collection(db, 'usefulLinks'), docData);
      form.resetFields();
      messageApi.success('Đã thêm liên kết');
    } catch (err: any) {
      messageApi.error(err?.message || 'Không thể thêm liên kết');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'usefulLinks', id));
      messageApi.success('Đã xoá');
    } catch (err: any) {
      messageApi.error(err?.message || 'Không thể xoá');
    }
  };

  // Green primary-style button
  const greenBtnStyle: React.CSSProperties = {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  };

  return (
    <>
      {contextHolder}
      <Button
        type="primary"
        icon={<PlusOutlined />}
        className="ant-btn css-1v5z42l ant-btn-primary ant-btn-color-primary ant-btn-variant-solid"
        style={greenBtnStyle}
        onClick={handleOpen}
      >
        Tài liệu thường dùng
      </Button>

      <Drawer
        title="Tài liệu thường dùng"
        placement="right"
        width="33vw"
        open={open}
        onClose={handleClose}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Link (URL)"
            name="url"
            rules={[
              { required: true, message: 'Vui lòng nhập URL' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    new URL(String(value));
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('URL không hợp lệ'));
                  }
                },
              },
            ]}
          >
            <Input placeholder="https://example.com/tai-lieu" prefix={<LinkOutlined />} />
          </Form.Item>

          <Form.Item
            label="Tiêu đề (tuỳ chọn)"
            name="title"
          >
            <Input placeholder="VD: Quy trình xử lý đơn Shopee" />
          </Form.Item>

          <Space>
            <Button type="primary" onClick={onAdd} loading={loading}>
              Thêm liên kết
            </Button>
            <Button onClick={() => form.resetFields()}>Xoá nhập</Button>
          </Space>
        </Form>

        <div style={{ marginTop: 24 }} />

        {/* PILL FILTERS */}
        <div style={{ marginBottom: 12 }}>
          <Segmented
            value={filterDomain}
            onChange={(v) => setFilterDomain(String(v))}
            options={[
              { label: 'Tất cả', value: 'ALL' },
              ...domainOptions.map(d => ({ label: d, value: d })),
            ]}
            size="large"
          />
        </div>
        <List
          itemLayout="horizontal"
          dataSource={filteredLinks}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title="Xoá liên kết?"
                  okText="Xoá"
                  cancelText="Huỷ"
                  onConfirm={() => onDelete(item.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={item.faviconUrl} shape="square" />}
                title={
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {displayTitle(item)}
                  </a>
                }
                description={item.url}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}
