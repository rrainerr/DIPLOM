import React, { useState, useEffect } from "react";
import { Table, Select, Typography } from "antd";
import { useNavigate } from 'react-router-dom';
import './App.css';

const { Text } = Typography;
const { Option } = Select;

const WellTable = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [ngdu, setNgdu] = useState("");
    const [workshop, setWorkshop] = useState("");
    const [ngduList, setNgduList] = useState([]);
    const [workshopList, setWorkshopList] = useState([]);
    const navigate = useNavigate();

    // Загрузка списка НГДУ
    const fetchNgduList = async () => {
        try {
            const response = await fetch("/api/ngdu/table");
            const result = await response.json();

            if (result && result.$values && Array.isArray(result.$values)) {
                setNgduList(result.$values);
            } else {
                console.error("Ответ от API не содержит массива в поле $values:", result);
            }
        } catch (error) {
            console.error("Ошибка при загрузке НГДУ:", error);
        }
    };

    // Загрузка списка цехов для выбранного НГДУ
    const fetchWorkshopList = async (ngduId) => {
        try {
            const response = await fetch(`/api/workshop/table?ngduId=${ngduId}`);
            const result = await response.json();
            console.log("Ответ от API (цехи):", result);

            if (result && result.$values && Array.isArray(result.$values)) {
                setWorkshopList(result.$values);
            } else {
                console.error("Ответ от API не является массивом цехов:", result);
            }
        } catch (error) {
            console.error("Ошибка при загрузке цехов:", error);
        }
    };

    // Загрузка данных для таблицы
    const fetchData = async (page, pageSize, ngdu, workshop) => {
        setLoading(true);
        try {
            let url = `/api/well/table/?page=${page}&pageSize=${pageSize}`;
            if (ngdu) url += `&ngdu=${ngdu}`;
            if (workshop) url += `&workshop=${workshop}`;

            console.log("Запрос к API:", url);

            const response = await fetch(url);
            const result = await response.json();
            console.log("Ответ от API (скважины):", result);

            if (!result || !result.wells || !result.wells.$values || !Array.isArray(result.wells.$values)) {
                throw new Error("Некорректный формат данных от API");
            }

            const wells = result.wells.$values;
            const formattedData = wells.map(item => ({
                ...item,
                key: item.idWell ? item.idWell.toString() : `${Math.random()}`,
            }));

            setData(formattedData);
            setTotalRecords(result.totalRecords);
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        }
        setLoading(false);
    };

    // Загрузка списка НГДУ при монтировании компонента
    useEffect(() => {
        fetchNgduList();
    }, []);

    useEffect(() => {
        if (ngdu) {
            fetchWorkshopList(ngdu);
            setWorkshop("");
        } else {
            setWorkshopList([]);
        }
    }, [ngdu]);

    useEffect(() => {
        fetchData(page, pageSize, ngdu, workshop);
    }, [page, pageSize, ngdu, workshop]);

    // Колонки таблицы
    const columns = [
        {
            title: "Название",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <a
                    onClick={() => navigate(`/Mapp?wellId=${record.idWell}`)}
                    style={{ cursor: 'pointer', color: '#8cbea8' }}
                >
                    {text}
                </a>
            ),
        },
        { title: "НГДУ", dataIndex: "ngdu", key: "ngdu" },
        { title: "Цех (Workshop)", dataIndex: "workshop", key: "workshop" },
    ];

    return (
        <>
            <div className="filters">
                <Select
                    value={ngdu}
                    onChange={(value) => {
                        console.log("Выбрано НГДУ:", value);
                        setNgdu(value);
                    }}
                    style={{ width: 200, marginRight: 20 }}
                    placeholder="Выберите НГДУ"
                >
                    <Option value="">Выберите НГДУ</Option>
                    {ngduList.map((ngduItem) => (
                        <Option key={ngduItem.idNgdu} value={ngduItem.idNgdu}>
                            {ngduItem.name}
                        </Option>
                    ))}
                </Select>

                <Select
                    value={workshop}
                    onChange={(value) => {
                        console.log("Выбрано цех:", value);
                        setWorkshop(value);
                    }}
                    style={{ width: 200 }}
                    disabled={!ngdu}
                    placeholder="Выберите цех"
                >
                    <Option value="">Выберите цех</Option>
                    {workshopList.map((workshopItem) => (
                        <Option key={workshopItem.idWorkshop} value={workshopItem.idWorkshop}>
                            {workshopItem.name}
                        </Option>
                    ))}
                </Select>
            </div>

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
        </>
    );
};

export default WellTable;