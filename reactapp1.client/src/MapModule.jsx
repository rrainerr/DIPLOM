import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource, XYZ } from 'ol/source';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Style, Icon, Text as OlText, Stroke, Fill, RegularShape, Circle } from 'ol/style';
import { Drawer, Descriptions, Button, Modal, Table, Empty, Typography, Radio, Card, Form, Input, message, Tabs } from 'antd';
import { useLocation } from 'react-router-dom';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const { Text } = Typography;

const UnifiedMapModule = ({
    onShowHorizonTable,
    onShowSlantTable,
    linkedWells
}) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [isHorizonModalVisible, setIsHorizonModalVisible] = useState(false);
    const [horizonData, setHorizonData] = useState([]);
    const [loadingHorizonData, setLoadingHorizonData] = useState(false);
    const [pageSize, setPageSize] = useState(10);
    const [mapMode, setMapMode] = useState('standard');
    const location = useLocation();
    const [isPackerModalVisible, setIsPackerModalVisible] = useState(false);
    const [packerData, setPackerData] = useState([]);
    const [loadingPackerData, setLoadingPackerData] = useState(false);
    const user = JSON.parse(sessionStorage.getItem('user'));
    const [slantData, setSlantData] = useState([]);
    const [loadingSlantData, setLoadingSlantData] = useState(false);
    const [isSlantModalVisible, setIsSlantModalVisible] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [chartOptions, setChartOptions] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [horizonsForChart, setHorizonsForChart] = useState([]);
    const horizonColors = [
        'rgba(255, 99, 132, 0.3)',  // розовый
        'rgba(54, 162, 235, 0.3)',  // голубой
        'rgba(255, 206, 86, 0.3)',  // желтый
        'rgba(75, 192, 192, 0.3)',  // бирюзовый
        'rgba(153, 102, 255, 0.3)', // фиолетовый
        'rgba(255, 159, 64, 0.3)',  // оранжевый
        'rgba(199, 199, 199, 0.3)', // серый
        'rgba(83, 102, 255, 0.3)',  // синий
        'rgba(40, 159, 64, 0.3)',   // зеленый
        'rgba(210, 105, 30, 0.3)'   // коричневый
    ];
    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            depth: record.depth
        });
        setIsModalVisible(true);
    };
    const fetchHorizonsForChart = async (wellId) => {
        try {
            const response = await fetch(`/api/horizont/table?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const formattedData = data.horizonts?.$values || data || [];

            const validHorizons = formattedData.filter(horizon =>
                horizon.roof !== null && horizon.roof !== undefined &&
                horizon.sole !== null && horizon.sole !== undefined
            );

            setHorizonsForChart(validHorizons);
            return validHorizons;
        } catch (error) {
            console.error('Ошибка загрузки пластов для графика:', error);
            return [];
        }
    };

    const createSimpleChartOptions = (data, horizons = []) => {
        const sortedData = [...data].sort((a, b) => a.height - b.height);

        // Цвета для пластов
        const horizonColors = [
            'rgba(255, 99, 132, 0.3)',  // розовый
            'rgba(54, 162, 235, 0.3)',  // голубой
            'rgba(255, 206, 86, 0.3)',  // желтый
            'rgba(75, 192, 192, 0.3)',  // бирюзовый
            'rgba(153, 102, 255, 0.3)', // фиолетовый
            'rgba(255, 159, 64, 0.3)',  // оранжевый
            'rgba(199, 199, 199, 0.3)', // серый
            'rgba(83, 102, 255, 0.3)',  // синий
            'rgba(40, 159, 64, 0.3)',   // зеленый
            'rgba(210, 105, 30, 0.3)'   // коричневый
        ];

        const horizonSeries = horizons.map((horizon, index) => {
            const roof = parseFloat(horizon.roof);
            const sole = parseFloat(horizon.sole);
            const colorIndex = index % horizonColors.length;

            return [
                {
                    name: `Кровля: ${horizon.name}`,
                    type: 'line',
                    data: [
                        [Math.min(...sortedData.map(item => item.slant)) - 5, roof],
                        [Math.max(...sortedData.map(item => item.slant)) + 5, roof]
                    ],
                    color: '#e74c3c', // ярко-красный
                    dashStyle: 'dash',
                    lineWidth: 3,
                    marker: { enabled: false },
                    showInLegend: false,
                    enableMouseTracking: true,
                    zIndex: 2,
                    tooltip: {
                        headerFormat: '',
                        pointFormat: `<b>${horizon.name || 'Пласт'}</b><br>Кровля: <b>{point.y} м</b>`
                    }
                },
                {
                    name: `Подошва: ${horizon.name}`,
                    type: 'line',
                    data: [
                        [Math.min(...sortedData.map(item => item.slant)) - 5, sole],
                        [Math.max(...sortedData.map(item => item.slant)) + 5, sole]
                    ],
                    color: '#3498db',
                    dashStyle: 'dash',
                    lineWidth: 3,
                    marker: { enabled: false },
                    showInLegend: false,
                    enableMouseTracking: true,
                    zIndex: 2,
                    tooltip: {
                        headerFormat: '',
                        pointFormat: `<b>${horizon.name || 'Пласт'}</b><br>Подошва: <b>{point.y} м</b>`
                    }
                }
            ];
        }).flat();

        return {
            chart: {
                type: 'line',
                height: 550,
                backgroundColor: '#f8f9fa',
                borderRadius: 10,
                style: {
                    fontFamily: 'Arial, sans-serif'
                },
                events: {
                    load: function () {
                        const chart = this;
                        horizons.forEach((horizon, index) => {
                            const roof = parseFloat(horizon.roof);
                            const sole = parseFloat(horizon.sole);
                            const colorIndex = index % horizonColors.length;

                            const renderer = chart.renderer;
                            const xAxis = chart.xAxis[0];
                            const yAxis = chart.yAxis[0];

                            const x1 = xAxis.toPixels(xAxis.min);
                            const x2 = xAxis.toPixels(xAxis.max);
                            const y1 = yAxis.toPixels(roof);
                            const y2 = yAxis.toPixels(sole);


                            renderer.rect(x1, y1, x2 - x1, y2 - y1)
                                .attr({
                                    fill: horizonColors[colorIndex],
                                    stroke: 'rgba(0, 0, 0, 0.2)',
                                    'stroke-width': 1,
                                    zIndex: 1,
                                    opacity: 0.7
                                })
                                .add();

                            const midY = yAxis.toPixels((roof + sole) / 2);
                            renderer.text(horizon.name || `Пласт ${index + 1}`, x1 + 10, midY)
                                .css({
                                    color: '#2c3e50',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                })
                                .attr({
                                    zIndex: 3
                                })
                                .add();
                        });
                    }
                }
            },
            title: {
                text: 'Диаграмма кривизны скважины',
                style: {
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#2c3e50'
                }
            },
            xAxis: {
                title: {
                    text: 'Зенитный угол (°)',
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#34495e'
                    }
                },
                min: Math.min(...sortedData.map(item => item.slant)) - 5,
                max: Math.max(...sortedData.map(item => item.slant)) + 5,
                gridLineWidth: 1,
                gridLineColor: 'rgba(0, 0, 0, 0.1)',
                lineWidth: 2,
                tickWidth: 1
            },
            yAxis: {
                title: {
                    text: 'Глубина (м)',
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#34495e'
                    }
                },
                reversed: true,
                min: Math.min(...sortedData.map(item => item.height)) - 1,
                max: Math.max(...sortedData.map(item => item.height)) + 50,
                gridLineWidth: 1,
                gridLineColor: 'rgba(0, 0, 0, 0.1)',
                lineWidth: 2,
                tickWidth: 1
            },
            plotOptions: {
                line: {
                    lineWidth: 3,
                    states: {
                        hover: {
                            lineWidth: 4
                        }
                    }
                },
                scatter: {
                    marker: {
                        radius: 6,
                        states: {
                            hover: {
                                radius: 8
                            }
                        }
                    }
                }
            },
            series: [
                ...horizonSeries,
                {
                    name: 'Кривизна скважины',
                    data: sortedData.map(item => [item.slant, item.height]),
                    color: '#e74c3c',
                    lineWidth: 4,
                    marker: {
                        enabled: true,
                        radius: 5,
                        fillColor: '#ffffff',
                        lineWidth: 3,
                        lineColor: '#e74c3c',
                        symbol: 'circle',
                        states: {
                            hover: {
                                radius: 7,
                                fillColor: '#e74c3c'
                            }
                        }
                    },
                    tooltip: {
                        headerFormat: '<b>Точка измерения</b><br>',
                        pointFormat: 'Глубина: <b>{point.y} м</b><br>Зенитный угол: <b>{point.x}°</b>'
                    },
                    zIndex: 5,
                    shadow: {
                        color: 'rgba(0, 0, 0, 0.2)',
                        width: 5,
                        offsetX: 0,
                        offsetY: 0
                    }
                }
            ],
            credits: {
                enabled: false
            },
            legend: {
                enabled: false
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 1,
                borderColor: '#bdc3c7',
                borderRadius: 8,
                shadow: true,
                style: {
                    fontSize: '13px',
                    padding: '10px'
                },
                useHTML: true
            },
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        chart: {
                            height: 400
                        },
                        title: {
                            style: {
                                fontSize: '16px'
                            }
                        }
                    }
                }]
            }
        };
    };

    const handleShowSlantTable = async (wellId) => {
        setLoadingSlantData(true);
        setIsSlantModalVisible(true);
        setSlantData([]);
        setChartOptions(null);
        setHorizonsForChart([]);

        try {
            const [slantResponse, horizons] = await Promise.all([
                fetch(`/api/well/wellslant/table?wellId=${wellId}`),
                fetchHorizonsForChart(wellId)
            ]);

            if (!slantResponse.ok) throw new Error(`HTTP error! status: ${slantResponse.status}`);

            const data = await slantResponse.json();
            console.log('Данные искривления:', data);

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

            const slantDataWithKeys = validatedData.map(item => ({
                ...item,
                key: item.idWellSlant || `${wellId}-${item.height}-${Math.random().toString(36).substr(2, 9)}`
            }));

            setSlantData(slantDataWithKeys);

            if (slantDataWithKeys.length > 0) {
                setChartOptions(createSimpleChartOptions(slantDataWithKeys, horizons));
            }
        } catch (error) {
            console.error('Не удалось загрузить:', error);
            message.error('Не удалось загрузить данные о кривизне');
            setSlantData(null);
        } finally {
            setLoadingSlantData(false);
        }
    };

    const fetchPackerData = async (wellId) => {
        setLoadingPackerData(true);
        try {
            const response = await fetch(`/api/paker/table?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Данные пакера:', data);

            const packersData = data.packers?.$values || data.$values || data;

            if (!Array.isArray(packersData)) {
                throw new Error('Не удалось загрузить');
            }

            const formattedData = packersData.map(item => ({
                ...item,
                key: item.idPacker || `${wellId}-${Math.random()}`,
                name: item.name || "Нет данных",
                depth: item.depth || "Нет данных",
                wellName: item.wellName || "Нет данных"
            }));

            setPackerData(formattedData);
        } catch (error) {
            console.error('Не удалось загрузить ', error);
            message.error('Не удалось загрузить данные о пакерах');
        } finally {
            setLoadingPackerData(false);
        }
    };


    const handleShowPackerTable = async (wellId) => {
        setIsPackerModalVisible(true);
        await fetchPackerData(wellId);
    };

    const getRoute = async (start, end) => {
        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`
            );
            if (!response.ok) throw new Error('Ошибка при получении маршрута');
            const data = await response.json();
            return data.routes[0].geometry.coordinates;
        } catch (error) {
            console.error('Ошибка при получении маршрута:', error);
            return null;
        }
    };


    const addRouteToMap = (coordinates) => {
        const routeFeature = new Feature({
            geometry: new LineString(coordinates),
        });

        const routeStyle = new Style({
            stroke: new Stroke({
                color: 'blue',
                width: 3,
            }),
        });

        routeFeature.setStyle(routeStyle);
        vectorSourceRef.current.addFeature(routeFeature);
    };


    const loadStandardMapData = async () => {
        try {
            const response = await fetch('/api/well/map/point');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('АПИ:', data);

            const pointsData = (() => {
                if (Array.isArray(data)) return data;
                if (data?.$values) return data.$values;
                return [];
            })();

            if (!Array.isArray(pointsData)) {
                throw new Error('Не удалось загрузить: ' + JSON.stringify(data));
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
                        if (link.status === 1) {
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

    const loadRoutesMapData = async () => {
        try {
            const response = await fetch('/api/well/map/point');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('АПИ:', data);

            const pointsData = (() => {
                if (Array.isArray(data)) return data;
                if (data?.$values) return data.$values;
                return [];
            })();

            if (!Array.isArray(pointsData)) {
                throw new Error('Не удалось загрузить: ' + JSON.stringify(data));
            }

            const newFeatures = [];

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
                    point.links.$values.forEach(async (link) => {
                        const linkedWell = pointsData.find((w) => w.idWell === link.wellLink);
                        if (linkedWell) {
                            const route = await getRoute(
                                [point.longitude, point.latitude],
                                [linkedWell.longitude, linkedWell.latitude]
                            );
                            if (route) {
                                addRouteToMap(route.map(coord => fromLonLat(coord)));
                            }
                        }
                    });
                }
            });

            vectorSourceRef.current.clear();
            vectorSourceRef.current.addFeatures(newFeatures);
        } catch (error) {
            console.error('Не удалось загрузить:', error);
        }
    };

    const handleShowHorizonTable = async (wellId) => {
        setLoadingHorizonData(true);
        setIsHorizonModalVisible(true);

        try {
            const response = await fetch(`/api/horizont/table?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Данные пластов:', data);

            const formattedData = data.horizonts.$values.map(item => ({
                ...item,
                key: item.idHorizont ? item.idHorizont.toString() : `${Math.random()}`,
                fieldName: item.fieldName || "Нет данных",
                wellName: item.wellName || "Нет данных"
            }));

            setHorizonData(formattedData);
        } catch (error) {
            console.error('Не удалось загрузить:', error);
        } finally {
            setLoadingHorizonData(false);
        }
    };


    const handleMapModeChange = (e) => {
        setMapMode(e.target.value);
    };


    useEffect(() => {
        if (mapInstance.current) {
            if (mapMode === 'standard') {
                loadStandardMapData();
            } else {
                loadRoutesMapData();
            }
        }
    }, [mapMode, linkedWells, selectedPoint]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const newDepth = values.depth;

            const updatedPacker = await updatePacker(editingRecord.idPacker, newDepth);

            const updatedData = packerData.map(item =>
                item.idPacker === editingRecord.idPacker
                    ? { ...item, depth: newDepth }
                    : item
            );

            setPackerData(updatedData);
            setIsModalVisible(false);
            setIsPackerModalVisible(false);
            message.success('Изменения успешно сохранены');

            setTimeout(() => {
                window.location.reload(true);
            }, 500);

        } catch (error) {
            console.error("Ошибка при сохранении:", error);
            message.error('Не удалось сохранить изменения');
        }
    };
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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const wellId = params.get('wellId');

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
                    console.warn('Не удалось загрузить:', pointData);
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

        if (mapMode === 'standard') {
            loadStandardMapData();
        } else {
            loadRoutesMapData();
        }
    }, [location]);

    return (
        <Card
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Карта скважин</span>
                    <Radio.Group
                        value={mapMode}
                        onChange={handleMapModeChange}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="standard">Стандартная карта</Radio.Button>
                        <Radio.Button value="routes">Карта с маршрутами</Radio.Button>
                    </Radio.Group>
                </div>
            }
            style={{ marginTop: 10 }}
        >
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '342px',
                    borderRadius: 8,
                }}
            />

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
                        <Descriptions.Item label="Пакер">
                            <Button
                                type="link"
                                onClick={() => handleShowPackerTable(selectedPoint.idWell)}
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
                width={600}
            >
                <Table
                    columns={[
                        { title: "Название горизонта", dataIndex: "name", key: "name" },
                        { title: "Область", dataIndex: "fieldName", key: "fieldName" },
                        { title: "№ скважины", dataIndex: "wellName", key: "wellName" },
                        { title: "Кровля", dataIndex: "roof", key: "roof" },
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
                title="Информация о пакерах скважины"
                visible={isPackerModalVisible}
                onCancel={() => setIsPackerModalVisible(false)}
                footer={null}
                width={600}
            >
                <Table
                    columns={[
                        { title: "Наименование пакера", dataIndex: "name", key: "name" },
                        { title: "Глубина установки", dataIndex: "depth", key: "depth" },
                        { title: "Номер скважины", dataIndex: "wellName", key: "wellName" },
                        {
                            title: "",
                            key: "actions",
                            render: (_, record) => (
                                user?.roleName === 'Администратор' && (
                                    <Button
                                        type="primary"
                                        onClick={() => handleEdit(record)}
                                    >
                                        Редактировать
                                    </Button>
                                )
                            ),
                        }
                    ]}
                    dataSource={packerData}
                    rowKey="key"
                    loading={loadingPackerData}
                    bordered
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
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
                width={600}
            >
                {slantData && slantData.length > 0 ? (
                    <Tabs
                        defaultActiveKey="1"
                        items={[
                            {
                                key: "1",
                                label: "Таблица данных",
                                children: (
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
                                            showTotal: (total, range) => (
                                                <Text strong>
                                                    {range[0]}-{range[1]} из {total} записей
                                                </Text>
                                            ),
                                        }}
                                        scroll={{ x: "max-content", y: 400 }}
                                    />
                                )
                            },
                            {
                                key: "2",
                                label: "Диаграмма кривизны",
                                children: (
                                    chartOptions ? (
                                        <div>
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={chartOptions}
                                            />
                                            {horizonsForChart.length > 0 && (
                                                <div style={{
                                                    marginTop: 10,
                                                    padding: 5,
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: 8,
                                                    border: '1px solid #e9ecef'
                                                }}>
                                                    <Text strong style={{ fontSize: '16px', color: '#2c3e50', marginBottom: 10, display: 'block' }}>
                                                        📋 Список пластов:
                                                    </Text>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                                                        {horizonsForChart.map((horizon, index) => {
                                                            const colorIndex = index % horizonColors.length;
                                                            return (
                                                                <div key={index} style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    padding: '8px 12px',
                                                                    backgroundColor: 'white',
                                                                    borderRadius: 6,
                                                                    border: '1px solid #dee2e6'
                                                                }}>
                                                                    <span style={{
                                                                        display: 'inline-block',
                                                                        width: 20,
                                                                        height: 12,
                                                                        backgroundColor: horizonColors[colorIndex],
                                                                        border: '2px solid rgba(0, 0, 0, 0.2)',
                                                                        marginRight: 12,
                                                                        borderRadius: 3
                                                                    }}></span>
                                                                    <div style={{ flex: 1 }}>
                                                                        <Text strong style={{ fontSize: '14px', color: '#2c3e50' }}>
                                                                            {horizon.name || `Пласт ${index + 1}`}
                                                                        </Text>
                                                                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                                            Кровля: {horizon.roof} м | Подошва: {horizon.sole} м
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Empty description="Нет данных для построения графика" />
                                    )
                                )
                            }
                        ]}
                    />
                ) : (
                    <Empty
                        description={loadingSlantData ? "Загрузка данных..." : "Данные о кривизне отсутствуют"}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                )}
            </Modal>
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
                        }]}
                    >
                        <Input placeholder="Введите глубину" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UnifiedMapModule;