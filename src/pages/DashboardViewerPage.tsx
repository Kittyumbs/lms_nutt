import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Spin, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

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
  // Removed fullscreen state - BI has built-in fullscreen

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

  // Removed fullscreen handler - BI has built-in fullscreen

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-2">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 rounded-lg mb-4">
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
                <Title level={4} className="mb-0">
                  {dashboard.name}
                </Title>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Fullscreen button removed - BI has built-in fullscreen */}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div 
          style={{ 
            width: dashboard.width, 
            height: dashboard.height,
            margin: '0 auto'
          }}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            title={dashboard.name}
            style={{ borderRadius: '8px' }}
          />
        </div>

        {/* Footer Info removed to save space for dashboard */}
      </div>
    </div>
  );
};

export default DashboardViewerPage;
