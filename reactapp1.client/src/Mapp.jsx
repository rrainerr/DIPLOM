import React, { useEffect, useState, useRef } from 'react';
import { Layout, Row, Col, Modal, InputNumber, message, Typography, Button, Alert, Empty, Table, Form } from 'antd';
import { useLocation } from 'react-router-dom';
import ChartsModule from './ChartsModule';
import MapModule from './MapModule';
import TableModule from './TableModule';
import { useNavigate } from 'react-router-dom';
import './App.css';

const { Content } = Layout;
const { Text } = Typography;

const Mapp = () => {
    const params = new URLSearchParams(window.location.search);
    const wellId = params.get("wellId");
    const [linkedWells, setLinkedWells] = useState([]);
    const [isRatioModalVisible, setIsRatioModalVisible] = useState(false);
    const [ratios, setRatios] = useState({});
    const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
    const [crmData, setCrmData] = useState(null);
    const [loadingCrm, setLoadingCrm] = useState(false);
    const [calculatedRatios, setCalculatedRatios] = useState({});
    const [forecastedRatio, setforecastedRatio] = useState({});
    const [usedDefaults, setUsedDefaults] = useState([]);
    const [defaultsModalVisible, setDefaultsModalVisible] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const location = useLocation();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isGeologist = user?.roleName === 'Геолог';

    const fetchLinkedWells = async (wellId) => {
        try {
            const response = await fetch(`/api/map/link?wellId=${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Данные связей:', data);

            if (data.appliedDefaults) {
                setUsedDefaults(data.appliedDefaults);
            }

            const linkedWellsData = data.$values || data;
            if (!Array.isArray(linkedWellsData)) {
                throw new Error('Не удалось загрузить');
            }

            setLinkedWells(linkedWellsData);
        } catch (error) {
            console.error('Не удалось загрузить:', error);
        }
    };


    const fetchCrmData = async (producerId) => {
        setLoadingCrm(true);
        try {
            const response = await fetch(`/api/CrmCalculator/production/${producerId}`);
            if (!response.ok) throw new Error(`Не удалось загрузить: ${response.status}`);

            const data = await response.json();
            const formattedData = {
                ...data,
                historicalProduction: data.historicalProduction || [],
                forecastedProduction: data.forecastedProduction || [],
                injectionDifferences: Object.keys(data.injectionRates || {}).reduce((acc, key) => {
                    acc[key] = (data.injectionRates[key] || 0) - ((data.currentInjectionRates || {})[key] || 0);
                    return acc;
                }, {})
            };

            setCrmData(formattedData);

            if (data.appliedDefaults) {
                setUsedDefaults(data.appliedDefaults);
            } else {
                setUsedDefaults([]);
            }
        } catch (error) {
            console.error('Не удалось загрузить:', error);
            message.error('Не удалось загрузить данные CRM');
        } finally {
            setLoadingCrm(false);
        }
    };

   

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
            const response = await fetch(`/api/CrmCalculator/ratios/${producerId}`);
            if (!response.ok) throw new Error(`Ошибка HTTP! Статус: ${response.status}`);

            const data = await response.json();
            console.log("Полный ответ сервера:", data);

            const ratiosArray = data.results?.$values || [];
            const defaultsArray = data.appliedDefaults?.$values || [];

            if (!Array.isArray(ratiosArray)) {
                throw new Error("Некорректный формат данных результатов");
            }

            const calculatedMap = {};
            const forecastedMap = {};

            ratiosArray.forEach(item => {
                const linkId = item.linkId || item.LinkId;
                const calculated = item.calculatedRatio || item.CalculatedRatio;
                const forecasted = item.forecastedRatio || item.ForecastedRatio;

                const linkedWell = linkedWells.find(well =>
                    well.idLink === linkId || well.idWell === item.injectorId || well.idWell === item.InjectorId
                );

                if (linkedWell && calculated !== undefined) {
                    calculatedMap[linkedWell.idLink] = calculated;
                    forecastedMap[linkedWell.idLink] = forecasted || calculated;
                }
            });

            setCalculatedRatios(calculatedMap);
            setforecastedRatio(forecastedMap);

            if (defaultsArray.length > 0) {
                setUsedDefaults(defaultsArray.map(item => ({
                    parameter: getParameterName(item.parameter || item.Parameter),
                    value: item.value || item.Value,
                    source: item.source || item.Source || "Среднее значение",
                    wellName: item.wellName || item.WellName || "Неизвестно",
                    wellId: item.wellId || item.WellId
                })));
            }

            message.success('Коэффициенты успешно загружены');
        } catch (error) {
            console.error("Ошибка загрузки коэффициентов:", error);
            message.error(`Ошибка при загрузке коэффициентов: ${error.message}`);
        }
    };

    const getParameterName = (param) => {
        const names = {
            'DrainageRadius': 'Радиус дренирования',
            'Permeability': 'Проницаемость',
            'Thickness': 'Мощность пласта',
            'Viscosity': 'Вязкость',
            'WellRadius': 'Радиус скважины',
            'SkinFactor': 'Скин-фактор'
        };
        return names[param] || param;
    };

    const validateRatios = () => {
        const totalRatio = Object.values(ratios).reduce((sum, ratio) => sum + (parseFloat(ratio) || 0), 0);
        return totalRatio <= 1;
    };

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
                IdWell: well.idWell,
            }));

            console.log("Данные обновления:", updates);

            const response = await fetch('/api/map/addMultiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            const responseText = await response.text();
            console.log('Данные:', responseText);

            if (!response.ok) {
                console.error('Не удалось загрузить:', responseText);
                throw new Error(responseText || 'Ошибка при сохранении Ratio');
            }

            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log('Данные:', responseData);
            } catch (jsonError) {
                console.error('Не удалось загрузить:', jsonError);
                throw new Error('Не удалось загрузить');
            }

            const updatedLinkedWells = linkedWells.map((well) => ({
                ...well,
                lastratio: ratios[well.idLink] || well.lastratio,
            }));

            setLinkedWells(updatedLinkedWells);
            message.success('Все Ratio успешно обновлены!');
            setIsRatioModalVisible(false);
            window.location.reload();
        } catch (error) {
            console.error('Не удалось загрузить:', error);
            message.error(error.message || 'Ошибка при сохранении Ratio');
        }
    };
   
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const wellId = params.get('wellId');

        if (wellId) {
            fetchLinkedWells(wellId);
            fetchCrmData(wellId);
        }
    }, [location]);

    const DefaultsDetailsModal = () => (
        <Modal
            title="Использованные усреднённые значения"
            visible={defaultsModalVisible}
            onCancel={() => setDefaultsModalVisible(false)}
            footer={null}
            width={700}
        >
            <Table
                columns={[
                    { title: 'Параметр', dataIndex: 'parameter', key: 'parameter' },
                    { title: 'Значение', dataIndex: 'value', key: 'value' },
                    { title: 'Источник', dataIndex: 'source', key: 'source' },
                    { title: 'Скважина', dataIndex: 'wellName', key: 'wellName' }
                ]}
                dataSource={usedDefaults}
                rowKey="parameter"
                size="small"
            />
        </Modal>
    );

    return (
        <Layout style={{ background: 'white' }}>
            <Content>
                <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <ChartsModule
                            crmData={crmData}
                            loadingCrm={loadingCrm}
                            linkedWells={linkedWells}
                            usedDefaults={usedDefaults}
                            onShowDefaults={() => setDefaultsModalVisible(true)}
                        />
                    </Col>

                    <Col span={16}>
                        <DefaultsDetailsModal />
                        <TableModule
                            linkedWells={linkedWells}
                            crmData={crmData}
                            usedDefaults={usedDefaults}
                            isGeologist={isGeologist}
                            onOpenRatioModal={handleOpenRatioModal}
                        />
                        <MapModule
                            onShowHorizonTable={() => { }}
                            linkedWells={linkedWells}
                            style={{ marginTop: 20 }}
                        />
  
                    </Col>

                </Row>
          
                <Modal
                    title="Изменить КВ"
                    visible={isRatioModalVisible}
                    onOk={handleSaveAllRatios}
                    onCancel={() => setIsRatioModalVisible(false)}
                    width={700}
                >
                    {usedDefaults.length > 0 && (
                        <Alert
                            message="Внимание"
                            description="Некоторые коэффициенты рассчитаны с использованием усреднённых значений из базы данных."
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                            action={
                                <Button
                                    type="dashed"
                                    size="small"
                                    onClick={() => setDefaultsModalVisible(true)}
                                >
                                    Подробнее о данных
                                </Button>
                            }
                        />
                    )}
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
                                        <Text type="secondary">Расчётный: </Text>
                                        <Text code>
                                            {calculatedRatios[well.idLink] !== undefined
                                                ? calculatedRatios[well.idLink].toFixed(4)
                                                : '—'}
                                        </Text>
                                        <Text type="secondary">Прогноз МО:</Text>
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

             
            </Content>
        </Layout>
    );
};

export default Mapp;