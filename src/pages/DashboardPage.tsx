import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Input, Form, Modal, Tabs, message, Space, Divider, Typography, Row, Col } from 'antd';
import { PlusOutlined, SettingOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

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
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<DashboardConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'powerbi' | 'looker'>('powerbi');
  const navigate = useNavigate();

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

  const handleAddDashboard = (type?: 'powerbi' | 'looker') => {
    setEditingDashboard(null);
    form.resetFields();
    if (type) {
      form.setFieldsValue({ type });
    }
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
        message.success('Dashboard deleted successfully');
      },
    });
  };

  const handleViewDashboard = (dashboard: DashboardConfig) => {
    // Navigate to dashboard viewer page
    navigate(`/lms/dashboard/view/${dashboard.id}`);
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
                onClick={() => handleAddDashboard()}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDashboard(dashboard);
                            }}
                          />
                          <Button 
                            type="text" 
                            icon={<SettingOutlined />} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDashboard(dashboard);
                            }}
                          />
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDashboard(dashboard.id);
                            }}
                          />
                        </Space>
                      }
                      className="h-full cursor-pointer hover:shadow-lg transition-shadow duration-200"
                      onClick={() => handleViewDashboard(dashboard)}
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
                      onClick={() => handleAddDashboard('powerbi')}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDashboard(dashboard);
                            }}
                          />
                          <Button 
                            type="text" 
                            icon={<SettingOutlined />} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDashboard(dashboard);
                            }}
                          />
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDashboard(dashboard.id);
                            }}
                          />
                        </Space>
                      }
                      className="h-full cursor-pointer hover:shadow-lg transition-shadow duration-200"
                      onClick={() => handleViewDashboard(dashboard)}
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
                      onClick={() => handleAddDashboard('looker')}
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
              <Select placeholder="Select dashboard type" disabled={!!editingDashboard}>
                <Option value="powerbi">PowerBI</Option>
                <Option value="looker">Looker Studio</Option>
              </Select>
            </Form.Item>

            {/* PowerBI Configuration */}
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
              {({ getFieldValue }) => {
                const dashboardType = getFieldValue('type');
                
                if (dashboardType === 'powerbi') {
                  return (
                    <>
                      <Form.Item
                        name="embedUrl"
                        label="PowerBI Embed URL"
                        rules={[{ required: true, message: 'Please enter PowerBI embed URL' }]}
                      >
                        <Input placeholder="https://app.powerbi.com/reportEmbed" />
                      </Form.Item>

                      <Form.Item
                        name="reportId"
                        label="Report ID"
                        rules={[{ required: true, message: 'Please enter PowerBI report ID' }]}
                      >
                        <Input placeholder="Enter PowerBI report ID (e.g., 12345678-1234-1234-1234-123456789012)" />
                      </Form.Item>

                      <Form.Item
                        name="accessToken"
                        label="Access Token"
                        tooltip="Required for PowerBI authentication"
                      >
                        <Input.Password placeholder="Enter PowerBI access token" />
                      </Form.Item>
                    </>
                  );
                }
                
                if (dashboardType === 'looker') {
                  return (
                    <>
                      <Form.Item
                        name="embedUrl"
                        label="Looker Studio Embed URL"
                        rules={[{ required: true, message: 'Please enter Looker Studio embed URL' }]}
                      >
                        <Input placeholder="https://lookerstudio.google.com/embed/reporting/..." />
                      </Form.Item>

                      <Form.Item
                        name="reportId"
                        label="Report ID"
                        rules={[{ required: true, message: 'Please enter Looker Studio report ID' }]}
                      >
                        <Input placeholder="Enter Looker Studio report ID" />
                      </Form.Item>

                      <Form.Item
                        name="pageId"
                        label="Page ID"
                        tooltip="Optional - specific page within the report"
                      >
                        <Input placeholder="Enter page ID (optional)" />
                      </Form.Item>
                    </>
                  );
                }
                
                return null;
              }}
            </Form.Item>

            {/* Common Configuration */}
            <Divider>Display Settings</Divider>
            
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
              tooltip="Optional filters to apply to the dashboard"
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
