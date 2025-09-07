import React, { useEffect, useState, useRef } from 'react';
import { Map, View } from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import 'ol/ol.css';
import { Form, Input, Button, Select, message, Typography, notification, Checkbox } from 'antd';

const { Title } = Typography;

const StepIndicator = ({ activeStep }) => (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div
            style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: activeStep === 1 ? '#1890ff' : '#ccc',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '10px',
            }}
        >
            1
        </div>
        <div
            style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: activeStep === 2 ? '#1890ff' : '#ccc',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            2
        </div>
    </div>
);

const Mapp = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [activeStep, setActiveStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [selectedCoords, setSelectedCoords] = useState(null);
    const [workshops, setWorkshops] = useState([]);
    const [types, setTypes] = useState([]);
    const [wells, setWells] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedWells, setSelectedWells] = useState([]);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();

    useEffect(() => {
        if (!mapRef.current || activeStep !== 2) return;

        const map = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            view: new View({
                center: fromLonLat([37.6173, 55.7558]),
                zoom: 10,
            }),
        });

        mapInstance.current = map;

        map.on('singleclick', (event) => {
            const coords = toLonLat(event.coordinate);
            setSelectedCoords(coords);
        });

        return () => {
            if (mapInstance.current) {
                mapInstance.current.setTarget(null);
            }
        };
    }, [activeStep]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const workshopsResponse = await fetch('/api/workshop');
                if (!workshopsResponse.ok) throw new Error('Ошибка загрузки цехов');
                const workshopsData = await workshopsResponse.json();
                setWorkshops(workshopsData.$values || workshopsData);

                const typesResponse = await fetch('/api/map/type');
                if (!typesResponse.ok) throw new Error('Ошибка загрузки типов');
                const typesData = await typesResponse.json();
                setTypes(typesData.$values || typesData);

                const wellsResponse = await fetch('/api/well/map');
                if (!wellsResponse.ok) throw new Error('Ошибка загрузки скважин');
                const wellsData = await wellsResponse.json();
                setWells(wellsData.$values || wellsData);
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                api.error({
                    message: 'Ошибка загрузки данных',
                    description: error.message,
                    placement: 'topRight',
                });
            }
        };

        loadData();
    }, [api]);

    const handleWorkshopChange = (value) => {
        const selectedWorkshop = workshops.find((workshop) => workshop.idWorkshop === value);
        if (selectedWorkshop) {
            if (selectedWorkshop.idType === 1 || selectedWorkshop.idType === 2) {
                setSelectedType(selectedWorkshop.idType);
                form.setFieldsValue({ type: selectedWorkshop.idType });
            }
        }
    };

    const handleTypeChange = (value) => {
        setSelectedType(value);
        setSelectedWells([]);
        form.setFieldsValue({ wells: [] });
    };

    const handleWellSelectionChange = (values) => {
        setSelectedWells(values);
    };

    const handleNext = (values) => {
        setFormData(values);
        setActiveStep(2);
    };

    const handleBack = () => {
        setActiveStep(1);
    };

    const showSuccessNotification = () => {
        api.success({
            message: 'Точка успешно добавлена',
            description: 'Новая точка была успешно сохранена в системе',
            placement: 'topRight',
            duration: 4.5,
            style: {
                width: 350,
            },
        });
    };

    const handleSave = async () => {
        if (!selectedCoords) {
            message.error('Пожалуйста, выберите координаты на карте');
            return;
        }

        const requestBody = {
            ...formData,
            longitude: selectedCoords[0],
            latitude: selectedCoords[1],
            idWorkshop: formData.workshop || 0,
            idType: selectedType || null,
            wellLinks: selectedType === 1 ? selectedWells.map(id => parseInt(id)) : [],
            wellLink: null
        };

        console.log('Отправляемые данные:', JSON.stringify(requestBody, null, 2));

        try {
            const hideLoading = message.loading('Сохранение точки...', 0);

            const response = await fetch('/api/well/map/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const newPoint = await response.json();
            console.log('Новая точка:', newPoint);

            hideLoading();
            showSuccessNotification();

            setActiveStep(1);
            setSelectedCoords(null);
            setSelectedWells([]);
            form.resetFields();

        } catch (error) {
            console.error('Ошибка при добавлении точки:', error);
            api.error({
                message: 'Ошибка при добавлении точки',
                description: error.message,
                placement: 'topRight',
                duration: 5,
            });
        }
    };

    const productionWells = wells.filter(well => well.idType === 2);

    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            {contextHolder}
            <StepIndicator activeStep={activeStep} />

            {activeStep === 1 ? (
                <Form form={form} onFinish={handleNext} layout="vertical" style={{ position: 'relative', padding: '20px', width: '500px' }}>
                    <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="workshop" label="Цех" rules={[{ required: true }]}>
                        <Select onChange={handleWorkshopChange}>
                            {Array.isArray(workshops) && workshops.length > 0 ? (
                                workshops.map((workshop) => (
                                    <Select.Option key={workshop.idWorkshop} value={workshop.idWorkshop}>
                                        {workshop.name}
                                    </Select.Option>
                                ))
                            ) : (
                                <Select.Option disabled>Нет данных</Select.Option>
                            )}
                        </Select>
                    </Form.Item>
                    <Form.Item name="type" label="Тип">
                        <Select
                            value={selectedType}
                            onChange={handleTypeChange}
                            disabled={selectedType !== null}
                        >
                            {Array.isArray(types) && types.length > 0 ? (
                                types.map((type) => (
                                    <Select.Option key={type.idType} value={type.idType}>
                                        {type.name}
                                    </Select.Option>
                                ))
                            ) : (
                                <Select.Option disabled>Нет данных</Select.Option>
                            )}
                        </Select>
                    </Form.Item>
                    <Form.Item name="wellRadius" label="Радиус скважины, м" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="drainageRadius" label="Радиус дренирования, м" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>

                    {selectedType === 1 && (
                        <Form.Item name="wells" label="Связанные добывающие скважины">
                            <Select
                                mode="multiple"
                                placeholder="Выберите добывающие скважины"
                                value={selectedWells}
                                onChange={setSelectedWells}
                                style={{ width: '100%' }}
                            >
                                {Array.isArray(productionWells) && productionWells.length > 0 ? (
                                    productionWells.map((well) => (
                                        <Select.Option key={well.idWell} value={well.idWell}>
                                            {well.name}
                                        </Select.Option>
                                    ))
                                ) : (
                                    <Select.Option disabled value="no-data">
                                        Нет доступных добывающих скважин
                                    </Select.Option>
                                )}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Button type="primary" htmlType="submit">Далее</Button>
                    </Form.Item>
                </Form>
            ) : (
                <div>
                    <div
                        ref={mapRef}
                        style={{
                            width: '1100px',
                            height: '400px',
                            border: '2px solid #ccc',
                            borderRadius: '8px',
                            margin: '20px 0',
                            position: 'relative',
                        }}
                    />
                    {selectedCoords && (
                        <div style={{ marginTop: '20px' }}>
                            <Input
                                addonBefore="Широта"
                                value={selectedCoords[1]}
                                onChange={(e) => setSelectedCoords([selectedCoords[0], parseFloat(e.target.value) || 0])}
                            />
                            <Input
                                addonBefore="Долгота"
                                value={selectedCoords[0]}
                                onChange={(e) => setSelectedCoords([parseFloat(e.target.value) || 0, selectedCoords[1]])}
                                style={{ marginTop: '10px' }}
                            />
                        </div>
                    )}
                    <div style={{ marginTop: '20px' }}>
                        <Button style={{ marginRight: '10px' }} onClick={handleBack}>
                            Назад
                        </Button>
                        <Button type="primary" onClick={handleSave}>
                            Сохранить
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mapp;