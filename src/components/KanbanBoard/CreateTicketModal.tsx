import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Space, DatePicker } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getIssueTypeIcon, getPriorityIcon } from "../../utils/icons";
import dayjs from "dayjs";
import { IssueType } from "../../types/kanban"; // Import IssueType from global definition

export interface TicketFormData {
  title: string;
  description: string;
  priority: string;
  issueType: IssueType; // Use the imported IssueType
  urls: { url: string }[];
  deadline?: Date;
}

interface CreateTicketModalProps {
  mode: "create" | "edit";
  isOpen: boolean;
  onClose: () => void;
  onCreateTicket?: (ticket: TicketFormData) => void;
  onUpdateTicket?: (ticket: TicketFormData) => void;
  initialData?: TicketFormData | null;
  loading?: boolean;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  mode,
  isOpen,
  onClose,
  onCreateTicket,
  onUpdateTicket,
  initialData = null,
  loading = false,
}) => {
  const [form] = Form.useForm<TicketFormData>();
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createUrls, setCreateUrls] = useState<{ url: string }[]>([]);
  const [createUrlInput, setCreateUrlInput] = useState("");
  const [editUrls, setEditUrls] = useState<{ url: string }[]>([]);
  const [editUrlInput, setEditUrlInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    form.resetFields();
    setHasChanges(false);
    if (mode === "edit" && initialData) {
      setEditUrls(Array.isArray(initialData.urls) ? initialData.urls : []);
      setEditUrlInput("");
    } else if (mode === "create") {
      setCreateUrls([]);
      setCreateUrlInput("");
    }
  }, [isOpen, mode, initialData, form]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      const formattedValues: TicketFormData = {
        ...values,
        urls: mode === "edit" ? editUrls : createUrls,
        deadline: values.deadline
          ? dayjs(values.deadline).toDate()
          : undefined,
      };
      if (mode === "edit") {
        onUpdateTicket?.(formattedValues);
      } else {
        onCreateTicket?.(formattedValues);
      }
      form.resetFields();
      onClose();
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    Modal.confirm({
      title: "Confirm close",
      content: "Unsaved changes will be lost",
      okText: "Close",
      cancelText: "Cancel",
      onOk: () => onClose(),
    });
  };

  return (
    <Modal
      title={mode === "edit" ? `Edit Ticket` : "Create New Ticket"}
      open={isOpen}
      onCancel={handleCloseModal}
      footer={[
        <Button key="cancel" onClick={handleCloseModal}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={isSubmitting || loading}
          disabled={isSubmitting || loading}
        >
          {mode === "edit" ? "Update" : "Create"}
        </Button>,
      ]}
      width={600}
    >
      <Form
        key={isOpen + mode + (initialData?.title || "") + (initialData?.urls?.map(u => u.url).join(",") || "")}
        form={form}
        layout="vertical"
        initialValues={
          mode === "edit" && initialData
            ? {
                ...initialData,
                urls: Array.isArray(initialData.urls) && initialData.urls.length > 0
                  ? initialData.urls
                  : [{ url: "" }],
                deadline: initialData.deadline ? dayjs(initialData.deadline) : undefined,
              }
            : { urls: [{ url: "" }] }
        }
        onValuesChange={() => setHasChanges(true)}
      >
        <Form.Item
          name="title"
          label="Summary"
          rules={[{ required: true, message: "Please enter the ticket summary!" }]}
        >
          <Input placeholder="Enter ticket summary" />
        </Form.Item>

        <Form.Item
          name="issueType"
          label="Issue Type"
          rules={[{ required: true, message: "Please select the issue type!" }]}
        >
          <Select>
            <Select.Option value="Task">
              <Space>{getIssueTypeIcon("Task")}Task</Space>
            </Select.Option>
            <Select.Option value="Bug">
              <Space>{getIssueTypeIcon("Bug")}Bug</Space>
            </Select.Option>
            <Select.Option value="Story">
              <Space>{getIssueTypeIcon("Story")}Story</Space>
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true, message: "Please select the priority!" }]}
        >
          <Select>
            <Select.Option value="low">
              <Space>{getPriorityIcon("low")}Low</Space>
            </Select.Option>
            <Select.Option value="medium">
              <Space>{getPriorityIcon("medium")}Medium</Space>
            </Select.Option>
            <Select.Option value="high">
              <Space>{getPriorityIcon("high")}High</Space>
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="deadline"
          label="Deadline"
          rules={[{ required: true, message: "Please select the deadline!" }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            getPopupContainer={(trigger) => trigger.parentElement!}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { required: true, message: "Please enter the ticket description!" },
          ]}
        >
          <Input.TextArea
            placeholder="Enter ticket description"
            autoSize={{ minRows: 4, maxRows: 6 }}
          />
        </Form.Item>

        {mode === "create" ? (
          <>
            {createUrls.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Added URLs:</div>
                <div className="flex flex-col gap-1">
                  {createUrls.map((u, idx) => {
                    let isUrl = false;
                    try {
                      isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                    } catch {
                      isUrl = false;
                    }
                    return (
                      <div key={idx} className="flex items-center">
                        {isUrl ? (
                          <a
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {new URL(u.url).hostname}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-700">{u.url}</span>
                        )}
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          style={{ marginLeft: 8, background: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' }}
                          onClick={() => setCreateUrls(urls => urls.filter((_, i) => i !== idx))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <Form.Item label="Add new URL">
              <Input.Search
                placeholder="Enter a link or any text"
                enterButton="Add"
                value={createUrlInput}
                onChange={e => setCreateUrlInput(e.target.value)}
                onSearch={value => {
                  if (!value) return;
                  setCreateUrls(urls => [...urls, { url: value }]);
                  setCreateUrlInput("");
                }}
              />
            </Form.Item>
          </>
        ) : (
          <>
            {editUrls.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Saved URLs:</div>
                <div className="flex flex-col gap-1">
                  {editUrls.map((u, idx) => {
                    let isUrl = false;
                    try {
                      isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                    } catch {
                      isUrl = false;
                    }
                    return (
                      <div key={idx} className="flex items-center">
                        {isUrl ? (
                          <a
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {new URL(u.url).hostname}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-700">{u.url}</span>
                        )}
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          style={{ marginLeft: 8, background: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' }}
                          onClick={() => setEditUrls(urls => urls.filter((_, i) => i !== idx))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <Form.Item label="Add new URL">
              <Input.Search
                placeholder="Enter a link or any text"
                enterButton="Add"
                value={editUrlInput}
                onChange={e => setEditUrlInput(e.target.value)}
                onSearch={value => {
                  if (!value) return;
                  setEditUrls(urls => [...urls, { url: value }]);
                  setEditUrlInput("");
                }}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default CreateTicketModal;
