import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Spin, Alert, Select, Space } from 'antd';
import { ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons';
import { useDashboards, DashboardConfig } from '../hooks/useDashboards';

const { Title, Text } = Typography;

// DashboardConfig interface moved to useDashboards hook

const DashboardViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use Firestore hook
  const { dashboards: allDashboards, loading, error: dashboardsError } = useDashboards();
  // Removed fullscreen state - BI has built-in fullscreen

  useEffect(() => {
    if (!id) {
      setError('Dashboard ID not found');
      return;
    }

    if (loading) return;

    // Find dashboard from Firestore data
    const foundDashboard = allDashboards.find(d => d.id === id);
    if (foundDashboard) {
      setDashboard(foundDashboard);
      // Save current dashboard to localStorage for sidebar redirect
      localStorage.setItem('last-viewed-dashboard', id);
      console.log('💾 Saved last viewed dashboard:', id);
      console.log('📊 Loaded dashboards:', allDashboards.length, allDashboards.map(d => d.name));
    } else {
      setError('Dashboard not found');
    }
  }, [id, allDashboards, loading]);

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

  const handleDashboardSwitch = (newDashboardId: string) => {
    console.log('🔄 Switching to dashboard:', newDashboardId);
    navigate(`/lms/dashboard/view/${newDashboardId}`);
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
  
  console.log('Dashboard config:', dashboard);
  console.log('Dashboard dimensions:', { width: dashboard.width, height: dashboard.height });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-2">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 rounded-lg mb-4">
          <div className="flex items-center space-x-4">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleGoBack}
              className="flex items-center"
            >
              Back
            </Button>
            
            {/* Dashboard Switch Button - Next to Back button */}
            {allDashboards.length > 1 && (
              <div className="flex items-center space-x-2 flex-1">
                <Text className="text-gray-600 whitespace-nowrap">Switch Dashboard:</Text>
                <Select
                  value={dashboard?.id}
                  onChange={handleDashboardSwitch}
                  style={{ width: '100%' }}
                  suffixIcon={<SwapOutlined />}
                  options={allDashboards.map(d => ({
                    value: d.id,
                    label: d.name
                  }))}
                />
              </div>
            )}
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
