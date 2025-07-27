import React, { useState, useEffect } from "react";
import { Form, Input, Button, Select, message } from "antd";

const { Option } = Select;

const AddPackerForm = () => {
    const [form] = Form.useForm();
    const [wells, setWells] = useState([]); // Для хранения списка скважин без пакеров
    const [loading, setLoading] = useState(false);

    // Загрузка списка скважин без пакеров при монтировании компонента
    useEffect(() => {
        const fetchWells = async () => {
            try {
                const response = await fetch("/api/well/add/wellWithoutPacker"); // Новый эндпоинт
                if (!response.ok) {
                    throw new Error("Не удалось загрузить список скважин");
                }
                const data = await response.json();
                setWells(data.$values);
            } catch (error) {
                message.error(error.message);
            }
        };
        fetchWells();
    }, []);

    // Обработка отправки формы
    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await fetch("/api/paker/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error("Не удалось добавить пакер");
            }

            const result = await response.json();
            message.success(result.message);
            form.resetFields();
            window.location.reload();// Очистка формы после успешной отправки
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            <h2>Добавить новый пакер</h2>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                <Form.Item
                    label="Скважина"
                    name="IdWell"
                    rules={[{ required: true, message: "Пожалуйста, выберите скважину!" }]}
                >
                    <Select placeholder="Выберите скважину">
                        {wells.map((well) => (
                            <Option key={well.idWell} value={well.idWell}>
                                {well.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label="Глубина" name="Depth">
                    <Input type="number" />
                </Form.Item>

                <Form.Item label="Название" name="Name">
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Добавить пакер
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default AddPackerForm;