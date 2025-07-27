import React, { useEffect, useState, useRef } from 'react';
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource, XYZ } from 'ol/source';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Style, Icon, Text as OlText, Stroke, Fill, RegularShape } from 'ol/style';
import 'ol/ol.css';
import { useLocation } from 'react-router-dom';
import { Layout, Row, Col, Table, Drawer, Descriptions, Button, Modal, Input, InputNumber, message, Card, Typography } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Circle } from 'ol/style';
import './App.css';

const { Content } = Layout;
const { Text } = Typography; // Единственное объявление Text

const Mapp = () => {
    const params = new URLSearchParams(window.location.search);
    const wellId = params.get("wellId");
    const [slantData, setSlantData] = useState([]);
    const [loadingSlantData, setLoadingSlantData] = useState(false);
    const [isSlantModalVisible, setIsSlantModalVisible] = useState(false);
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());
    const [linkedWells, setLinkedWells] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [isRatioModalVisible, setIsRatioModalVisible] = useState(false);
    const [ratios, setRatios] = useState({});
    const [chartData, setChartData] = useState([]);
    const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
    const [isHorizonModalVisible, setIsHorizonModalVisible] = useState(false);
    const [horizonData, setHorizonData] = useState([]);
    const [loadingHorizonData, setLoadingHorizonData] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [calculatedRatios, setCalculatedRatios] = useState({});
    const [forecastedRatio, setforecastedRatio] = useState({});



    const location = useLocation();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isGeologist = user?.roleName === 'Геолог';

    // Загрузка данных о связанных скважинах
    const fetchLinkedWells = async (wellId) => {
        try {
            const response = await fetch(`/api/map/link?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Linked Wells Response:', data);

            const linkedWellsData = data.$values || data;

            if (!Array.isArray(linkedWellsData)) {
                throw new Error('Expected data to be an array');
            }

            setLinkedWells(linkedWellsData);
            updateChartData(linkedWellsData);
        } catch (error) {
            console.error('Error loading linked wells:', error);
        }
    };

    // Обновление данных для диаграммы
    const updateChartData = (wells) => {
        const total = 1;
        const used = wells.reduce((sum, item) => sum + (item.lastratio || 0), 0);
        const free = total - used;

        const normalizedData = [
            ...wells.map((item) => ({
                name: item.name,
                y: item.lastratio || 0,
            })),
            {
                name: "Свободно",
                y: free,
                color: "#E0E0E0",
            },
        ];

        setChartData(normalizedData);
    };

    const handleShowSlantTable = async (wellId) => {
        setLoadingSlantData(true);
        setIsSlantModalVisible(true);

        try {
            const response = await fetch(`/api/well/wellslant/table?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Slant Data Response:', data);

            const formattedData = Array.isArray(data) ? data : data.$values || [];
            setSlantData(formattedData.map(item => ({
                ...item,
                key: item.idWellSlant || `${Math.random()}`
            })));
        } catch (error) {
            console.error('Error loading slant data:', error);
            message.error('Не удалось загрузить данные о кривизне');
        } finally {
            setLoadingSlantData(false);
        }
    };
    // Открытие модального окна для редактирования всех ratio

    const handleOpenRatioModal = async () => {
        const initialRatios = linkedWells.reduce((acc, well) => {
            acc[well.idLink] = well.lastratio || 0;
            return acc;
        }, {});
        setRatios(initialRatios);
        setIsRatioModalVisible(true);

        if (wellId) {
            await loadCalculatedRatios(wellId);
        } else {
            console.warn("wellId не найден в URL");
            message.warning("Не удалось загрузить расчёты: не указан wellId в ссылке");
        }
    };


    const loadCalculatedRatios = async (producerId) => {
        try {
            const response = await fetch(`/api/crmCalculator/${producerId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log("Raw calculated ratios:", data);

            // Извлекаем массив значений из ответа
            const ratiosArray = data.$values || [];

            if (!Array.isArray(ratiosArray)) {
                throw new Error('Ожидался массив данных от сервера');
            }

            const calculatedMap = {};
            ratiosArray.forEach(item => {
                // Ищем соответствующую скважину в linkedWells по linkId или injectorId
                const linkedWell = linkedWells.find(well =>
                    well.idLink === item.linkId || well.idWell === item.injectorId
                );

                if (linkedWell) {
                    calculatedMap[linkedWell.idLink] = item.calculatedRatio;
                }
            });
            const calculatedMap2 = {};
            ratiosArray.forEach(item => {
                // Ищем соответствующую скважину в linkedWells по linkId или injectorId
                const linkedWell = linkedWells.find(well =>
                    well.idLink === item.linkId || well.idWell === item.injectorId
                );

                if (linkedWell) {
                    calculatedMap2[linkedWell.idLink] = item.forecastedRatio;
                }
            });

            setCalculatedRatios(calculatedMap);
            setforecastedRatio(calculatedMap2);
            message.success('Расчётные коэффициенты загружены');
        } catch (error) {
            console.error("Ошибка загрузки расчётных коэффициентов:", error);
            message.error(`Не удалось загрузить расчётные коэффициенты: ${error.message}`);
        }
    };

    // Проверка суммы ratio
    const validateRatios = () => {
        const totalRatio = Object.values(ratios).reduce((sum, ratio) => sum + (parseFloat(ratio) || 0), 0);
        return totalRatio <= 1;
    };

    // Сохранение всех ratio
    const handleSaveAllRatios = async () => {
        try {
            if (!validateRatios()) {
                setIsWarningModalVisible(true);
                return;
            }

            const user = JSON.parse(sessionStorage.getItem('user'));
            const userId = user?.idUsers;

            if (!userId) {
                throw new Error('Пользователь не авторизован');
            }

            const updates = linkedWells.map((well) => ({
                IdLink: well.idLink,
                Ratio: parseFloat(ratios[well.idLink] || 0),
                IdUsers: userId,
                IdWell: well.idWell, // Убедитесь, что это поле заполнено
            }));

            console.log("Sending data:", updates);

            const response = await fetch('/api/map/addMultiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                console.error('Server error:', responseText);
                throw new Error(responseText || 'Ошибка при сохранении Ratio');
            }

            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log('Response data:', responseData);
            } catch (jsonError) {
                console.error('Failed to parse JSON:', jsonError);
                throw new Error('Invalid JSON response from server');
            }

            const updatedLinkedWells = linkedWells.map((well) => ({
                ...well,
                lastratio: ratios[well.idLink] || well.lastratio,
            }));

            setLinkedWells(updatedLinkedWells);
            updateChartData(updatedLinkedWells);

            message.success('Все Ratio успешно обновлены!');
            setIsRatioModalVisible(false);
            window.location.reload();
        } catch (error) {
            console.error('Error saving ratios:', error);
            message.error(error.message || 'Ошибка при сохранении Ratio');
        }
    };

    // Загрузка данных о точках и обновление карты
    const loadMapData = async () => {
        try {
            const response = await fetch('/api/well/map/point');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('API Response:', data);

            // Извлекаем точки с учетом нового формата
            const pointsData = (() => {
              if (Array.isArray(data)) return data; // Если пришел массив напрямую
              if (data?.$values) return data.$values; // Если пришел объект с $values
              return []; // Fallback
            })();

            if (!Array.isArray(pointsData)) {
              throw new Error('Expected array but got: ' + JSON.stringify(data));
            }

            const newFeatures = [];
            const lineCoordinates = [];

            pointsData.forEach((point) => {

                const coords = fromLonLat([point.longitude, point.latitude]);
                const feature = new Feature({
                    geometry: new Point(coords),
                    name: point.name,
                    info: point,
                });

                const iconSrc = point.idType === 2 ? '/well-icon.png' : '/well-icon1.png';

                feature.setStyle((feature, resolution) => {
                    const scale = 0.8 / resolution;
                    const fontSize = 140 / resolution;

                    return new Style({
                        image: new Icon({
                            src: iconSrc,
                            scale: scale,
                        }),
                        text: new OlText({
                            text: point.name,
                            font: `${fontSize}px Calibri,sans-serif`,
                            fill: new Fill({ color: '#000' }),
                            stroke: new Stroke({
                                color: '#fff',
                                width: 2,
                            }),
                            offsetY: 25,
                        }),
                    });
                });

                newFeatures.push(feature);

                if (point.links && point.links.$values && Array.isArray(point.links.$values)) {
                    point.links.$values.forEach((link) => {
                        // Проверяем статус связи
                        if (link.status === 1) { // Добавляем условие
                            const linkedWell = pointsData.find((w) => w.idWell === link.wellLink);
                            if (linkedWell) {
                                const linkedCoords = fromLonLat([linkedWell.longitude, linkedWell.latitude]);
                                lineCoordinates.push({
                                    coords: [coords, linkedCoords],
                                    debit: point.debit,
                                    lastratio: link.lastratio,
                                });
                            }
                        }
                    });
                }
            });

            vectorSourceRef.current.clear();
            vectorSourceRef.current.addFeatures(newFeatures);

            lineCoordinates.forEach((line) => {
                const [start, end] = line.coords;

                const dx = end[0] - start[0];
                const dy = end[1] - start[1];
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length === 0) return;

                const ux = dx / length;
                const uy = dy / length;

                const arrowOffset = 150;

                const newEnd = [end[0] - ux * arrowOffset, end[1] - uy * arrowOffset];

                const lineFeature = new Feature({
                    geometry: new LineString([start, newEnd]),
                });

                const lineColor = line.debit > 1 ? 'red' : 'red';

                lineFeature.setStyle((feature, resolution) => {
                    const lineWidth = 50 / resolution;
                    return new Style({
                        stroke: new Stroke({
                            color: lineColor,
                            width: lineWidth,
                        }),
                    });
                });

                const arrowFeature = new Feature({
                    geometry: new Point(newEnd),
                });

                arrowFeature.setStyle((feature, resolution) => {
                    const arrowSize = 60 / resolution;
                    return new Style({
                        image: new RegularShape({
                            points: 3,
                            radius: arrowSize,
                            fill: new Fill({ color: lineColor }),
                            stroke: new Stroke({ color: lineColor, width: 1 }),
                            rotation: Math.atan2(dy, dx) + Math.PI / 2,
                        }),
                    });
                });

                const textFeature = new Feature({
                    geometry: new Point([
                        (start[0] + newEnd[0]) / 2,
                        (start[1] + newEnd[1]) / 2,
                    ]),
                });

                textFeature.setStyle((feature, resolution) => {
                    const fontSize = 140 / resolution;
                    const circleRadius = 120 / resolution;

                    return new Style({
                        image: new Circle({
                            radius: circleRadius,
                            fill: new Fill({ color: 'rgba(255, 255, 255, 1)' }),
                            stroke: new Stroke({
                                color: '#000',
                                width: 2,
                            }),
                        }),
                        text: new OlText({
                            text: (line.lastratio || 0).toString(),
                            font: `${fontSize}px Calibri,sans-serif`,
                            fill: new Fill({ color: '#000' }),
                            stroke: new Stroke({
                                color: '#fff',
                                width: 2,
                            }),
                            offsetY: 0,
                        }),
                    });
                });

                vectorSourceRef.current.addFeature(lineFeature);
                vectorSourceRef.current.addFeature(arrowFeature);
                vectorSourceRef.current.addFeature(textFeature);
            });
        } catch (error) {
            console.error('Error loading points:', error);
        }
    };

    // Инициализация карты
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const wellId = params.get('wellId');

        if (wellId) {
            fetchLinkedWells(wellId);
        }

        if (!mapRef.current) return;

        if (!mapInstance.current) {
            const map = new Map({
                target: mapRef.current,
                layers: [
                    // 1. Базовая карта OSM (самый нижний слой)
                    new TileLayer({
                        source: new OSM(),
                        zIndex: 0
                    }),

                    // 2. Слой рельефа (над базовой картой, но под векторными данными)
                    new TileLayer({
                        source: new XYZ({
                            url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
                            attributions: '© OpenTopoMap'
                        }),
                        opacity: 1, // Полупрозрачный для лучшей видимости
                        zIndex: 1,
                        preload: Infinity,
                        className: 'topo-layer' // Для кастомных стилей CSS
                    }),

                    // 3. Векторный слой (самый верхний)
                    new VectorLayer({
                        source: vectorSourceRef.current,
                        zIndex: 2 // Убедитесь, что это самый высокий zIndex
                    })
                ],
                view: new View({
                    center: fromLonLat([37.6173, 55.7558]),
                    zoom: 10
                })
            });

            map.on('singleclick', (event) => {
                const clickedFeatures = [];
                map.forEachFeatureAtPixel(event.pixel, (feature) => {
                    if (feature.getGeometry().getType() === 'Point') {
                        clickedFeatures.push(feature);
                    }
                });

                if (clickedFeatures.length === 0) return;

                const pointData = clickedFeatures[0].get('info');

                if (!pointData || !pointData.idWell) {
                    console.warn('Invalid pointData:', pointData);
                    return;
                }

                setSelectedPoint(pointData);
                setDrawerVisible(true);
            });

            vectorSourceRef.current.on('change', function () {
                if (wellId && vectorSourceRef.current.getFeatures().length > 0) {
                    const features = vectorSourceRef.current.getFeatures();
                    const wellFeature = features.find(f => {
                        const info = f.get('info');
                        return info && info.idWell && info.idWell.toString() === wellId;
                    });

                    if (wellFeature) {
                        const coords = wellFeature.getGeometry().getCoordinates();
                        map.getView().animate({
                            center: coords,
                            zoom: 14,
                            duration: 500
                        });
                    }
                }
            });

            mapInstance.current = map;
        }
    }, [location]);

    // Обновление карты при изменении данных
    useEffect(() => {
        if (mapInstance.current) {
            loadMapData();
        }
    }, [linkedWells, selectedPoint]);

    // Загрузка данных о горизонтах
    const handleShowHorizonTable = async (wellId) => {
        setLoadingHorizonData(true);
        setIsHorizonModalVisible(true);

        try {
            const response = await fetch(`/api/horizont/table?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Horizon Data Response:', data);

            const formattedData = data.horizonts.$values.map(item => ({
                ...item,
                key: item.idHorizont ? item.idHorizont.toString() : `${Math.random()}`,
                fieldName: item.fieldName || "Нет данных",
                wellName: item.wellName || "Нет данных"
            }));

            setHorizonData(formattedData);
        } catch (error) {
            console.error('Error loading horizon data:', error);
        } finally {
            setLoadingHorizonData(false);
        }
    };

    // Настройки для Highcharts
    const options = {
        chart: {
            type: 'pie',
        },
        title: {
            text: 'График КВ по скважинам',
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f}%',
                },
            },
        },
        series: [
            {
                name: 'Процент',
                data: chartData,
            },
        ],
        credits: {
            enabled: false,
        },
    };

    // Столбцы для таблицы
    const columns = [
        { title: '№Скважины', dataIndex: 'name', key: 'name' },
        { title: 'Цех', dataIndex: ['workshop', 'name'], key: 'workshop' },
        { title: 'НГДУ', dataIndex: ['workshop', 'ngdu', 'name'], key: 'ngdu' },
        { title: 'КВ', dataIndex: 'lastratio', key: 'lastratio' },
    ];

    return (
        <Layout style={{ background: 'white', }}>
            <Content style={{ }}>
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        {isGeologist && (
                            <Button
                                type="primary"
                                onClick={handleOpenRatioModal}
                                style={{ marginBottom: '16px' }}
                            >
                                Изменить КВ
                            </Button>
                        )}
                        <Table
                            style={{
                                width: '100%',
                                height: '350px',
                                borderRadius: '8px',
                            }}
                            dataSource={linkedWells}
                            columns={columns}
                            rowKey="idWell"
                            pagination={false}
                            scroll={{ x: "max-content", y: 350 }}
                        />
                        
                    </Col>
                </Row>
                <Row gutter={[16, 16]}>
                    <Col span={8} style={{
                        width: '100%',
                        height: '500px',
                 
                        borderRadius: '8px',
                        marginTop: '10px',
                    }}>
                        <Card >
                            <HighchartsReact highcharts={Highcharts} options={options} />
                        </Card>
                    </Col>
                    <Col span={16}>
                        <div
                            ref={mapRef}
                            style={{
                                width: '100%',
                                height: '500px',
                              
                                borderRadius: '8px',
                                marginTop: '10px',
                            }}
                        />
                    </Col>
                </Row>

                <Drawer
                    title="Информация о скважине"
                    placement="right"
                    onClose={() => setDrawerVisible(false)}
                    visible={drawerVisible}
                    width={400}
                >
                    {selectedPoint && (
                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="Название">{selectedPoint.name}</Descriptions.Item>
                            <Descriptions.Item label="Пласт">
                                <Button
                                    type="link"
                                    onClick={() => handleShowHorizonTable(selectedPoint.idWell)}
                                >
                                    Подробнее
                                </Button>
                            </Descriptions.Item>
                            <Descriptions.Item label="Кривизна">
                                <Button
                                    type="link"
                                    onClick={() => handleShowSlantTable(selectedPoint.idWell)}
                                >
                                    Подробнее
                                </Button>
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>
                <Modal
                    title="Данные о кривизне скважины"
                    visible={isSlantModalVisible}
                    onCancel={() => setIsSlantModalVisible(false)}
                    footer={null}
                    width={800}
                >
                    <Table
                        columns={[
                            { title: "Глубина (м)", dataIndex: "height", key: "height" },
                            { title: "Искривление (°)", dataIndex: "slant", key: "slant" },
                            { title: "Азимут (°)", dataIndex: "azimuth", key: "azimuth" },
                        ]}
                        dataSource={slantData}
                        rowKey="key"
                        loading={loadingSlantData}
                        bordered
                        pagination={{
                            pageSize: pageSize,
                            showSizeChanger: true,
                            pageSizeOptions: ["10", "20", "50", "100"],
                            onShowSizeChange: (current, size) => {
                                setPageSize(size);
                            },
                            onChange: (page) => {
                                setPage(page);
                            },
                            showTotal: (total, range) => (
                                <Text strong>
                                    {range[0]}-{range[1]} из {total} записей
                                </Text>
                            ),
                        }}
                        scroll={{ x: "max-content", y: 400 }}
                    />
                </Modal>
                <Modal
                    title="Изменить КВ"
                    visible={isRatioModalVisible}
                    onOk={handleSaveAllRatios}
                    onCancel={() => setIsRatioModalVisible(false)}
                    width={700}
                >
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {linkedWells.map((well) => (
                            <div key={well.idLink} style={{
                                marginBottom: 16,
                                padding: 12,
                                border: '1px solid #f0f0f0',
                                borderRadius: 4
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <Text strong>Скважина №: {well.name}</Text>
                                    </div>

                                    <InputNumber
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={ratios[well.idLink] || 0}
                                        onChange={(value) => setRatios({ ...ratios, [well.idLink]: value })}
                                        style={{ width: 100 }}
                                    />

                                    <div style={{ fontSize: 12, color: '#888' }}>
                                        <Text type="secondary">Расчётный:</Text>
                                        <Text code>
                                            {calculatedRatios[well.idLink] !== undefined
                                                ? calculatedRatios[well.idLink].toFixed(4)
                                                : '—'}
                                        </Text>
                                        <Text type="secondary">Прогнозируемый МО:</Text>
                                        <Text code>
                                            {forecastedRatio[well.idLink] !== undefined
                                                ? forecastedRatio[well.idLink].toFixed(4)
                                                : '—'}
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        background: '#fafafa',
                        borderRadius: 4
                    }}>
                        <Text strong>Общая сумма: </Text>
                        <Text>{Object.values(ratios).reduce((sum, val) => sum + (Number(val) || 0), 0)}</Text>
                        {Object.values(ratios).reduce((sum, val) => sum + (Number(val) || 0), 0) > 1 && (
                            <Text type="danger" style={{ marginLeft: 8 }}>Превышено 1!</Text>
                        )}
                    </div>
                </Modal>

                <Modal
                    title="Ошибка"
                    visible={isWarningModalVisible}
                    onOk={() => setIsWarningModalVisible(false)}
                    onCancel={() => setIsWarningModalVisible(false)}
                >
                    <p>Сумма всех Ratio не должна превышать 1!</p>
                </Modal>

                <Modal
                    title="Информация о горизонтах"
                    visible={isHorizonModalVisible}
                    onCancel={() => setIsHorizonModalVisible(false)}
                    footer={null}
                    width={800}
                >
                    <Table
                        columns={[
                            { title: "Название горизонта", dataIndex: "name", key: "name" },
                            { title: "Область", dataIndex: "fieldName", key: "fieldName" },
                            { title: "№ скважины", dataIndex: "wellName", key: "wellName" },
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
                        ]}
                        dataSource={horizonData}
                        rowKey="key"
                        loading={loadingHorizonData}
                        bordered
                        pagination={{
                            pageSize: pageSize,
                            showSizeChanger: true,
                            pageSizeOptions: ["10", "20", "50", "100"],
                            onShowSizeChange: (current, size) => {
                                setPageSize(size);
                            },
                            onChange: (page) => {
                                setPage(page);
                            },
                            showTotal: (total, range) => (
                                <Text strong>
                                    {range[0]}-{range[1]} из {total} записей
                                </Text>
                            ),
                        }}
                        scroll={{ x: "max-content", y: 400 }}
                    />
                </Modal>
            </Content>
        </Layout>
    );
};

export default Mapp;