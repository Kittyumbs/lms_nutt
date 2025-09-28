import { Layout } from 'antd';
import KanbanBoard from '../../components/KanbanBoard';
import { PageSEO } from '../../utils/seo'; // Import PageSEO

const {  Content } = Layout;


function TaskManageHome() {
  return (
    <Layout className="h-screen select-none">
      <PageSEO title="TaskManage" description="Quản lý công việc, Kanban và đồng bộ Google Calendar." /> {/* Render PageSEO component */}
      <Content>
        <KanbanBoard />
      </Content>
    </Layout>
  );
}

export default TaskManageHome;
