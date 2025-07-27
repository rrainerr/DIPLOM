import React, { useState, useEffect } from "react";
import { Table, Select, Typography } from "antd";
import { useNavigate } from 'react-router-dom';
import './App.css';

const { Text } = Typography;
const { Option } = Select;

const HorizonTableWell = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const navigate = useNavigate();

    // Загрузка данных для таблицы
    const fetchData = async (page, pageSize) => {
        setLoading(true);
        try {
            const url = `/api/horizont/table?page=${page}&pageSize=${pageSize}`;
            const response = await fetch(url);

            const rawResponse = await response.text();

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }

            const result = JSON.parse(rawResponse);
            console.log("Ответ от API:", result);

            // Проверяем наличие данных в правильной структуре
            if (!result || !result.horizonts || !result.horizonts.$values || !Array.isArray(result.horizonts.$values)) {
                throw new Error("Некорректный формат данных от API");
            }

            // Форматируем данные
            const formattedData = result.horizonts.$values.map(item => ({
                ...item,
                key: item.idHorizont ? item.idHorizont.toString() : `${Math.random()}`,
                fieldName: item.fieldName || "Нет данных",
                wellName: item.wellName || "Нет данных"
            }));

            setData(formattedData);
            setTotalRecords(result.totalRecords);
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData(page, pageSize);
    }, [page, pageSize]);

    // Колонки таблицы
    const columns = [
        {
            title: "Название горизонта",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Область",
            dataIndex: "fieldName",
            key: "fieldName",
        },
        {
            title: "№ скважины",
            dataIndex: "wellName",
            key: "wellName",
        },
        { title: "Крыша", dataIndex: "roof", key: "roof" },
        { title: "Подошва", dataIndex: "sole", key: "sole" },
        {
            title: "Эфф. мощн",
            key: "effectiveThickness",
            render: (_, record) => {
                const roof = parseFloat(record.roof);
                const sole = parseFloat(record.sole);
                if (!isNaN(roof) && !isNaN(sole)) {
                    return (sole - roof).toFixed(2);
                }
                return "Нет данных";
            },
        },
        // Добавьте другие колонки по необходимости
    ];

    return (
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
    );
};

export default HorizonTableWell;