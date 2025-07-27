import React, { useState, useEffect } from "react";
import { Table, Select, Typography } from "antd";
import { useNavigate } from 'react-router-dom';
import './App.css';

const { Text } = Typography;
const { Option } = Select;

const HorizonTable = () => {
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
            const url = `/api/stem/?page=${page}&pageSize=${pageSize}`;
            const response = await fetch(url);

            const rawResponse = await response.text();

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }

            const result = JSON.parse(rawResponse);
            console.log("Ответ от API:", result);

            // Проверяем наличие данных в правильной структуре
            if (!result || !result.stems || !result.stems.$values || !Array.isArray(result.stems.$values)) {
                throw new Error("Некорректный формат данных от API");
            }

            // Форматируем данные
            const formattedData = result.stems.$values.map(item => ({
                ...item,
                key: item.idStem ? item.idStem.toString() : `${Math.random()}`,
                Name: item.name || "Нет данных",
                horizontName: item.horizontName || "Нет данных",
                Work: item.Work || "Нет данных",
                Depth: item.Depth || "Нет данных",
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
            title: "№ скважины",
            dataIndex: "wellName",
            key: "wellName",
        },
        {
            title: "Название ствола",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Горизонт",
            dataIndex: "horizontName",
            key: "horizontName",
        },
       
        {
            title: "Статус",
            key: "work",
            render: (_, record) => (
                <Text>{record.work === 1 ? "Активен" : "Неактивен"}</Text>
            ),
        },
        { title: "Глубина", dataIndex: "depth", key: "depth" },
       
        
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

export default HorizonTable;