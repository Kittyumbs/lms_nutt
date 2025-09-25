import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Modal, Select, Button, Input, Space, Form, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { usePersonnel } from "../../hooks/usePersonnel";
const PersonnelSelectionModal = ({ isOpen, onClose, onSelectPersonnel, }) => {
    const { personnel, loading, error, addPersonnel } = usePersonnel();
    const [selectedPersonnel, setSelectedPersonnel] = useState(undefined);
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
        }
        catch (err) {
            message.error("Failed to add personnel.");
        }
    };
    const handleConfirmSelection = () => {
        if (selectedPersonnel) {
            onSelectPersonnel(selectedPersonnel);
            // onClose() is removed here. The parent component (KanbanBoard) will handle closing this modal
            // by setting activeModal to 'create', which implicitly closes the 'personnel' modal.
        }
        else {
            message.warning("Please select personnel.");
        }
    };
    return (_jsxs(Modal, { title: "Ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n?", open: isOpen, onCancel: onClose, footer: [
            _jsx(Button, { onClick: onClose, children: "Cancel" }, "cancel"),
            _jsx(Button, { type: "primary", onClick: handleConfirmSelection, disabled: !selectedPersonnel, children: "Select" }, "submit"),
        ], width: 400, children: [_jsxs(Form, { form: form, layout: "vertical", children: [_jsx(Form.Item, { label: "Ch\u1ECDn ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n", children: _jsx(Select, { placeholder: "Select personnel", loading: loading, value: selectedPersonnel, onChange: (value) => setSelectedPersonnel(value), options: personnel.map((p) => ({ value: p.name, label: p.name })), disabled: isAddingNew }) }), _jsx("div", { style: { textAlign: "center", margin: "10px 0" }, children: "Ho\u1EB7c" }), !isAddingNew ? (_jsx(Button, { type: "dashed", onClick: () => setIsAddingNew(true), block: true, icon: _jsx(PlusOutlined, {}), children: "Th\u00EAm ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n m\u1EDBi" })) : (_jsx(Form.Item, { label: "New Personnel Name", children: _jsxs(Space.Compact, { style: { width: "100%" }, children: [_jsx(Input, { placeholder: "Enter new personnel name", value: newPersonnelName, onChange: (e) => setNewPersonnelName(e.target.value) }), _jsx(Button, { type: "primary", onClick: handleAddPersonnel, children: "Add" }), _jsx(Button, { onClick: () => setIsAddingNew(false), children: "Cancel" })] }) }))] }), error && _jsx("div", { style: { color: "red", marginTop: 10 }, children: error })] }));
};
export default PersonnelSelectionModal;
