import { useEffect, useState } from 'react';
import { Layout, Row, Col, Modal, InputNumber, message, Typography, Button, Alert, Table, Dropdown, Menu } from 'antd';
import { useLocation } from 'react-router-dom';
import ChartsModule from './ChartsModule';
import MapModule from './MapModule';
import TableModule from './TableModule';
import './App.css';
import { DownloadOutlined } from '@ant-design/icons';
import { exportToExcel } from './excelExportService';

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
    const [wellName, setWellName] = useState('');
    const [exportLoading, setExportLoading] = useState(false);

    const location = useLocation();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isGeologist = user?.roleName === 'Геолог';

    // Исправленная функция с проверками
    const getWellsDataForExport = () => {
        const safeLinkedWells = Array.isArray(linkedWells) ? linkedWells : [];

        return safeLinkedWells.map(well => ({
            '№ Скважины': well.name || '',
            'Цех': well.workshop?.name || '',
            'НГДУ': well.workshop?.ngdu?.name || '',
            'Коэффициент влияния (КВ)': well.lastratio || 0,
            'Текущая приемистость': crmData?.currentInjectionRates?.[well.idWell] || 0,
            'Расчетная приемистость': crmData?.injectionRates?.[well.idWell] || 0,
            'Коэффициент влияния (%)': ((crmData?.connectivityFactors?.[well.idWell] || 0) * 100).toFixed(2),
            'Разница приемистости': crmData?.injectionDifferences?.[well.idWell] || 0,
            'ID скважины': well.idWell || '',
            'ID связи': well.idLink || ''
        }));
    };

    const getProductionDataForExport = () => {
        if (!crmData) return {};

        const productionData = {
            'Основные_показатели': [
                {
                    'Текущая добыча (м³/сут)': crmData.productionRate || 0,
                    'Общий объем добычи': crmData.totalProduction || 0,
                    'Суммарный коэффициент влияния': crmData.totalConnectivity || 0,
                    'Дата расчета': new Date().toLocaleDateString()
                }
            ],
            'История_добычи': (crmData?.historicalProduction?.$values && Array.isArray(crmData.historicalProduction.$values))
                ? crmData.historicalProduction.$values.map(item => ({
                    'Дата': item.date ? new Date(item.date).toLocaleDateString() : '',
                    'Дебит (м³/сут)': item.value || 0,
                    'Тип': 'Исторические данные'
                }))
                : [],
            'Прогноз_добычи': (crmData?.forecastedProduction?.$values && Array.isArray(crmData.forecastedProduction.$values))
                ? crmData.forecastedProduction.$values.map(item => ({
                    'Дата': item.date ? new Date(item.date).toLocaleDateString() : '',
                    'Дебит (м³/сут)': item.value || 0,
                    'Тип': 'Прогнозные данные'
                }))
                : []
        };

        return productionData;
    };

    const getInjectionDataForExport = () => {
        if (!crmData || !Array.isArray(linkedWells) || linkedWells.length === 0) return {};

        const injectionData = linkedWells
            .filter(well => well && well.idWell)
            .map(well => {
                const wellId = well.idWell.toString();
                return {
                    '№ Скважины': well.name || '',
                    'Текущая приемистость (м³/сут)': crmData.currentInjectionRates?.[wellId] || 0,
                    'Расчетная приемистость (м³/сут)': crmData.injectionRates?.[wellId] || 0,
                    'Разница приемистости (м³/сут)': crmData.injectionDifferences?.[wellId] || 0,
                    'Коэффициент влияния (%)': ((crmData.connectivityFactors?.[wellId] || 0) * 100).toFixed(2),
                    'Статус': crmData.injectionDifferences?.[wellId] > 0 ? 'Недостаточная закачка' : 'Норма'
                };
            });

        const summaryData = [{
            'Общая текущая приемистость': Object.values(crmData.currentInjectionRates || {}).reduce((sum, val) => sum + (val || 0), 0),
            'Общая расчетная приемистость': Object.values(crmData.injectionRates || {}).reduce((sum, val) => sum + (val || 0), 0),
            'Общая разница': Object.values(crmData.injectionDifferences || {}).reduce((sum, val) => sum + (val || 0), 0),
            'Количество нагнетательных скважин': linkedWells.length
        }];

        return {
            'Приемистость_по_скважинам': injectionData,
            'Сводка_по_приемистости': summaryData
        };
    };

    const getDefaultsDataForExport = () => {
        const safeUsedDefaults = Array.isArray(usedDefaults) ? usedDefaults : [];

        const defaultsByWell = safeUsedDefaults.reduce((acc, item) => {
            const wellName = item.wellName || 'Неизвестно';
            if (!acc[wellName]) {
                acc[wellName] = [];
            }
            acc[wellName].push({
                'Параметр': item.parameter || '',
                'Значение': item.value || '',
                'Источник': item.source || '',
                'Примечание': 'Использовано усредненное значение'
            });
            return acc;
        }, {});

        const exportData = {};
        Object.keys(defaultsByWell).forEach(wellName => {
            const sheetName = wellName.length > 25 ? wellName.substring(0, 25) : wellName;
            exportData[`Усредненные_${sheetName}`] = defaultsByWell[wellName];
        });

        // Добавляем общий лист со всеми значениями
        if (safeUsedDefaults.length > 0) {
            exportData['Все_усредненные_значения'] = safeUsedDefaults.map(item => ({
                'Скважина': item.wellName || '',
                'Параметр': item.parameter || '',
                'Значение': item.value || '',
                'Источник': item.source || '',
                'ID скважины': item.wellId || ''
            }));
        }

        return exportData;
    };

    const getAllDataForExport = () => {
        const wellsData = getWellsDataForExport();
        const productionData = getProductionDataForExport();
        const injectionData = getInjectionDataForExport();
        const defaultsData = getDefaultsDataForExport();

        return {
            'Нагнетательные_скважины': wellsData,
            ...productionData,
            ...injectionData,
            ...defaultsData,
            'Общая_информация': [
                {
                    'Скважина': wellName || 'Неизвестно',
                    'ID скважины': wellId || '',
                    'Дата экспорта': new Date().toLocaleString(),
                    'Пользователь': user?.name || 'Неизвестно',
                    'Роль': user?.roleName || 'Неизвестно',
                    'Количество связанных скважин': linkedWells.length,
                    'Статус данных CRM': crmData ? 'Загружены' : 'Отсутствуют'
                }
            ]
        };
    };

    // Обработчик выборочного экспорта
    const handleSelectiveExport = (key) => {
        setExportLoading(true);
        try {
            let selectedData = {};
            const fileName = `Данные_${key}_${wellName || 'неизвестно'}`;

            switch (key) {
                case 'wells':
                    selectedData = {
                        'Нагнетательные_скважины': getWellsDataForExport(),
                        'Информация_о_экспорте': [{
                            'Тип экспорта': 'Нагнетательные скважины',
                            'Скважина': wellName || 'Неизвестно',
                            'Дата экспорта': new Date().toLocaleString(),
                            'Количество скважин': linkedWells.length
                        }]
                    };
                    break;
                case 'production':
                    selectedData = getProductionDataForExport();
                    // Добавляем информацию об экспорте
                    selectedData['Информация_о_экспорте'] = [{
                        'Тип экспорта': 'Данные по добыче',
                        'Скважина': wellName || 'Неизвестно',
                        'Дата экспорта': new Date().toLocaleString(),
                        'Статус данных': crmData ? 'Данные доступны' : 'Данные отсутствуют'
                    }];
                    break;
                case 'injection':
                    selectedData = getInjectionDataForExport();
                    // Добавляем информацию об экспорте
                    selectedData['Информация_о_экспорте'] = [{
                        'Тип экспорта': 'Данные по приемистости',
                        'Скважина': wellName || 'Неизвестно',
                        'Дата экспорта': new Date().toLocaleString(),
                        'Количество скважин': linkedWells.length
                    }];
                    break;
                case 'defaults':
                    selectedData = getDefaultsDataForExport();
                    // Добавляем информацию об экспорте
                    selectedData['Информация_о_экспорте'] = [{
                        'Тип экспорта': 'Усредненные значения',
                        'Скважина': wellName || 'Неизвестно',
                        'Дата экспорта': new Date().toLocaleString(),
                        'Количество записей': usedDefaults.length
                    }];
                    break;
                default:
                    selectedData = getAllDataForExport();
            }

            console.log(`Экспорт данных для ${key}:`, selectedData);
            exportToExcel(selectedData, fileName);
            message.success(`Данные "${getExportTypeName(key)}" успешно экспортированы в Excel`);
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            message.error('Ошибка при экспорте данных');
        } finally {
            setExportLoading(false);
        }
    };

    // Функция для получения читаемого названия типа экспорта
    const getExportTypeName = (key) => {
        const names = {
            'wells': 'Нагнетательные скважины',
            'production': 'Данные по добыче',
            'injection': 'Данные по приемистости',
            'defaults': 'Усредненные значения',
            'all': 'Все данные'
        };
        return names[key] || key;
    };

    // Меню для выборочного экспорта
    const exportMenu = (
        <Menu onClick={({ key }) => handleSelectiveExport(key)}>
            <Menu.Item key="wells" icon={<DownloadOutlined />}>
                Нагнетательные скважины
            </Menu.Item>
            <Menu.Item key="production" icon={<DownloadOutlined />}>
                Данные по добыче
            </Menu.Item>
            <Menu.Item key="injection" icon={<DownloadOutlined />}>
                Данные по приемистости
            </Menu.Item>
            <Menu.Item key="defaults" icon={<DownloadOutlined />}>
                Усредненные значения
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="all" icon={<DownloadOutlined />}>
                Все данные (полный отчет)
            </Menu.Item>
        </Menu>
    );


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
    const fetchWellName = async (wellId) => {
        try {
            const response = await fetch(`/api/well/name/${wellId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const linkedWellsData = data.$values || data;
            console.log("Полный ответ сервера:", linkedWellsData);
            setWellName(linkedWellsData.name);
        } catch (error) {
            console.error('Не удалось загрузить название скважины:', error);
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
            fetchWellName(wellId);
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
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 5,
                    padding: '5px',
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 6
                }}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="#52c41a"
                        style={{ marginRight: 12 }}
                    >
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <Text strong style={{ fontSize: 16, color: '#389e0d' }}>
                        Скважина №: {wellName}
                    </Text>
                    <Dropdown overlay={exportMenu} placement="bottomRight">
                        <Button
                            type=""
                            icon={<DownloadOutlined />}
                            loading={exportLoading}
                            style={{ marginLeft: '12px' }}
                        >
                            Экспорт в Excel
                        </Button>
                    </Dropdown>
                </div>
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