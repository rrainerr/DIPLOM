import React, { useState, useEffect } from "react";
import { Form, Input, Select, Button, message, Typography, Upload, Table, Card, Space, Alert } from "antd";
import { UploadOutlined, DownloadOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const { Option } = Select;
const { Title } = Typography;

const ImportHorizontsForm = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [fields, setFields] = useState([]);
    const [wells, setWells] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importData, setImportData] = useState([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        const fetchFields = async () => {
            try {
                const response = await fetch("/api/field");
                if (!response.ok) throw new Error("Не удалось загрузить список полей");
                const data = await response.json();
                setFields(data.$values || []);
            } catch (error) {
                message.error(error.message);
            }
        };

        const fetchWells = async () => {
            try {
                const response = await fetch("/api/well/add");
                if (!response.ok) throw new Error("Не удалось загрузить список скважин");
                const data = await response.json();
                setWells(data.$values || []);
            } catch (error) {
                message.error(error.message);
            }
        };

        fetchFields();
        fetchWells();
    }, []);

    // Обработка загрузки файла с улучшенной валидацией
    const handleFileUpload = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    message.error("Файл не содержит данных");
                    return;
                }

                const errors = [];
                const formattedData = jsonData.map((row, index) => {
                    // Преобразуем числовые значения
                    const parseNumber = (value) => {
                        if (value === null || value === undefined || value === '') return null;
                        const num = Number(value);
                        return isNaN(num) ? null : num;
                    };

                    const name = row["Название"] || row["name"] || row["Наименование"] || `Пласт_${index + 1}`;

                    // Валидация имени
                    if (!name || name.toString().trim() === '') {
                        errors.push(`Строка ${index + 1}: Отсутствует название пласта`);
                    }

                    const roof = parseNumber(row["Кровля"] || row["roof"] || row["Кровля, м"]);
                    const sole = parseNumber(row["Подошва"] || row["sole"] || row["Подошва, м"]);

                    // Валидация кровли и подошвы
                    if (roof !== null && sole !== null && roof >= sole) {
                        errors.push(`Строка ${index + 1} "${name}": Кровля (${roof}) должна быть меньше подошвы (${sole})`);
                    }

                    return {
                        key: index,
                        Roof: roof,
                        Sole: sole,
                        Name: name.toString().trim(),
                        Porosity: parseNumber(row["Пористость"] || row["porosity"] || row["Пористость, д.ед."]),
                        Thickness: parseNumber(row["Толщина"] || row["thickness"] || row["Толщина, м"]),
                        Viscosity: parseNumber(row["Вязкость"] || row["viscosity"] || row["Вязкость флюида, сПз"]),
                        Permeability: parseNumber(row["Проницаемость"] || row["permeability"] || row["Проницаемость, мД"]),
                        Compressibility: parseNumber(row["Сжимаемость"] || row["compressibility"]),
                        SostPl: mapSostPlToValue(row["Состояние"] || row["sostPl"])
                    };
                }).filter(item => item.Name && item.Name !== '');

                setImportData(formattedData);
                setValidationErrors(errors);
                setPreviewVisible(true);

                if (errors.length > 0) {
                    message.warning(`Загружено ${formattedData.length} записей, но есть ошибки валидации`);
                } else {
                    message.success(`Загружено ${formattedData.length} записей`);
                }
            } catch (error) {
                message.error("Ошибка при чтении файла: " + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    // Маппинг текстового состояния пласта в числовое значение
    const mapSostPlToValue = (sostPlText) => {
        if (sostPlText === null || sostPlText === undefined || sostPlText === '') return 0;

        // Если значение уже число - возвращаем его
        if (typeof sostPlText === 'number') return sostPlText;

        // Пробуем преобразовать в число
        const numericValue = Number(sostPlText);
        if (!isNaN(numericValue)) return numericValue;

        // Если текст - преобразуем по старой логике
        const text = sostPlText.toString().toLowerCase();
        if (text.includes("открыт")) return 1;
        if (text.includes("перекрыт")) return 2;
        if (text.includes("частично")) return 3;

        return 0;
    };

    // Обработка импорта
    const onFinish = async (values) => {
        if (importData.length === 0) {
            message.error("Нет данных для импорта");
            return;
        }

        if (validationErrors.length > 0) {
            message.error("Исправьте ошибки валидации перед импортом");
            return;
        }

        setLoading(true);
        try {
            // Подготавливаем данные для отправки
            const horizonsToSend = importData.map(item => {
                // Обеспечиваем, что все обязательные поля имеют значения
                return {
                    roof: item.Roof || 0,
                    sole: item.Sole || 0,
                    name: item.Name,
                    porosity: item.Porosity || 0,
                    thickness: item.Thickness || 0,
                    viscosity: item.Viscosity || 0,
                    permeability: item.Permeability || 0,
                    compressibility: item.Compressibility || 0,
                    sostPl: item.SostPl || 0
                };
            });

            const importRequest = {
                wellId: Number(values.IdWell),
                fieldId: Number(values.IdField),
                horizonts: horizonsToSend
            };

            console.log("Отправляемые данные:", importRequest);

            const response = await fetch("/api/horizont/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "accept": "*/*"
                },
                body: JSON.stringify(importRequest),
            });

            const responseText = await response.text();
            let result;

            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(responseText || "Unknown error occurred");
            }

            if (!response.ok) {
                throw new Error(result.message || result.title || `HTTP error ${response.status}`);
            }

            if (result.errors && result.errors.length > 0) {
                message.warning(`Импортировано ${result.importedCount} из ${result.totalCount} записей. Ошибки: ${result.errors.join(", ")}`);
            } else {
                message.success(`Успешно импортировано ${result.importedCount} записей`);
            }

            form.resetFields();
            setImportData([]);
            setPreviewVisible(false);
            setValidationErrors([]);
            navigate("/Table_hor");
        } catch (error) {
            console.error("Ошибка импорта:", error);
            message.error(`Ошибка импорта: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Скачать шаблон
    const downloadTemplate = () => {
        const template = [
            {
                "Кровля, м": 1000,
                "Подошва, м": 1050,
                "Название": "Пласт_1",
                "Пористость, д.ед.": 0.15,
                "Толщина, м": 50,
                "Вязкость флюида, сПз": 1.2,
                "Проницаемость, мД": 150,
                "Сжимаемость": 0.0001,
                "Состояние": 1
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Пласты");
        XLSX.writeFile(wb, "шаблон_импорта_пластов.xlsx");
    };

    const columns = [
        { title: "Кровля, м", dataIndex: "Roof", key: "Roof" },
        { title: "Подошва, м", dataIndex: "Sole", key: "Sole" },
        { title: "Название", dataIndex: "Name", key: "Name" },
        { title: "Пористость, д.ед.", dataIndex: "Porosity", key: "Porosity" },
        { title: "Толщина, м", dataIndex: "Thickness", key: "Thickness" },
        { title: "Вязкость, сПз", dataIndex: "Viscosity", key: "Viscosity" },
        { title: "Проницаемость, мД", dataIndex: "Permeability", key: "Permeability" },
        { title: "Сжимаемость", dataIndex: "Compressibility", key: "Compressibility" },
        {
            title: "Состояние",
            dataIndex: "SostPl",
            key: "SostPl",
        },
    ];

    return (
        <div style={{ padding: "24px" }}>
            <Title level={2}>Импорт пластов из Excel</Title>

            <Card style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: "100%" }} size="large">
                    <div>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={downloadTemplate}
                        >
                            Скачать шаблон
                        </Button>
                        <span style={{ marginLeft: 16, color: "#666" }}>
                            Скачайте шаблон, заполните его данными и загрузите обратно
                        </span>
                    </div>

                    <Upload
                        accept=".xlsx, .xls"
                        beforeUpload={handleFileUpload}
                        showUploadList={false}
                    >
                        <Button icon={<UploadOutlined />}>
                            Выберите файл Excel
                        </Button>
                    </Upload>
                </Space>
            </Card>

            {validationErrors.length > 0 && (
                <Alert
                    message="Ошибки валидации"
                    description={
                        <ul>
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    }
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {previewVisible && (
                <Card title="Предпросмотр данных" style={{ marginBottom: 24 }}>
                    <Table
                        columns={columns}
                        dataSource={importData}
                        pagination={{ pageSize: 5 }}
                        size="small"
                        scroll={{ x: 800 }}
                    />
                    <div style={{ marginTop: 16, color: "#666" }}>
                        Всего записей для импорта: {importData.length}
                    </div>
                </Card>
            )}

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
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

                <Form.Item>
                    <Space>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            disabled={importData.length === 0 || validationErrors.length > 0}
                            icon={validationErrors.length > 0 ? <ExclamationCircleOutlined /> : null}
                        >
                            Импортировать данные ({importData.length})
                        </Button>
                        <Button onClick={() => navigate("/Table_hor")}>
                            Отмена
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default ImportHorizontsForm;