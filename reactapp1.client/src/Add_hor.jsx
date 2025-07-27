import React, { useState, useEffect } from "react";
import { Form, Input, Select, Button, message, Typography } from "antd";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { Title } = Typography;

const AddHorizontForm = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [fields, setFields] = useState([]); // Для хранения списка полей (Field)
    const [loading, setLoading] = useState(false);
    const [wells, setWells] = useState([]);  // For wells data

    // Загрузка списка полей (Field) при монтировании компонента
    useEffect(() => {
        const fetchFields = async () => {
            try {
                const response = await fetch("/api/field", {
                    method: "GET",
                    headers: {
                        "accept": "*/*"
                    }
                });

                if (!response.ok) {
                    throw new Error("Не удалось загрузить список полей");
                }

                const data = await response.json();
                setFields(data.$values); // Используем data.$values для доступа к массиву полей
            } catch (error) {
                message.error(error.message);
            }
        };
        fetchFields();
    }, []);
    useEffect(() => {
        const fetchWells = async () => {
            try {
                const response = await fetch("/api/well/add", {
                    method: "GET",
                    headers: {
                        "accept": "*/*"
                    }
                });

                if (!response.ok) {
                    throw new Error("Не удалось загрузить список скважин");
                }

                const data = await response.json();
                setWells(data.$values); // Store wells data in the wells state
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
            const response = await fetch("/api/horizont/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "accept": "*/*"
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error("Не удалось добавить пласт");
            }

            const result = await response.json();
            message.success(result.message);
            form.resetFields(); // Очистка формы после успешной отправки
            navigate("/Table_hor"); // Перенаправление на страницу со списком пластов
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            <Title level={2}>Добавить новый пласт</Title>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    Lithology: 0,
                    Saturation: 0,
                    Collector: 0,
                }}
            >
                <Form.Item
                    label="Поле"
                    name="IdField"
                    rules={[{ required: true, message: "Пожалуйста, выберите поле!" }]}
                >
                    <Select placeholder="Выберите поле">
                        {fields.map((field) => (
                            <Option key={field.idField} value={field.idField}>
                                {field.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
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

                <Form.Item label="Кровля, м" name="Roof">
                    <Input type="number" />
                </Form.Item>

                <Form.Item label="Подошва, м" name="Sole">
                    <Input type="number" />
                </Form.Item>

                <Form.Item label="Название" name="Name">
                    <Input />
                </Form.Item>

                <Form.Item label="Пористость, д.ед." name="Porosity">
                    <Input type="number" />
                </Form.Item>
                <Form.Item label="Толщина, м" name="Thickness">
                    <Input type="number" />
                </Form.Item>
                <Form.Item label="Вязкость флюида, сПз" name="Viscosity">
                    <Input type="number" />
                </Form.Item>
                <Form.Item label="Проницаемость, мД" name="Permeability">
                    <Input type="number" />
                </Form.Item>
            

                <Form.Item label="Состояние пласта" name="SostPl">
                    <Select>
                        <Option value={0}>-</Option>
                        <Option value={1}>Пласт открыт</Option>
                        <Option value={2}>Пласт перекрыт</Option>
                        <Option value={3}>Пласт частично перекрыт</Option>
                    </Select>
                </Form.Item>

             

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Добавить пласт
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default AddHorizontForm;