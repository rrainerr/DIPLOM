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
import { Layout, Row, Col, Table, Drawer, Descriptions, Button, Modal, Input, message, Card, Typography, InputNumber, Alert, Tooltip, Empty } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Circle } from 'ol/style';
import { WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import MapModule from './MapModule';

const { Content } = Layout;
const { Text } = Typography;

const ChartsModule = ({
    crmData,
    loadingCrm,
    usedDefaults,
    onShowDefaults
}) => {
    const [defaultsModalVisible, setDefaultsModalVisible] = useState(false);

    const getProductionChartOptions = (crmData) => {
        const baseOptions = {
            chart: {
                type: 'spline',
                backgroundColor: '#f9f9f9',
                height: '350'
            },
            title: {
                text: 'История и прогноз добычи',
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#333'
                }
            },
            xAxis: {
                type: 'datetime',
                title: { text: 'Дата' },
                crosshair: true
            },
            yAxis: {
                title: { text: 'Дебит (м³/сут)' },
                min: 0
            },
            tooltip: {
                shared: true,
                formatter: function () {
                    if (this.point && this.point.name) {
                        return `<b>${Highcharts.dateFormat('%B %Y', this.x)}</b><br/>
                    <span style="color:${this.point.color || this.series.color}">●</span> 
                    ${this.point.name}`;
                    }

                    if (!this.points) return '';
                    let tooltip = `<b>${Highcharts.dateFormat('%B %Y', this.x)}</b><br/>`;
                    this.points.forEach(point => {
                        tooltip += `<span style="color:${point.color}">●</span> 
                      ${point.series.name}: <b>${point.y?.toFixed(2) || '0'} м³/сут</b><br/>`;
                    });
                    return tooltip;
                }
            },
            plotOptions: {
                spline: {
                    marker: { enabled: true }
                },
                scatter: {
                    tooltip: {
                        pointFormat: '<b>{point.name}</b>'
                    }
                }
            },
            legend: {
                align: 'center',
                verticalAlign: 'bottom'
            },
            credits: { enabled: false }
        };

        if (!crmData?.historicalProduction?.$values) {
            return { ...baseOptions, series: [] };
        }

        const prepareData = (dataArray) => {
            return (Array.isArray(dataArray.$values) ? dataArray.$values : [])
                .filter(item => item?.date && item.value !== undefined)
                .map(item => ({
                    x: new Date(item.date).getTime(),
                    y: item.value,
                    type: item.type
                }));
        };

        const historicalData = prepareData(crmData.historicalProduction);
        const forecastedData = prepareData(crmData.forecastedProduction);

        const series = [
            {
                name: 'Фактический дебит',
                data: historicalData,
                color: '#1890ff',
                zIndex: 1,
                marker: {
                    symbol: 'circle'
                }
            },
            {
                name: 'Прогноз дебита',
                data: forecastedData,
                color: '#52c41a',
                dashStyle: 'Dash',
                zIndex: 0,
                marker: {
                    symbol: 'diamond'
                }
            },
        ];

        

        return {
            ...baseOptions,
            series: series
        };
    };

    return (
        <Card>
            {crmData ? (
                <HighchartsReact
                    highcharts={Highcharts}
                    options={getProductionChartOptions(crmData)}
                />
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
                    {loadingCrm ? 'Загрузка данных о дебитах...' : 'Нет данных о дебитах'}
                </div>
            )}
        </Card>
    );
};

