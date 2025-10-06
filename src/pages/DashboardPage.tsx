import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Input, Form, Modal, Tabs, message, Space, Divider, Typography, Row, Col } from 'antd';
import { PlusOutlined, SettingOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface DashboardConfig {
  id: string;
  name: string;
  type: 'powerbi' | 'looker';
  embedUrl: string;
  accessToken?: string;
  reportId?: string;
  pageId?: string;
  width: string;
  height: string;
  filters?: string;
  isActive: boolean;
}

const DashboardPage: React.FC = () => {
  const [form] = Form.useForm();
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<DashboardConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'powerbi' | 'looker'>('powerbi');

  // Load dashboards from localStorage on mount
  useEffect(() => {
    const savedDashboards = localStorage.getItem('dashboard-configs');
    if (savedDashboards) {
      setDashboards(JSON.parse(savedDashboards));
    }
  }, []);

  // Save dashboards to localStorage whenever dashboards change
  useEffect(() => {
    localStorage.setItem('dashboard-configs', JSON.stringify(dashboards));
  }, [dashboards]);

  const handleAddDashboard = () => {
    setEditingDashboard(null);
    form.resetFields();
    setIsConfigModalVisible(true);
  };

  const handleEditDashboard = (dashboard: DashboardConfig) => {
    setEditingDashboard(dashboard);
    form.setFieldsValue(dashboard);
    setIsConfigModalVisible(true);
  };

  const handleDeleteDashboard = (id: string) => {
    Modal.confirm({
      title: 'Delete Dashboard',
      content: 'Are you sure you want to delete this dashboard configuration?',
      onOk: () => {
        setDashboards(prev => prev.filter(d => d.id !== id));
        if (selectedDashboard === id) {
          setSelectedDashboard(null);
        }
        message.success('Dashboard deleted successfully');
      },
    });
  };

  const handleSaveDashboard = async () => {
    try {
      const values = await form.validateFields();
      const newDashboard: DashboardConfig = {
        id: editingDashboard?.id || `dashboard_${Date.now()}`,
        name: values.name,
        type: values.type,
        embedUrl: values.embedUrl,
        accessToken: values.accessToken,
        reportId: values.reportId,
        pageId: values.pageId,
        width: values.width || '100%',
        height: values.height || '600px',
        filters: values.filters,
        isActive: true,
      };

      if (editingDashboard) {
        setDashboards(prev => prev.map(d => d.id === editingDashboard.id ? newDashboard : d));
        message.success('Dashboard updated successfully');
      } else {
        // Check limits
        const currentCount = dashboards.filter(d => d.type === newDashboard.type).length;
        const maxCount = 3;
        
        if (currentCount >= maxCount) {
          message.error(`Maximum ${maxCount} ${newDashboard.type} dashboards allowed`);
          return;
        }
        
        setDashboards(prev => [...prev, newDashboard]);
        message.success('Dashboard added successfully');
      }

      setIsConfigModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getEmbedUrl = (dashboard: DashboardConfig) => {
    if (dashboard.type === 'powerbi') {
      return `${dashboard.embedUrl}?reportId=${dashboard.reportId}&accessToken=${dashboard.accessToken}`;
    } else {
      // Looker Studio
      const baseUrl = dashboard.embedUrl;
      const params = dashboard.filters ? `&params=${encodeURIComponent(dashboard.filters)}` : '';
      return `${baseUrl}${params}`;
    }
  };

  const renderDashboardPreview = (dashboard: DashboardConfig) => {
    const embedUrl = getEmbedUrl(dashboard);
    
    return (
      <div 
        key={dashboard.id}
        style={{ 
          width: dashboard.width, 
          height: dashboard.height,
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          overflow: 'hidden'
        }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          title={dashboard.name}
        />
      </div>
    );
  };

  const powerbiDashboards = dashboards.filter(d => d.type === 'powerbi');
  const lookerDashboards = dashboards.filter(d => d.type === 'looker');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Title level={2}>Business Intelligence Dashboard</Title>
          <Text type="secondary">
            Configure and view your PowerBI and Looker Studio dashboards
          </Text>
        </div>

        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Title level={4}>Dashboard Selection</Title>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddDashboard}
              >
                Add Dashboard
              </Button>
            </Space>
          </div>

          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'powerbi' | 'looker')}>
            <TabPane tab={`PowerBI (${powerbiDashboards.length}/3)`} key="powerbi">
              <Row gutter={[16, 16]}>
                {powerbiDashboards.map(dashboard => (
                  <Col key={dashboard.id} span={8}>
                    <Card
                      title={dashboard.name}
                      extra={
                        <Space>
                          <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            onClick={() => setSelectedDashboard(dashboard.id)}
                          />
                          <Button 
                            type="text" 
                            icon={<SettingOutlined />} 
                            onClick={() => handleEditDashboard(dashboard)}
                          />
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleDeleteDashboard(dashboard.id)}
                          />
                        </Space>
                      }
                      className="h-full"
                    >
                      <div className="text-center">
                        <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center mb-2">
                          <Text type="secondary">PowerBI Preview</Text>
                        </div>
                        <Text type="secondary" className="text-xs">
                          {dashboard.embedUrl}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
                {powerbiDashboards.length < 3 && (
                  <Col span={8}>
                    <Card 
                      className="h-full border-dashed border-2 flex items-center justify-center cursor-pointer hover:border-blue-400"
                      onClick={handleAddDashboard}
                    >
                      <div className="text-center">
                        <PlusOutlined className="text-4xl text-gray-400 mb-2" />
                        <Text type="secondary">Add PowerBI Dashboard</Text>
                      </div>
                    </Card>
                  </Col>
                )}
              </Row>
            </TabPane>

            <TabPane tab={`Looker Studio (${lookerDashboards.length}/3)`} key="looker">
              <Row gutter={[16, 16]}>
                {lookerDashboards.map(dashboard => (
                  <Col key={dashboard.id} span={8}>
                    <Card
                      title={dashboard.name}
                      extra={
                        <Space>
                          <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            onClick={() => setSelectedDashboard(dashboard.id)}
                          />
                          <Button 
                            type="text" 
                            icon={<SettingOutlined />} 
                            onClick={() => handleEditDashboard(dashboard)}
                          />
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleDeleteDashboard(dashboard.id)}
                          />
                        </Space>
                      }
                      className="h-full"
                    >
                      <div className="text-center">
                        <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center mb-2">
                          <Text type="secondary">Looker Studio Preview</Text>
                        </div>
                        <Text type="secondary" className="text-xs">
                          {dashboard.embedUrl}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
                {lookerDashboards.length < 3 && (
                  <Col span={8}>
                    <Card 
                      className="h-full border-dashed border-2 flex items-center justify-center cursor-pointer hover:border-blue-400"
                      onClick={handleAddDashboard}
                    >
                      <div className="text-center">
                        <PlusOutlined className="text-4xl text-gray-400 mb-2" />
                        <Text type="secondary">Add Looker Dashboard</Text>
                      </div>
                    </Card>
                  </Col>
                )}
              </Row>
            </TabPane>
          </Tabs>
        </Card>

        {/* Dashboard Viewer */}
        {selectedDashboard && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Title level={4}>
                {dashboards.find(d => d.id === selectedDashboard)?.name}
              </Title>
              <Button onClick={() => setSelectedDashboard(null)}>Close</Button>
            </div>
            {renderDashboardPreview(dashboards.find(d => d.id === selectedDashboard)!)}
          </Card>
        )}

        {/* Configuration Modal */}
        <Modal
          title={editingDashboard ? 'Edit Dashboard' : 'Add Dashboard'}
          open={isConfigModalVisible}
          onCancel={() => setIsConfigModalVisible(false)}
          onOk={handleSaveDashboard}
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Dashboard Name"
              rules={[{ required: true, message: 'Please enter dashboard name' }]}
            >
              <Input placeholder="Enter dashboard name" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Dashboard Type"
              rules={[{ required: true, message: 'Please select dashboard type' }]}
            >
              <Select placeholder="Select dashboard type">
                <Option value="powerbi">PowerBI</Option>
                <Option value="looker">Looker Studio</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="embedUrl"
              label="Embed URL"
              rules={[{ required: true, message: 'Please enter embed URL' }]}
            >
              <Input placeholder="https://app.powerbi.com/reportEmbed or https://lookerstudio.google.com/embed/reporting/..." />
            </Form.Item>

            <Form.Item
              name="reportId"
              label="Report ID"
              rules={[{ required: true, message: 'Please enter report ID' }]}
            >
              <Input placeholder="Enter report ID" />
            </Form.Item>

            <Form.Item
              name="pageId"
              label="Page ID (Looker Studio only)"
            >
              <Input placeholder="Enter page ID (optional for Looker Studio)" />
            </Form.Item>

            <Form.Item
              name="accessToken"
              label="Access Token (PowerBI only)"
            >
              <Input.Password placeholder="Enter access token (optional for PowerBI)" />
            </Form.Item>

            <Form.Item
              name="width"
              label="Width"
              initialValue="100%"
            >
              <Input placeholder="100% or 800px" />
            </Form.Item>

            <Form.Item
              name="height"
              label="Height"
              initialValue="600px"
            >
              <Input placeholder="600px or 80vh" />
            </Form.Item>

            <Form.Item
              name="filters"
              label="Filters (JSON format)"
            >
              <Input.TextArea 
                placeholder='{"dateRange": "last_30_days", "category": "all"}' 
                rows={3}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default DashboardPage;
