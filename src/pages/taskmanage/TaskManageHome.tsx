import { Layout } from 'antd';
import KanbanBoard from '../../components/KanbanBoard';
import { HomeSEO } from '../../utils/seo'; // Import HomeSEO

const {  Content } = Layout;


function TaskManageHome() {
  return (
    <Layout className="h-screen select-none">
      <HomeSEO /> {/* Render HomeSEO component */}
      <Content>
        <KanbanBoard />
      </Content>
    </Layout>
  );
}

export default TaskManageHome;
