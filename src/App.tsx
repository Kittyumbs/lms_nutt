import { Layout } from 'antd';
import KanbanBoard from './components/KanbanBoard';
import { HomeSEO } from './seo'; // Import HomeSEO

const {  Content } = Layout;


function App() {
  return (
    <Layout className="h-screen select-none">
      <HomeSEO /> {/* Render HomeSEO component */}
      <Content>
        <KanbanBoard />
      </Content>
    </Layout>
  );
}

export default App;
