import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Input, Form, Typography, message } from "antd";
import { useNavigate } from 'react-router-dom';
import './App.css';

const { Text } = Typography;

const HorizonTable = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isRazrab = user?.roleName === 'Разработчик';
    // Загрузка данных для таблицы
    const fetchData = async (page, pageSize) => {
        setLoading(true);
        try {
            const url = `/api/paker/table?page=${page}&pageSize=${pageSize}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Ответ от API:", result);

            // Проверяем наличие данных в правильной структуре
            if (!result || !result.packers || !result.packers.$values || !Array.isArray(result.packers.$values)) {
                throw new Error("Некорректный формат данных от API");
            }

            // Используем result.packers.$values вместо result.packers
            const formattedData = result.packers.$values.map(item => ({
                ...item,
                key: item.idPacker ? item.idPacker.toString() : `${Math.random()}`,
                name: item.name || "Нет данных",
                depth: item.depth || "Нет данных",
                wellName: item.wellName || "Нет данных"
            }));

            setData(formattedData);
            setTotalRecords(result.totalRecords);
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
            message.error('Ошибка при загрузке данных');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData(page, pageSize);
    }, [page, pageSize]);

    // Обновление данных пакера на сервере
    const updatePacker = async (idPacker, newDepth) => {
        try {
            const response = await fetch(`/api/paker/table/${idPacker}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ Depth: newDepth })
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при обновлении пакера:', error);
            throw error;
        }
    };

    // Обработчик редактирования
    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            depth: record.depth
        });
        setIsModalVisible(true);
    };

    // Сохранение изменений
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const newDepth = values.depth;

            // 1. Обновляем данные на сервере
            const updatedPacker = await updatePacker(editingRecord.idPacker, newDepth);

            // 2. Обновляем данные в таблице
            const updatedData = data.map(item =>
                item.idPacker === editingRecord.idPacker
                    ? { ...item, depth: newDepth }
                    : item
            );

            setData(updatedData);
            setIsModalVisible(false);
            message.success('Изменения успешно сохранены');

            // 3. Обновляем данные в таблице (перезагружаем текущую страницу)
            fetchData(page, pageSize);
        } catch (error) {
            console.error("Ошибка при сохранении:", error);
            message.error('Не удалось сохранить изменения');
        }
    };

    // Колонки таблицы
    const baseColumns = [
        {
            title: "№ скважины",
            dataIndex: "wellName",
            key: "wellName",
        },
        {
            title: "Название пакера",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Глубина",
            dataIndex: "depth",
            key: "depth",
        }
    ];

    const actionColumn = {
        title: "Действия",
        key: "actions",
        render: (_, record) => (
            <Button
                type="primary"
                onClick={() => handleEdit(record)}
            >
                Редактировать
            </Button>
        ),
    };
    const columns = isRazrab ? [...baseColumns, actionColumn] : baseColumns;
    return (
        <>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="key"
                loading={loading}
                bordered
                pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: totalRecords,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    onShowSizeChange: (_, size) => setPageSize(size),
                    onChange: (page) => setPage(page),
                    showTotal: (total, range) => (
                        <Text strong>
                            {range[0]}-{range[1]} из {total} записей
                        </Text>
                    ),
                }}
                scroll={{ x: "max-content", y: 400 }}
            />

            <Modal
                title={`Редактирование пакера: ${editingRecord?.name}`}
                visible={isModalVisible}
                onOk={handleSave}
                onCancel={() => setIsModalVisible(false)}
                okText="Сохранить"
                cancelText="Отмена"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Скважина"
                    >
                        <Input value={editingRecord?.wellName} disabled />
                    </Form.Item>
                    <Form.Item
                        name="depth"
                        label="Глубина"
                        rules={[{
                            required: true,
                            message: 'Пожалуйста, введите глубину',
                            pattern: new RegExp(/^[0-9]+(\.[0-9]+)?$/),
                            message: 'Пожалуйста, введите корректное число'
                        }]}
                    >
                        <Input placeholder="Введите глубину" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default HorizonTable;