const Mapp = () => {
    const params = new URLSearchParams(window.location.search);
    const [isSlantModalVisible, setIsSlantModalVisible] = useState(false);
    const [loadingSlantData, setLoadingSlantData] = useState(false);
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());
    const [linkedWells, setLinkedWells] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [slantData, setSlantData] = useState([]);
    const [isHorizonModalVisible, setIsHorizonModalVisible] = useState(false);
    const [horizonData, setHorizonData] = useState([]);
    const [loadingHorizonData, setLoadingHorizonData] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [usedDefaults, setUsedDefaults] = useState([]);
    const [defaultsModalVisible, setDefaultsModalVisible] = useState(false);

    const [crmData, setCrmData] = useState(null);
    const [loadingCrm, setLoadingCrm] = useState(false);

    const location = useLocation();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isGeologist = user?.roleName === 'Геолог';

    // Загрузка данных CRM
    const fetchCrmData = async (producerId) => {
        setLoadingCrm(true);
        try {
            const response = await fetch(`/api/CrmCalculator/production/${producerId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('CRM Data Response:', data);

            const formattedData = {
                ...data,
                historicalProduction: data.historicalProduction || { $values: [] },
                forecastedProduction: data.forecastedProduction || { $values: [] },
                currentProduction: data.currentProduction || 0
            };

            setCrmData(formattedData);

            if (data.appliedDefaults) {
                setUsedDefaults(data.appliedDefaults);
            }
        } catch (error) {
            console.error('Error loading CRM data:', error);
            message.error('Не удалось загрузить данные о дебитах');
        } finally {
            setLoadingCrm(false);
        }
    };

    const handleShowSlantTable = async (wellId) => {
        setLoadingSlantData(true);
        setIsSlantModalVisible(true);
        setSlantData([]);

        try {
            const response = await fetch(`/api/well/wellslant/table?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Slant Data Response:', data);

            let formattedData = [];
            if (Array.isArray(data)) {
                formattedData = data;
            } else if (data && typeof data === 'object') {
                formattedData = data.$values || [];
            }

            const validatedData = formattedData.filter(item =>
                item.height !== undefined &&
                item.slant !== undefined &&
                item.azimuth !== undefined
            );

            setSlantData(validatedData.map(item => ({
                ...item,
                key: item.idWellSlant || `${wellId}-${item.height}-${Math.random().toString(36).substr(2, 9)}`
            })));
        } catch (error) {
            console.error('Error loading slant data:', error);
            message.error('Не удалось загрузить данные о кривизне');
            setSlantData(null);
        } finally {
            setLoadingSlantData(false);
        }
    };


    // Загрузка данных о связанных скважинах
    const fetchLinkedWells = async (wellId) => {
        try {
            const response = await fetch(`/api/map/linkNag?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Linked Wells Response:', data);

            if (data.appliedDefaults) {
                setUsedDefaults(prev => [...prev, ...(data.appliedDefaults.$values || data.appliedDefaults || [])]);
            }

            const linkedWellsData = data.$values || data;

            if (!Array.isArray(linkedWellsData)) {
                throw new Error('Expected data to be an array');
            }

            setLinkedWells(linkedWellsData);
        } catch (error) {
            console.error('Error loading linked wells:', error);
        }
    };




    // Загрузка данных о точках и обновление карты
    const loadMapData = async () => {
        try {
            const response = await fetch('/api/well/map/point');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('API Response:', data);

            const pointsData = data.$values || data;

            if (!Array.isArray(pointsData)) {
                throw new Error('Expected data to be an array');
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
                        const linkedWell = pointsData.find((w) => w.idWell === link.wellLink);
                        if (linkedWell) {
                            const linkedCoords = fromLonLat([linkedWell.longitude, linkedWell.latitude]);
                            lineCoordinates.push({
                                coords: [coords, linkedCoords],
                                debit: point.debit,
                                lastratio: link.lastratio,
                            });
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

                const lineColor = line.debit > 100 ? 'red' : 'red';

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
                            fill: new Fill({ color: 'rgba(255, 255, 255, 0.8)' }),
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
            fetchCrmData(wellId);
        }

        if (!mapRef.current) return;

        if (!mapInstance.current) {
            const map = new Map({
                target: mapRef.current,
                layers: [
                    new TileLayer({
                        source: new OSM(),
                        zIndex: 0
                    }),
                    new TileLayer({
                        source: new XYZ({
                            url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
                            attributions: '© OpenTopoMap'
                        }),
                        opacity: 1,
                        zIndex: 1,
                        preload: Infinity,
                        className: 'topo-layer'
                    }),
                    new VectorLayer({
                        source: vectorSourceRef.current,
                        zIndex: 2
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

    // Обновление карта при изменении данных
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

    // Настройки для Highcharts (круговая диаграмма)
   

    // Столбцы для таблицы
    const columns = [
        {
            title: '№Скважины',
            dataIndex: 'name',
            key: 'name',
        },
        { title: 'Цех', dataIndex: ['workshop', 'name'], key: 'workshop' },
        { title: 'НГДУ', dataIndex: ['workshop', 'ngdu', 'name'], key: 'ngdu' },
        {
            title: 'КВ',
            dataIndex: 'lastratio',
            key: 'lastratio',
            render: (value, record) => {
                const hasDefaults = Array.isArray(usedDefaults) &&
                    usedDefaults.some(d => d.wellId === record.idWell);
                return (
                    <Tooltip
                        title={hasDefaults ?
                            "Расчёт выполнен с использованием усреднённых значений" :
                            "Расчёт выполнен на основе полных данных"
                        }
                    >
                        <span style={{
                            fontWeight: 'bold',
                            color: hasDefaults ? '#faad14' : '#52c41a'
                        }}>
                            {value}
                            {hasDefaults && <WarningOutlined style={{ marginLeft: 8, color: '#faad14' }} />}
                        </span>
                    </Tooltip>
                );
            }
        },
    ];


    return (
        <Layout style={{ background: 'white' }}>
            <Content>
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <ChartsModule
                            crmData={crmData}
                            loadingCrm={loadingCrm}
                            usedDefaults={usedDefaults}
                            onShowDefaults={() => setDefaultsModalVisible(true)}
                        />
                    </Col>
                    <Col span={12}>
                        <Card
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span>Связанные скважины</span>
                                   
                                </div>
                            }
                        >
                            <Table
                                style={{
                                    width: '100%',
                                    height: '295px',
                                    borderRadius: '5px',
                                }}
                                dataSource={linkedWells}
                                columns={columns}
                                rowKey="idWell"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total, range) => (
                                        <Text strong>
                                            {range[0]}-{range[1]} из {total} записей
                                        </Text>
                                    ),
                                }}
                                scroll={{ x: "max-content", y: 300 }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                  <MapModule
                            onShowHorizonTable={() => { }}
                            onShowSlantTable={handleShowSlantTable}
                            linkedWells={linkedWells}
                            style={{ marginTop: 20 }}
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
                            <Descriptions.Item label="Дебит">{selectedPoint.debit}</Descriptions.Item>
                            <Descriptions.Item label="Давление">{selectedPoint.pressure}</Descriptions.Item>
                            <Descriptions.Item label="Пласт">
                                {selectedPoint.layer}
                                <Button
                                    type="link"
                                    onClick={() => handleShowHorizonTable(selectedPoint.idWell)}
                                >
                                    Подробнее
                                </Button>
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>              

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
                <Modal
                    title="Данные о кривизне скважины"
                    visible={isSlantModalVisible}
                    onCancel={() => setIsSlantModalVisible(false)}
                    footer={null}
                    width={800}
                >
                    {slantData && slantData.length > 0 ? (
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
                    ) : (
                        <Empty
                            description={loadingSlantData ? "Загрузка данных..." : "Данные о кривизне отсутствуют"}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </Modal>
            </Content>
        </Layout>
    );
};

export default Mapp;