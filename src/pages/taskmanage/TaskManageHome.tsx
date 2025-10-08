import { Layout, Button } from 'antd';

import useAuth from '../../auth/useAuth';
import KanbanBoard from '../../components/KanbanBoard';
import { PageSEO } from '../../utils/seo'; // Import PageSEO

const {  Content } = Layout;


function TaskManageHome() {
  const { user, signInWithGoogle } = useAuth();

  // Authentication guard
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access task management</p>
          <Button type="primary" size="large" onClick={signInWithGoogle}>
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout className="h-screen select-none">
      <PageSEO title="Home" description="Task management, Kanban board and Google Calendar sync." /> {/* Render PageSEO component */}
      <Content>
        <KanbanBoard />
      </Content>
    </Layout>
  );
}

export default TaskManageHome;
