import React, { useState, useEffect } from "react";
import { Modal, Select, Button, Input, Space, Form, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { usePersonnel } from "../../hooks/usePersonnel";

interface PersonnelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersonnel: (personnelName: string) => void;
}

const PersonnelSelectionModal: React.FC<PersonnelSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectPersonnel,
}) => {
  const { personnel, loading, error, addPersonnel } = usePersonnel();
  const [selectedPersonnel, setSelectedPersonnel] = useState<string | undefined>(undefined);
  const [newPersonnelName, setNewPersonnelName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      setSelectedPersonnel(undefined);
      setNewPersonnelName("");
      setIsAddingNew(false);
      form.resetFields();
    }
  }, [isOpen, form]);

  const handleAddPersonnel = async () => {
    if (!newPersonnelName.trim()) {
      message.error("Personnel name cannot be empty.");
      return;
    }
    try {
      await addPersonnel(newPersonnelName.trim());
      message.success(`Personnel "${newPersonnelName.trim()}" added.`);
      setNewPersonnelName("");
      setIsAddingNew(false);
    } catch (err) {
      message.error("Failed to add personnel.");
    }
  };

  const handleConfirmSelection = () => {
    if (selectedPersonnel) {
      onSelectPersonnel(selectedPersonnel);
      // onClose() is removed here. The parent component (KanbanBoard) will handle closing this modal
      // by setting activeModal to 'create', which implicitly closes the 'personnel' modal.
    } else {
      message.warning("Please select personnel.");
    }
  };

  return (
    <Modal
      title="Người thực hiện?"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleConfirmSelection}
          disabled={!selectedPersonnel}
        >
          Select
        </Button>,
      ]}
      width={400}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Chọn người thực hiện">
          <Select
            placeholder="Select personnel"
            loading={loading}
            value={selectedPersonnel}
            onChange={(value) => setSelectedPersonnel(value)}
            options={personnel.map((p) => ({ value: p.name, label: p.name }))}
            disabled={isAddingNew}
          />
        </Form.Item>

        <div style={{ textAlign: "center", margin: "10px 0" }}>Hoặc</div>

        {!isAddingNew ? (
          <Button
            type="dashed"
            onClick={() => setIsAddingNew(true)}
            block
            icon={<PlusOutlined />}
          >
            Thêm người thực hiện mới
          </Button>
        ) : (
          <Form.Item label="New Personnel Name">
            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="Enter new personnel name"
                value={newPersonnelName}
                onChange={(e) => setNewPersonnelName(e.target.value)}
              />
              <Button type="primary" onClick={handleAddPersonnel}>
                Add
              </Button>
              <Button onClick={() => setIsAddingNew(false)}>
                Cancel
              </Button>
            </Space.Compact>
          </Form.Item>
        )}
      </Form>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
    </Modal>
  );
};

export default PersonnelSelectionModal;
