import { GoogleOutlined } from '@ant-design/icons';
import { Button, Result, Spin } from 'antd';
import React from 'react';

import useAuth from './useAuth';
import useRole from './useRole';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Result
        status="403"
        title="Authentication Required"
        subTitle="Please sign in to access this page."
        extra={
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            onClick={signInWithGoogle}
            size="large"
          >
            Sign in with Google
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export const RequireInstructor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loadingRole } = useRole();

  if (loadingRole) {
    return (
      <div className="flex justify-center items-center h-16">
        <Spin size="small" />
      </div>
    );
  }

  if (role !== 'instructor' && role !== 'admin') {
    return null; // Hide UI for non-instructors
  }

  return <>{children}</>;
};
