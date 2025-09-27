import { jsx as _jsx } from "react/jsx-runtime";
import * as Icons from '@ant-design/icons';
export const getIssueTypeIcon = (issueType) => {
    const style = { marginRight: 8 };
    switch (issueType) {
        case 'Task':
            return _jsx(Icons.CheckSquareOutlined, { style: { ...style, color: 'blue' } });
        case 'Bug':
            return _jsx(Icons.BugOutlined, { style: { ...style, color: 'red' } });
        case 'Story':
            return _jsx(Icons.BookOutlined, { style: { ...style, color: 'green' } });
        default:
            return null;
    }
};
export const getPriorityIcon = (priority) => {
    switch (priority) {
        case "high":
            return _jsx("span", { style: { color: "red", marginRight: 8, fontSize: 30 }, children: "\u25CF" });
        case "medium":
            return _jsx("span", { style: { color: "orange", marginRight: 8, fontSize: 30 }, children: "\u25CF" });
        case "low":
            return _jsx("span", { style: { color: "green", marginRight: 8, fontSize: 30 }, children: "\u25CF" });
        default:
            return null;
    }
};
