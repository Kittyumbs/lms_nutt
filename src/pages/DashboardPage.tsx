import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Input, Form, Modal, Tabs, message, Space, Divider, Typography, Row, Col } from 'antd';
import { PlusOutlined, SettingOutlined, EyeOutlined, DeleteOutlined, ExpandOutlined, ColumnWidthOutlined, EditOutlined } from '@ant-design/icons';
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
  const [sizePreset, setSizePreset] = useState<'full-width' | 'full-height' | 'custom'>('full-width');
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    isPublic: boolean;
    isEmbed: boolean;
  }>({ isValid: false, isPublic: false, isEmbed: false });
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
    setSizePreset('full-width');
    setUrlValidation({ isValid: false, isPublic: false, isEmbed: false });
    if (type) {
      form.setFieldsValue({ type });
    }
    setIsConfigModalVisible(true);
  };

  const validateUrl = (url: string, type: 'powerbi' | 'looker') => {
    if (!url) {
      setUrlValidation({ isValid: false, isPublic: false, isEmbed: false });
      return;
    }

    if (type === 'powerbi') {
      const isPublic = url.includes('app.powerbi.com/view');
      const isEmbed = url.includes('app.powerbi.com/reportEmbed');
      const isValid = isPublic || isEmbed;
      
      setUrlValidation({ isValid, isPublic, isEmbed });
      
      // Auto-set size based on URL type
      if (isPublic) {
        setSizePreset('full-width');
        form.setFieldsValue({ width: '100%', height: 'auto' });
      }
    } else if (type === 'looker') {
      const isLooker = url.includes('lookerstudio.google.com');
      setUrlValidation({ isValid: isLooker, isPublic: false, isEmbed: isLooker });
    }
  };

  const handleEditDashboard = (dashboard: DashboardConfig) => {
    setEditingDashboard(dashboard);
    form.setFieldsValue(dashboard);
    
    // Auto-validate URL when editing
    if (dashboard.embedUrl) {
      validateUrl(dashboard.embedUrl, dashboard.type);
    }
    
    // Set size preset based on current dimensions
    if (dashboard.width === '100%' && dashboard.height === 'auto') {
      setSizePreset('full-width');
    } else if (dashboard.width === 'auto' && dashboard.height === '100%') {
      setSizePreset('full-height');
    } else {
      setSizePreset('custom');
    }
    
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
      
      // Smart validation based on URL type
      if (values.type === 'powerbi') {
        const isPublicView = values.embedUrl?.includes('app.powerbi.com/view');
        const isEmbedUrl = values.embedUrl?.includes('app.powerbi.com/reportEmbed');
        
        if (isEmbedUrl && (!values.reportId || !values.accessToken)) {
          message.error('Report ID and Access Token are required for PowerBI embed URLs');
          return;
        }
      }
      
      // Set default dimensions based on preset
      let width = '100%';
      let height = 'auto';
      
      if (sizePreset === 'full-width') {
        width = '100%';
        height = 'auto';
      } else if (sizePreset === 'full-height') {
        width = 'auto';
        height = '100%';
      } else if (sizePreset === 'custom') {
        width = values.width || '100%';
        height = values.height || 'auto';
      }
      
      const newDashboard: DashboardConfig = {
        id: editingDashboard?.id || `dashboard_${Date.now()}`,
        name: values.name,
        type: values.type,
        embedUrl: values.embedUrl,
        accessToken: values.accessToken,
        reportId: values.reportId,
        pageId: values.pageId,
        width: width,
        height: height,
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
      setSizePreset('full-width');
      setUrlValidation({ isValid: false, isPublic: false, isEmbed: false });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getEmbedUrl = (dashboard: DashboardConfig) => {
    if (dashboard.type === 'powerbi') {
      let url = dashboard.embedUrl;
      
      // Check if it's a public view URL or embed URL
      if (url.includes('app.powerbi.com/view')) {
        // Public view URL - use as is, just add filters if any
        if (dashboard.filters) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}filter=${encodeURIComponent(dashboard.filters)}`;
        }
      } else {
        // Embed URL - add reportId and accessToken
        if (dashboard.reportId) {
          url += `?reportId=${dashboard.reportId}`;
        }
        if (dashboard.accessToken) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}accessToken=${dashboard.accessToken}`;
        }
        if (dashboard.filters) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}filter=${encodeURIComponent(dashboard.filters)}`;
        }
      }
      
      return url;
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
                         <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                           <Text type="secondary">PowerBI Preview</Text>
                         </div>
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
                         <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                           <Text type="secondary">Looker Studio Preview</Text>
                         </div>
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
                 const embedUrl = getFieldValue('embedUrl') || '';
                 
                 if (dashboardType === 'powerbi') {
                   return (
                     <>
                       <Form.Item
                         name="embedUrl"
                         label="PowerBI URL"
                         rules={[{ required: true, message: 'Please enter PowerBI URL' }]}
                         tooltip="Enter your PowerBI URL - we'll automatically detect the type"
                         validateStatus={urlValidation.isValid ? 'success' : (embedUrl && !urlValidation.isValid ? 'error' : '')}
                         help={embedUrl && !urlValidation.isValid ? 'Invalid PowerBI URL format' : ''}
                       >
                         <Input 
                           placeholder="https://app.powerbi.com/view?r=... or https://app.powerbi.com/reportEmbed" 
                           onBlur={(e) => validateUrl(e.target.value, 'powerbi')}
                           onChange={() => {
                             form.validateFields(['embedUrl']);
                           }}
                         />
                       </Form.Item>

                       {/* Show URL type detection */}
                       {embedUrl && urlValidation.isValid && (
                         <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                           <Text className="text-blue-700">
                             {urlValidation.isPublic && "🔓 Detected: Public View URL (no authentication needed)"}
                             {urlValidation.isEmbed && "🔐 Detected: Embed URL (authentication required)"}
                           </Text>
                         </div>
                       )}

                       {/* Show fields based on URL type - only for embed URLs */}
                       {urlValidation.isEmbed && (
                         <>
                           <Form.Item
                             name="reportId"
                             label="Report ID"
                             rules={[{ required: true, message: 'Report ID is required for embed URLs' }]}
                             tooltip="Required for PowerBI embed URLs"
                           >
                             <Input placeholder="Enter PowerBI report ID (e.g., 12345678-1234-1234-1234-123456789012)" />
                           </Form.Item>

                           <Form.Item
                             name="accessToken"
                             label="Access Token"
                             rules={[{ required: true, message: 'Access Token is required for embed URLs' }]}
                             tooltip="Required for PowerBI embed authentication"
                           >
                             <Input.Password placeholder="Enter PowerBI access token" />
                           </Form.Item>
                         </>
                       )}

                       {urlValidation.isPublic && (
                         <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                           <Text className="text-green-700">
                             ✅ Public view URL detected - no additional configuration needed!
                           </Text>
                         </div>
                       )}
                     </>
                   );
                 }
                
                if (dashboardType === 'looker') {
                  const embedUrl = getFieldValue('embedUrl') || '';
                  
                  return (
                    <>
                      <Form.Item
                        name="embedUrl"
                        label="Looker Studio URL"
                        rules={[{ required: true, message: 'Please enter Looker Studio URL' }]}
                        tooltip="Enter your Looker Studio URL"
                        validateStatus={urlValidation.isValid ? 'success' : (embedUrl && !urlValidation.isValid ? 'error' : '')}
                        help={embedUrl && !urlValidation.isValid ? 'Invalid Looker Studio URL format' : ''}
                      >
                        <Input 
                          placeholder="https://lookerstudio.google.com/embed/reporting/... or https://lookerstudio.google.com/reporting/..." 
                          onBlur={(e) => validateUrl(e.target.value, 'looker')}
                          onChange={() => {
                            form.validateFields(['embedUrl']);
                          }}
                        />
                      </Form.Item>

                      {/* Show URL type detection */}
                      {embedUrl && urlValidation.isValid && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <Text className="text-blue-700">
                            📊 Detected: Looker Studio URL
                          </Text>
                        </div>
                      )}

                      {/* Show fields for Looker Studio */}
                      {urlValidation.isValid && (
                        <>
                          <Form.Item
                            name="reportId"
                            label="Report ID"
                            tooltip="Extract from your Looker Studio URL"
                          >
                            <Input placeholder="Enter Looker Studio report ID (optional - will extract from URL if not provided)" />
                          </Form.Item>

                          <Form.Item
                            name="pageId"
                            label="Page ID"
                            tooltip="Optional - specific page within the report"
                          >
                            <Input placeholder="Enter page ID (optional)" />
                          </Form.Item>
                        </>
                      )}
                    </>
                  );
                }
                
                return null;
              }}
            </Form.Item>

             {/* Common Configuration */}
             <Divider>Display Settings</Divider>
             
             <Form.Item label="Size Preset">
               <Space direction="vertical" style={{ width: '100%' }}>
                 <Space wrap>
                   <Button
                     type={sizePreset === 'full-width' ? 'primary' : 'default'}
                     icon={<ColumnWidthOutlined />}
                     onClick={() => {
                       setSizePreset('full-width');
                       form.setFieldsValue({ width: '100%', height: 'auto' });
                     }}
                   >
                     Full Width (100% × auto)
                   </Button>
                   <Button
                     type={sizePreset === 'full-height' ? 'primary' : 'default'}
                     icon={<ExpandOutlined />}
                     onClick={() => {
                       setSizePreset('full-height');
                       form.setFieldsValue({ width: 'auto', height: '100%' });
                     }}
                   >
                     Full Height (auto × 100%)
                   </Button>
                   <Button
                     type={sizePreset === 'custom' ? 'primary' : 'default'}
                     icon={<EditOutlined />}
                     onClick={() => setSizePreset('custom')}
                   >
                     Custom Size
                   </Button>
                 </Space>
                 
                 {sizePreset === 'custom' && (
                   <Row gutter={16}>
                     <Col span={12}>
                       <Form.Item
                         name="width"
                         label="Width"
                         rules={[{ required: true, message: 'Please enter width' }]}
                       >
                         <Input placeholder="100% or 800px" />
                       </Form.Item>
                     </Col>
                     <Col span={12}>
                       <Form.Item
                         name="height"
                         label="Height"
                         rules={[{ required: true, message: 'Please enter height' }]}
                       >
                         <Input placeholder="600px or 80vh" />
                       </Form.Item>
                     </Col>
                   </Row>
                 )}
               </Space>
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
