import React, { useState, useEffect } from "react";
import { Table, Select, Typography, Card, Input } from "antd";
import { useNavigate } from 'react-router-dom';
import './App.css';

const { Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const WellTable = () => {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [ngdu, setNgdu] = useState("");
    const [workshop, setWorkshop] = useState("");
    const [searchText, setSearchText] = useState("");
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
                const filteredWorkshops = result.$values.filter(workshop => workshop.idType === 2);
                setWorkshopList(filteredWorkshops);
            } else {
                console.error("Ответ от API не является массивом цехов:", result);
                setWorkshopList([]);
            }
        } catch (error) {
            console.error("Ошибка при загрузке цехов:", error);
            setWorkshopList([]);
        }
    };

    // Загрузка всех данных
    const fetchAllData = async () => {
        setLoading(true);
        try {
            let url = `/api/well/table/?page=1&pageSize=1000`;

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

            setAllData(formattedData);
            setTotalRecords(result.totalRecords);
            applyFilters(formattedData, ngdu, workshop, searchText);
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        }
        setLoading(false);
    };

    // Применение фильтров к данным
    const applyFilters = (data, ngduFilter, workshopFilter, searchFilter) => {
        let filtered = [...data];

        // Фильтр по НГДУ (по названию)
        if (ngduFilter) {
            const selectedNgdu = ngduList.find(item => item.idNgdu === ngduFilter);
            if (selectedNgdu) {
                filtered = filtered.filter(item => item.ngdu === selectedNgdu.name);
            }
        }

        // Фильтр по цеху (по названию)
        if (workshopFilter) {
            const selectedWorkshop = workshopList.find(item => item.idWorkshop === workshopFilter);
            if (selectedWorkshop) {
                filtered = filtered.filter(item => item.workshop === selectedWorkshop.name);
            }
        }

        // Фильтр по поиску
        if (searchFilter) {
            const searchLower = searchFilter.toLowerCase();
            filtered = filtered.filter(item =>
                item.name && item.name.toLowerCase().includes(searchLower)
            );
        }

        setFilteredData(filtered);
        setTotalRecords(filtered.length);
    };

    // Обработчик поиска
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
        applyFilters(allData, ngdu, workshop, value);
    };

    // Очистка поиска
    const handleClearSearch = () => {
        setSearchText("");
        setPage(1);
        applyFilters(allData, ngdu, workshop, "");
    };

    // Загрузка всех данных при монтировании
    useEffect(() => {
        fetchNgduList();
        fetchAllData();
    }, []);

    useEffect(() => {
        if (ngdu) {
            fetchWorkshopList(ngdu);
        } else {
            setWorkshopList([]);
            setWorkshop("");
        }
    }, [ngdu]);

    // Применение фильтров при изменении параметров
    useEffect(() => {
        applyFilters(allData, ngdu, workshop, searchText);
    }, [ngdu, workshop, allData, ngduList, workshopList]);

    // Сброс цеха при изменении НГДУ
    useEffect(() => {
        if (ngdu) {
            setWorkshop("");
        }
    }, [ngdu]);

    // Получение данных для текущей страницы
    const getPagedData = () => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData.slice(startIndex, endIndex);
    };

    // Колонки таблицы
    const columns = [
        {
            title: "№ Скважины",
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
        { title: "Цех", dataIndex: "workshop", key: "workshop" },
    ];

    return (
        <Card
            title={
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span>Добывающие скважины</span>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }} className="filters">
                        <Select
                            value={ngdu}
                            onChange={(value) => {
                                setNgdu(value);
                                setPage(1);
                            }}
                            style={{ width: 200 }}
                            placeholder="Выберите НГДУ"
                        >
                            <Option value="">Все НГДУ</Option>
                            {ngduList.map((ngduItem) => (
                                <Option key={ngduItem.idNgdu} value={ngduItem.idNgdu}>
                                    {ngduItem.name}
                                </Option>
                            ))}
                        </Select>

                        <Select
                            value={workshop}
                            onChange={(value) => {
                                setWorkshop(value);
                                setPage(1);
                            }}
                            style={{ width: 200 }}
                            disabled={!ngdu}
                            placeholder={ngdu ? "Выберите цех" : "Сначала выберите НГДУ"}
                        >
                            <Option value="">Все цеха</Option>
                            {workshopList.map((workshopItem) => (
                                <Option key={workshopItem.idWorkshop} value={workshopItem.idWorkshop}>
                                    {workshopItem.name}
                                </Option>
                            ))}
                        </Select>

                        <Search
                            placeholder="Поиск по названию скважины"
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onSearch={handleSearch}
                            onPressEnter={(e) => handleSearch(e.target.value)}
                            style={{ width: 250 }}
                        />

                        {searchText && (
                            <button
                                onClick={handleClearSearch}
                                style={{
                                    padding: '4px 8px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    background: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                Очистить
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Table
                columns={columns}
                dataSource={getPagedData()}
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
        </Card>
    );
};

export default WellTable;