import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Layout } from 'antd';
import KanbanBoard from '../../components/KanbanBoard';
import { HomeSEO } from '../../utils/seo'; // Import HomeSEO
const { Content } = Layout;
function TaskManageHome() {
    return (_jsxs(Layout, { className: "h-screen select-none", children: [_jsx(HomeSEO, {}), " ", _jsx(Content, { children: _jsx(KanbanBoard, {}) })] }));
}
export default TaskManageHome;
