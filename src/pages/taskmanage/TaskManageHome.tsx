import { Layout } from 'antd';

import KanbanBoard from '../../components/KanbanBoard';
import { PageSEO } from '../../utils/seo'; // Import PageSEO

const {  Content } = Layout;


function TaskManageHome() {
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
