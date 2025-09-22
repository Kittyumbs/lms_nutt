import { Layout } from 'antd';
import KanbanBoard from './components/KanbanBoard';

const {  Content } = Layout;


function App() {
  return (
    <Layout className="h-screen select-none">
      <Content>
        <KanbanBoard />
      </Content>
    </Layout>
  );
}

export default App;
