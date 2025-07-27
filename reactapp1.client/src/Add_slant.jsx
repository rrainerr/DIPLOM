import React, { useState, useEffect } from "react";
import { Form, Input, Select, Button, Table, message, Divider } from "antd";

const { Option } = Select;

const AddWellSlantForm = () => {
    const [form] = Form.useForm();
    const [wells, setWells] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [slantData, setSlantData] = useState([]);
    const [totalDepth, setTotalDepth] = useState(0);

    // Загрузка списка скважин
    useEffect(() => {
        const fetchWells = async () => {
            try {
                const response = await fetch("/api/well/list"); // Новый эндпоинт
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

    // Обработка изменения глубины
    const handleDepthChange = (e) => {
        const depth = parseFloat(e.target.value);
        if (isNaN(depth) || depth <= 0) {
            setShowTable(false);
            return;
        }

        setTotalDepth(depth);
        generateSlantTable(depth);
        setShowTable(true);
    };

    // Генерация таблицы с интервалами по 20 метров
    const generateSlantTable = (depth) => {
        const rows = [];
        const interval = 20;
        const count = Math.ceil(depth / interval);

        for (let i = 0; i < count; i++) {
            const startDepth = i * interval;
            const endDepth = Math.min((i + 1) * interval, depth);
            const midDepth = (startDepth + endDepth) / 2;

            rows.push({
                key: i,
                height: midDepth,
                slant: 0,
                azimuth: 0
            });
        }

        setSlantData(rows);
    };

    // Обработка изменения данных в таблице
    const handleTableChange = (index, field, value) => {
        const newData = [...slantData];
        newData[index] = {
            ...newData[index],
            [field]: parseFloat(value) || 0
        };
        setSlantData(newData);
    };

    // Обработка отправки формы
    const onFinish = async (values) => {
        if (slantData.length === 0) {
            message.error("Пожалуйста, укажите глубину и сгенерируйте таблицу");
            return;
        }

        setLoading(true);
        try {
            // Подготовка данных для отправки
            const payload = slantData.map(item => ({
                IdWell: values.IdWell,
                Height: item.height,
                Slant: item.slant,
                Azimuth: item.azimuth
            }));

            // Отправка данных на сервер
            const response = await fetch("/api/well/wellslant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Не удалось добавить данные искривления");
            }

            const result = await response.json();
            message.success("Данные искривления успешно добавлены");
            form.resetFields();
            setShowTable(false);
            setSlantData([]);
        } catch (error) {
            console.error("Ошибка:", error);
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Колонки таблицы
    const columns = [
        {
            title: 'Глубина (м)',
            dataIndex: 'height',
            key: 'height',
            render: (text) => text.toFixed(1)
        },
        {
            title: 'Искривление (°)',
            dataIndex: 'slant',
            key: 'slant',
            render: (text, record, index) => (
                <Input
                    type="number"
                    value={text}
                    onChange={(e) => handleTableChange(index, 'slant', e.target.value)}
                />
            )
        },
        {
            title: 'Азимут (°)',
            dataIndex: 'azimuth',
            key: 'azimuth',
            render: (text, record, index) => (
                <Input
                    type="number"
                    value={text}
                    onChange={(e) => handleTableChange(index, 'azimuth', e.target.value)}
                />
            )
        }
    ];

    return (
        <div style={{ padding: "24px" }}>
            <h2>Добавить искривление скважины</h2>
            <Form form={form} layout="vertical" onFinish={onFinish}>
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

                <Form.Item
                    label="Глубина скважины (м)"
                    name="Depth"
                    rules={[{ required: true, message: "Пожалуйста, укажите глубину скважины!" }]}
                >
                    <Input
                        type="number"
                        step="0.1"
                        min="0"
                        onChange={handleDepthChange}
                    />
                </Form.Item>

                {showTable && (
                    <>
                        <Divider />
                        <h3>Данные искривления (интервалы по 20 метров)</h3>
                        <Table
                            columns={columns}
                            dataSource={slantData}
                            pagination={false}
                            bordered
                            size="small"
                        />
                        <Divider />
                    </>
                )}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        disabled={!showTable}
                    >
                        Сохранить данные искривления
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default AddWellSlantForm;