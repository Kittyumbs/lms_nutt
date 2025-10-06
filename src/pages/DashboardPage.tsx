import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Input, Form, Modal, Tabs, message, Space, Divider, Typography, Row, Col, Spin } from 'antd';
import { PlusOutlined, SettingOutlined, EyeOutlined, DeleteOutlined, ColumnWidthOutlined, EditOutlined, ColumnHeightOutlined, BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useIframeHeight } from '../hooks/useIframeHeight';
import { useDashboards, DashboardConfig } from '../hooks/useDashboards';
import { useDashboardDimensions } from '../hooks/useDashboardDimensions';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

// DashboardConfig interface moved to useDashboards hook

const DashboardPage: React.FC = () => {
  const [form] = Form.useForm();
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<DashboardConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'powerbi' | 'looker'>('powerbi');
  const [sizePreset, setSizePreset] = useState<'max-width' | 'max-height' | 'custom'>('max-width');
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    isPublic: boolean;
    isEmbed: boolean;
  }>({ isValid: false, isPublic: false, isEmbed: false });
  const [detectedHeight, setDetectedHeight] = useState<number | null>(null);
  const [detectedWidth, setDetectedWidth] = useState<number | null>(null);
  const navigate = useNavigate();
  
  // Use Firestore hook
  const { 
    dashboards, 
    loading: dashboardsLoading, 
    error: dashboardsError,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    getDashboardsByType
  } = useDashboards();

  // Dashboards are now loaded from Firestore via useDashboards hook

  // Watch form values for height detection
  const formValues = Form.useWatch([], form);
  const embedUrl = formValues?.embedUrl;
  const formWidth = formValues?.width;
  const formHeight = formValues?.height;

  // Use dashboard dimensions detection hook
  const { 
    isDetecting: isDetectingDimensions, 
    detectedDimensions, 
    detectDimensions,
    calculateProportionalDimensions 
  } = useDashboardDimensions({
    url: embedUrl,
    onDimensionsDetected: (dimensions) => {
      console.log('📏 Dimensions detected:', dimensions);
    }
  });

  const handleAddDashboard = (type?: 'powerbi' | 'looker') => {
    setEditingDashboard(null);
    form.resetFields();
    setSizePreset('max-width');
    setUrlValidation({ isValid: false, isPublic: false, isEmbed: false });
    setDetectedHeight(null);
    setDetectedWidth(null);
    if (type) {
      form.setFieldsValue({ type });
    }
    // Set default values for new dashboard
    form.setFieldsValue({ width: '100%', height: 'auto' });
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
        setSizePreset('max-width');
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
    if (dashboard.width === '100%' && dashboard.height.includes('px')) {
      setSizePreset('max-width');
    } else if (dashboard.width.includes('px') && dashboard.height === '100vh') {
      setSizePreset('max-height');
    } else {
      setSizePreset('custom');
    }
    
    setIsConfigModalVisible(true);
  };

  const handleDeleteDashboard = (id: string) => {
    Modal.confirm({
      title: 'Delete Dashboard',
      content: 'Are you sure you want to delete this dashboard configuration?',
      onOk: async () => {
        try {
          await deleteDashboard(id);
          message.success('Dashboard deleted successfully');
        } catch (error) {
          console.error('Error deleting dashboard:', error);
          message.error('Failed to delete dashboard');
        }
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
      
      // Set dimensions based on preset
      let width, height;
      
      console.log('Size preset:', sizePreset);
      console.log('Form values:', { width: values.width, height: values.height });
      console.log('Detected dimensions:', detectedDimensions);
      
      if (sizePreset === 'max-width') {
        width = '100%';
        if (detectedDimensions) {
          // Calculate proportional height based on detected dimensions
          const calculated = calculateProportionalDimensions(detectedDimensions, window.innerWidth - 100); // Account for padding
          height = `${calculated.height}px`;
          console.log('📏 Max width - calculated height:', calculated.height);
        } else {
          height = '600px'; // Fallback
        }
      } else if (sizePreset === 'max-height') {
        height = '100vh';
        if (detectedDimensions) {
          // Calculate proportional width based on detected dimensions
          const calculated = calculateProportionalDimensions(detectedDimensions, undefined, window.innerHeight - 200); // Account for header/padding
          width = `${calculated.width}px`;
          console.log('📏 Max height - calculated width:', calculated.width);
        } else {
          width = '800px'; // Fallback
        }
      } else if (sizePreset === 'custom') {
        // Use form values for custom size
        width = values.width || '100%';
        height = values.height || '600px';
      } else {
        // Default fallback
        width = '100%';
        height = '600px';
      }
      
      console.log('Final dimensions:', { width, height });
      
      const newDashboard = {
        name: values.name,
        type: values.type,
        embedUrl: values.embedUrl,
        width: width,
        height: height,
        isActive: true,
        // Only include optional fields if they have values
        ...(values.accessToken && { accessToken: values.accessToken }),
        ...(values.reportId && { reportId: values.reportId }),
        ...(values.pageId && { pageId: values.pageId }),
        ...(values.filters && { filters: values.filters }),
      };

      if (editingDashboard) {
        await updateDashboard(editingDashboard.id, newDashboard);
        message.success('Dashboard updated successfully');
      } else {
        // Check limits
        const currentCount = dashboards.filter(d => d.type === newDashboard.type).length;
        const maxCount = 3;
        
        if (currentCount >= maxCount) {
          message.error(`Maximum ${maxCount} ${newDashboard.type} dashboards allowed`);
          return;
        }
        
        await addDashboard(newDashboard);
        message.success('Dashboard added successfully');
      }

      setIsConfigModalVisible(false);
      form.resetFields();
      setSizePreset('max-width');
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


  const powerbiDashboards = getDashboardsByType('powerbi');
  const lookerDashboards = getDashboardsByType('looker');

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
                         <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex flex-col items-center justify-center border border-blue-200">
                           <BarChartOutlined className="text-4xl text-blue-600 mb-2" />
                           <Text className="text-blue-700 font-medium">PowerBI Dashboard</Text>
                           <Text type="secondary" className="text-xs">Interactive Reports</Text>
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
                         <div className="w-full h-32 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg flex flex-col items-center justify-center border border-green-200">
                           <LineChartOutlined className="text-4xl text-green-600 mb-2" />
                           <Text className="text-green-700 font-medium">Looker Studio</Text>
                           <Text type="secondary" className="text-xs">Data Visualization</Text>
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
                     type={sizePreset === 'max-width' ? 'primary' : 'default'}
                     icon={<ColumnWidthOutlined />}
                     onClick={async () => {
                       console.log('Setting max-width preset');
                       setSizePreset('max-width');
                       form.setFieldsValue({ width: '100%', height: 'auto' });
                       
                       // Detect dimensions if URL is available
                       if (embedUrl) {
                         await detectDimensions();
                       }
                     }}
                   >
                     Max Width + Height Auto
                   </Button>
                   <Button
                     type={sizePreset === 'max-height' ? 'primary' : 'default'}
                     icon={<ColumnHeightOutlined />}
                     onClick={async () => {
                       console.log('Setting max-height preset');
                       setSizePreset('max-height');
                       form.setFieldsValue({ width: 'auto', height: '100vh' });
                       
                       // Detect dimensions if URL is available
                       if (embedUrl) {
                         await detectDimensions();
                       }
                     }}
                   >
                     Max Height + Width Auto
                   </Button>
                   <Button
                     type={sizePreset === 'custom' ? 'primary' : 'default'}
                     icon={<EditOutlined />}
                     onClick={() => setSizePreset('custom')}
                   >
                     Custom Size (px)
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
                         <Input placeholder="600px or 80vh or auto" />
                       </Form.Item>
                     </Col>
                   </Row>
                 )}
                 
                 {/* Dimension Detection Status */}
                 {(sizePreset === 'max-width' || sizePreset === 'max-height') && embedUrl && (
                   <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                     {isDetectingDimensions ? (
                       <Space>
                         <Spin size="small" />
                         <Text className="text-blue-700">Detecting dashboard dimensions...</Text>
                       </Space>
                     ) : detectedDimensions ? (
                       <Text className="text-blue-700">
                         ✅ Detected: <strong>{detectedDimensions.width}px × {detectedDimensions.height}px</strong>
                         {sizePreset === 'max-width' && (
                           <span> → Will calculate proportional height for 100% width</span>
                         )}
                         {sizePreset === 'max-height' && (
                           <span> → Will calculate proportional width for 100vh height</span>
                         )}
                       </Text>
                     ) : (
                       <Text className="text-blue-700">
                         ℹ️ Dimension detection in progress... Will use fallback values
                       </Text>
                     )}
                   </div>
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
