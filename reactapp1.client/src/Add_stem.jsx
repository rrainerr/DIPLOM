import React, { useState, useEffect } from "react";
import { Form, Input, Select, Button, message } from "antd";

const { Option } = Select;

const AddStemForm = () => {
    const [form] = Form.useForm();
    const [wells, setWells] = useState([]); 
    const [horizonts, setHorizonts] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [showPiercingDepth, setShowPiercingDepth] = useState(false); 

 
    useEffect(() => {
        const fetchData = async () => {
            try {
         
                const wellsResponse = await fetch("/api/well/add");
                if (!wellsResponse.ok) throw new Error("Не удалось загрузить список скважин");
                const wellsData = await wellsResponse.json();
                setWells(wellsData.$values || wellsData);

             

            } catch (error) {
                message.error(error.message);
            }
        };
        fetchData();
    }, []);

    const handleWellChange = async (wellId) => {
        try {
            const response = await fetch(`/api/horizont/stem?wellId=${wellId}`);
            if (!response.ok) throw new Error("Не удалось загрузить список пластов");
            const data = await response.json();
            setHorizonts(data.$values || data);
        } catch (error) {
            message.error(error.message);
        }
    };


    const handleStemTypeChange = (value) => {
        setShowPiercingDepth(value === 1); 
    };

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await fetch("/api/stem/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error("Не удалось добавить ствол");
            }

            const result = await response.json();
            console.log("Ствол добавлен:", result);
            message.success(result.message);

            if (values.IdTypeStems === 1 && values.PiercingDepth) {
                const pointResponse = await fetch(`/api/stem/${result.stemId}/point`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ Depth: values.PiercingDepth }),
                });

                if (!pointResponse.ok) {
                    const errorResponse = await pointResponse.json();
                    console.error("Ошибка сервера:", errorResponse);
                    throw new Error("Не удалось добавить точку врезки");
                }

                const pointResult = await pointResponse.json();
                console.log("Точка врезки добавлена:", pointResult);
                message.success(pointResult.message);
            }

            form.resetFields();
            setShowPiercingDepth(false); 
        } catch (error) {
            console.error("Ошибка:", error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            <h2>Добавить новый ствол</h2>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    label="Скважина"
                    name="IdWell"
                    rules={[{ required: true, message: "Пожалуйста, выберите скважину!" }]}
                >
                    <Select
                        placeholder="Выберите скважину"
                        onChange={handleWellChange}
                    >
                        {wells.map((well) => (
                            <Option key={well.idWell} value={well.idWell}>
                                {well.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label="Пласт" name="IdHorizont">
                    <Select placeholder="Выберите пласт">
                        {horizonts.map((horizont) => (
                            <Option key={horizont.idHorizont} value={horizont.idHorizont}>
                                {horizont.name}
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

                <Form.Item label="Тип ствола" name="IdTypeStems">
                    <Select onChange={handleStemTypeChange}>
                        <Option value={3}>Верхний</Option>
                        <Option value={2}>Основной</Option>
                        <Option value={1}>Врезаный</Option>
                    </Select>
                </Form.Item>

                {/* Дополнительное поле для глубины точки врезки */}
                {showPiercingDepth && (
                    <Form.Item label="Глубина точки врезки" name="PiercingDepth">
                        <Input type="number" />
                    </Form.Item>
                )}

                <Form.Item label="Работа" name="Work">
                    <Select>
                        <Option value={0}>Неактивен</Option>
                        <Option value={1}>Активен</Option>
                    </Select>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Добавить ствол
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default AddStemForm;