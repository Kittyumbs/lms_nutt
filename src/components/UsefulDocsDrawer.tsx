import { LinkOutlined, DeleteOutlined, SearchOutlined, EditOutlined, CopyOutlined, StarOutlined, GlobalOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, List, Avatar, Space, Popconfirm, message, Select, Card, Tag, Tooltip, Typography, Divider } from 'antd';
import AnimatedTabs from './AnimatedTabs';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import useAuth from '../auth/useAuth';

const { Text } = Typography;
const { Search } = Input;

import { db } from '../lib/firebase';

type ResourceLink = {
  id?: string;
  url: string;
  userTitle?: string;
  pageTitle?: string;
  faviconUrl?: string;
  domain?: string;
  createdAt?: any;
  updatedAt?: any;
  description?: string;
  category?: string;
  isFavorite?: boolean;
  accessCount?: number;
  uid: string;
};

function toFavicon(url: string) {
  try {
    const u = new URL(url);
    // Sử dụng Google's favicon service để lấy favicon đáng tin cậy
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
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
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editingLink, setEditingLink] = useState<ResourceLink | null>(null);
  const [editForm] = Form.useForm();

  // Load realtime list
  useEffect(() => {
    if (!user?.uid) {
      setLinks([]);
      return;
    }

    const q = query(
      collection(db, 'usefulLinks'), 
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: ResourceLink[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<ResourceLink, 'id'>) }));
      setLinks(items);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const displayTitle = (item: ResourceLink) =>
    item.userTitle?.trim() ||
    item.pageTitle?.trim() ||
    toHostname(item.url);

  const getDomain = (item: ResourceLink) => {
    const host = item.domain || toHostname(item.url);
    return host;
  };

  // categories pills (dynamic from data) - for filter
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    links.forEach(l => {
      if (l.category && l.category.trim()) {
        set.add(l.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [links]);

  // categories for form dropdown
  const formCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    links.forEach(l => {
      if (l.category && l.category.trim()) {
        set.add(l.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [links]);

  // filtered and searched list
  const filteredLinks = useMemo(() => {
    let filtered = links;
    
    // Filter by category
    if (filterCategory !== 'ALL') {
      filtered = filtered.filter(l => l.category === filterCategory);
    }
    
    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(l => 
        displayTitle(l).toLowerCase().includes(searchLower) ||
        l.url.toLowerCase().includes(searchLower) ||
        l.description?.toLowerCase().includes(searchLower) ||
        l.category?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [links, filterCategory, searchText]);

  const onAdd = async () => {
    if (!user?.uid) {
      messageApi.error('Vui lòng đăng nhập để thêm liên kết');
      return;
    }

    try {
      setLoading(true);
      const values = await form.validateFields();
      const url: string = values.url.trim();
      const userTitleRaw: string | undefined = values.title?.trim();
      const userTitle = userTitleRaw && userTitleRaw.length > 0 ? userTitleRaw : undefined;
      const description = values.description?.trim();
      const category = Array.isArray(values.category) 
        ? values.category[0]?.trim() 
        : values.category?.trim();

      // basic URL check
      new URL(url);

      const faviconUrl = toFavicon(url);
      const domain = new URL(url).hostname;

      // Build payload WITHOUT any undefined fields
      const docData: Omit<ResourceLink, 'id'> = {
        url,
        domain,
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        accessCount: 0,
        isFavorite: false,
        ...(userTitle ? { userTitle } : {}),
        ...(description ? { description } : {}),
        ...(category ? { category } : {}),
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
    if (!id || !user?.uid) return;
    
    // Find the link to check ownership
    const link = links.find(l => l.id === id);
    if (link && link.uid !== user.uid) {
      messageApi.error('Bạn không có quyền xóa liên kết này');
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'usefulLinks', id));
      messageApi.success('Đã xoá');
    } catch (err: any) {
      messageApi.error(err?.message || 'Không thể xoá');
    }
  };

  const onEdit = (link: ResourceLink) => {
    setEditingLink(link);
    editForm.setFieldsValue({
      title: link.userTitle || '',
      description: link.description || '',
      category: link.category || '',
    });
  };

  const onUpdate = async () => {
    if (!editingLink?.id || !user?.uid) return;
    
    // Check if the link belongs to the current user
    if (editingLink.uid !== user.uid) {
      messageApi.error('Bạn không có quyền chỉnh sửa liên kết này');
      return;
    }
    
    try {
      setLoading(true);
      const values = await editForm.validateFields();
      
      const category = Array.isArray(values.category) 
        ? values.category[0]?.trim() 
        : values.category?.trim();
        
      await updateDoc(doc(db, 'usefulLinks', editingLink.id), {
        userTitle: values.title?.trim() || null,
        description: values.description?.trim() || null,
        category: category || null,
        updatedAt: serverTimestamp(),
      });
      
      setEditingLink(null);
      editForm.resetFields();
      messageApi.success('Đã cập nhật liên kết');
    } catch (err: any) {
      messageApi.error(err?.message || 'Không thể cập nhật liên kết');
    } finally {
      setLoading(false);
    }
  };

  const onToggleFavorite = async (link: ResourceLink) => {
    if (!link.id || !user?.uid) return;
    
    // Check if the link belongs to the current user
    if (link.uid !== user.uid) {
      messageApi.error('Bạn không có quyền thay đổi trạng thái yêu thích');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'usefulLinks', link.id), {
        isFavorite: !link.isFavorite,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      messageApi.error('Không thể cập nhật yêu thích');
    }
  };

  const onCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    messageApi.success('Đã copy link');
  };

  const onAccessLink = async (link: ResourceLink) => {
    if (link.id) {
      try {
        await updateDoc(doc(db, 'usefulLinks', link.id), {
          accessCount: (link.accessCount || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error updating access count:', err);
      }
    }
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {contextHolder}
      <Button
        type="primary"
        icon={<LinkOutlined />}
        onClick={handleOpen}
      >
        Documents
      </Button>

      <Drawer
        title="Documents Useful"
        placement="right"
        width="40vw"
        open={open}
        onClose={handleClose}
        style={{ height: '100vh' }}
        bodyStyle={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden'
        }}
      >
        {/* Add Form Section - Compact */}
        <Card title="Add New Link" size="small" style={{ marginBottom: 12, flexShrink: 0 }}>
          <Form form={form} layout="vertical" autoComplete="off">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item
                label="Link (URL)"
                name="url"
                rules={[
                  { required: true, message: 'Please enter URL' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      try {
                        new URL(String(value));
                        return Promise.resolve();
                      } catch {
                        return Promise.reject(new Error('Invalid URL'));
                      }
                    },
                  },
                ]}
              >
                <Input placeholder="https://example.com/document" prefix={<LinkOutlined />} />
              </Form.Item>

              <Form.Item
                label="Title (optional)"
                name="title"
              >
                <Input placeholder="Example: Shopee Order Processing" />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item
                label="Description (optional)"
                name="description"
              >
                <Input.TextArea placeholder="Brief description..." rows={1} />
              </Form.Item>

              <Form.Item
                label="Category (optional)"
                name="category"
              >
                <Select
                  placeholder="Select or enter category..."
                  allowClear
                  showSearch
                  mode="tags"
                  options={formCategoryOptions.map(cat => ({ label: cat, value: cat }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button onClick={() => form.resetFields()}>Clear</Button>
              <Button type="primary" onClick={onAdd} loading={loading}>
                Add Link
              </Button>
            </div>
          </Form>
        </Card>

        <Divider style={{ margin: '12px 0', flexShrink: 0 }} />

        {/* Search and Filter Section */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <Search
            placeholder="Search links..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginBottom: 12 }}
            allowClear
          />
          
          <AnimatedTabs
            items={[
              { label: 'All', value: 'ALL' },
              ...categoryOptions.map(cat => ({ label: cat, value: cat }))
            ]}
            value={filterCategory}
            onChange={(value) => setFilterCategory(value as string)}
          />
        </div>

        {/* Links List */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          minHeight: 0 // Important for flex child to respect overflow
        }}>
          {filteredLinks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              {searchText || filterCategory !== 'ALL' 
                ? 'No matching links found' 
                : 'No links yet. Add your first link!'}
            </div>
          ) : (
            filteredLinks.map((item) => (
              <Card
                key={item.id}
                size="small"
                style={{ 
                  marginBottom: 8,
                  border: item.isFavorite ? '1px solid #ff4d4f' : '1px solid #f0f0f0',
                  background: item.isFavorite ? '#fff2f0' : 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Avatar 
                    src={item.faviconUrl} 
                    shape="square" 
                    size={40}
                    icon={<GlobalOutlined />}
                  />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text 
                        strong 
                        style={{ 
                          color: '#1890ff',
                          cursor: 'pointer',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => onAccessLink(item)}
                      >
                        {displayTitle(item)}
                      </Text>
                      {item.isFavorite && <StarOutlined style={{ color: '#ff4d4f' }} />}
                    </div>
                    
                    <Text 
                      type="secondary" 
                      style={{ 
                        display: 'block', 
                        marginBottom: 4,
                        fontSize: '12px'
                      }}
                    >
                      {getDomain(item)}
                    </Text>
                    
                    {item.description && (
                      <Text style={{ display: 'block', marginBottom: 8, fontSize: '13px' }}>
                        {item.description}
                      </Text>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <div>
                        {item.category && (
                          <Tag color="blue" style={{ fontWeight: 'bold' }}>
                            📁 {item.category}
                          </Tag>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Tooltip title="Open link">
                          <Button 
                            type="text" 
                            icon={<LinkOutlined />} 
                            onClick={() => onAccessLink(item)}
                            size="small"
                          />
                        </Tooltip>
                        
                        <Tooltip title="Copy link">
                          <Button 
                            type="text" 
                            icon={<CopyOutlined />} 
                            onClick={() => onCopyUrl(item.url)}
                            size="small"
                          />
                        </Tooltip>
                        
                        <Tooltip title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                          <Button 
                            type="text" 
                            icon={<StarOutlined />} 
                            onClick={() => onToggleFavorite(item)}
                            size="small"
                            style={{ color: item.isFavorite ? '#ff4d4f' : '#d9d9d9' }}
                          />
                        </Tooltip>
                        
                        <Tooltip title="Edit">
                          <Button 
                            type="text" 
                            icon={<EditOutlined />} 
                            onClick={() => onEdit(item)}
                            size="small"
                          />
                        </Tooltip>
                        
                        <Popconfirm
                          title="Delete link?"
                          description="Are you sure you want to delete this link?"
                          okText="Delete"
                          cancelText="Cancel"
                          onConfirm={() => onDelete(item.id)}
                        >
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />}
                            size="small"
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Edit Modal */}
        {editingLink && (
          <Card 
            title="Edit Link" 
            size="small" 
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 1000,
              width: '400px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <Form form={editForm} layout="vertical">
              <Form.Item
                label="Title"
                name="title"
              >
                <Input placeholder="Link title" />
              </Form.Item>
              
              <Form.Item
                label="Description"
                name="description"
              >
                <Input.TextArea placeholder="Link description" rows={3} />
              </Form.Item>
              
              <Form.Item
                label="Category"
                name="category"
              >
                <Select
                  placeholder="Select or enter category..."
                  allowClear
                  showSearch
                  mode="tags"
                  options={formCategoryOptions.map(cat => ({ label: cat, value: cat }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setEditingLink(null)}>
                  Cancel
                </Button>
                <Button type="primary" onClick={onUpdate} loading={loading}>
                  Update
                </Button>
              </Space>
            </Form>
          </Card>
        )}
      </Drawer>
    </>
  );
}