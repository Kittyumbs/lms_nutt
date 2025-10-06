import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, FullscreenOutlined } from '@ant-design/icons';

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

const DashboardViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Dashboard ID not found');
      setLoading(false);
      return;
    }

    // Load dashboard from localStorage
    const savedDashboards = localStorage.getItem('dashboard-configs');
    if (savedDashboards) {
      try {
        const dashboards: DashboardConfig[] = JSON.parse(savedDashboards);
        const foundDashboard = dashboards.find(d => d.id === id);
        
        if (foundDashboard) {
          setDashboard(foundDashboard);
        } else {
          setError('Dashboard not found');
        }
      } catch (error) {
        setError('Failed to load dashboard configuration');
      }
    } else {
      setError('No dashboard configurations found');
    }
    
    setLoading(false);
  }, [id]);

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

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleGoBack = () => {
    navigate('/lms/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert
            message="Error"
            description={error || 'Dashboard not found'}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleGoBack}>
                Go Back
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(dashboard);

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className={`${isFullscreen ? 'h-full' : 'max-w-7xl mx-auto p-6'}`}>
        {/* Header */}
        <div className={`bg-white shadow-sm ${isFullscreen ? 'p-4' : 'p-6 rounded-lg mb-6'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleGoBack}
                className="flex items-center"
              >
                Back
              </Button>
              <div>
                <Title level={3} className="mb-0">
                  {dashboard.name}
                </Title>
                <Text type="secondary">
                  {dashboard.type === 'powerbi' ? 'PowerBI Dashboard' : 'Looker Studio Dashboard'}
                </Text>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                icon={<FullscreenOutlined />} 
                onClick={handleFullscreen}
                type={isFullscreen ? 'primary' : 'default'}
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className={`bg-white ${isFullscreen ? 'h-full' : 'rounded-lg shadow-sm'}`}>
          <div 
            className={`${isFullscreen ? 'h-full' : 'p-6'}`}
            style={{ 
              width: dashboard.width, 
              height: isFullscreen ? '100%' : dashboard.height,
              margin: isFullscreen ? '0' : '0 auto'
            }}
          >
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title={dashboard.name}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* Footer Info */}
        {!isFullscreen && (
          <div className="mt-4 text-center">
            <Text type="secondary" className="text-sm">
              Dashboard URL: {embedUrl}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardViewerPage;
