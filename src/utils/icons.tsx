import * as Icons from '@ant-design/icons';
import type { IssueType } from '../types/kanban';

export const getIssueTypeIcon = (issueType: IssueType) => {
  const style = { marginRight: 8 };
  
  switch (issueType) {
    case 'Task':
      return <Icons.CheckSquareOutlined style={{ ...style, color: 'blue' }} />;
    case 'Bug':
      return <Icons.BugOutlined style={{ ...style, color: 'red' }} />;
    case 'Story':
      return <Icons.BookOutlined style={{ ...style, color: 'green' }} />;
    default:
      return null;
  }
};

export const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "high":
      return <span style={{ color: "red", marginRight: 8, fontSize: 30 }}>●</span>;
    case "medium":
      return <span style={{ color: "orange", marginRight: 8, fontSize: 30 }}>●</span>;
    case "low":
      return <span style={{ color: "green", marginRight: 8, fontSize: 30 }}>●</span>;
    default:
      return null;
  }
};