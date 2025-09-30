import React, { useState, useEffect } from 'react';
import { Card, Alert, Button, Typography } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ChartsModule = ({
    crmData,
    loadingCrm,
    linkedWells,
    usedDefaults,
    onShowDefaults
}) => {
    const [defaultsModalVisible, setDefaultsModalVisible] = useState(false);

    const prepareInjectionData = () => {
        if (!crmData || !linkedWells.length) return null;

        return linkedWells
            .filter(well => well.idWell)
            .map(well => {
                const wellId = well.idWell.toString();
                return {
                    name: well.name,
                    currentInjection: crmData.currentInjectionRates?.[wellId] || 0,
                    calculatedInjection: crmData.injectionRates?.[wellId] || 0,
                    connectivity: crmData.connectivityFactors?.[wellId] || 0
                };
            })
            .filter(item => item.name);
    };

    const getProductionChartOptions = (crmData) => {
        const baseOptions = {
            chart: {
                type: 'spline',
                backgroundColor: '#f9f9f9'
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
                    if (this.point.name) {
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

        if (crmData?.productionRate !== undefined) {
            series.push({
                name: 'Текущий расчет',
                type: 'scatter',
                data: [{
                    x: new Date().getTime(),
                    y: crmData.productionRate,
                    name: `Текущий расчет: ${crmData.productionRate.toFixed(2)} м³/сут`,
                    color: '#ff4d4f'
                }],
                color: '#ff4d4f',
                marker: {
                    symbol: 'circle',
                    radius: 5,
                    lineWidth: 2,
                    lineColor: '#ff4d4f',
                    fillColor: 'white'
                }
            });
        }

        return {
            ...baseOptions,
            series: series
        };
    };

    const injectionComparisonData = prepareInjectionData();

    const injectionChartOptions = {
        chart: {
            type: 'column',
            backgroundColor: '#f9f9f9',
            spacing: [20, 20, 20, 20]
        },
        title: {
            text: 'Сравнение приемистости нагнетательных скважин',
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#333'
            }
        },
        xAxis: {
            categories: injectionComparisonData ?
                injectionComparisonData.map(item => item.name) : [],
            title: {
                text: 'Нагнетательные скважины'
            },
            crosshair: true
        },
        yAxis: [{
            title: {
                text: 'Приемистость (м³/сут)',
                style: {
                    color: '#333'
                }
            },
            min: 0
        }, {
            title: {
                text: 'Коэффициент влияния (%)',
                style: {
                    color: '#ff4d4f'
                }
            },
            opposite: true,
            min: 0,
            max: 100
        }],
        tooltip: {
            shared: true,
            formatter: function () {
                if (!this.points) return '';
                let tooltip = `<b>${this.x}</b><br/>`;
                this.points.forEach(point => {
                    const value = point.series.name.includes('Коэффициент')
                        ? `${point.y?.toFixed(1)}%`
                        : `${point.y?.toFixed(2)} м³/сут`;
                    tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${value}</b><br/>`;
                });
                return tooltip;
            }
        },
        plotOptions: {
            column: {
                grouping: true,
                borderWidth: 0,
                dataLabels: {
                    enabled: true,
                    format: '{point.y:.1f}',
                    style: {
                        textOutline: 'none'
                    }
                }
            },
            series: {
                pointWidth: 25
            }
        },
        series: injectionComparisonData ? [
            {
                name: 'Текущая приемистость',
                data: injectionComparisonData.map(item => item.currentInjection),
                color: '#1890ff',
                yAxis: 0
            },
            {
                name: 'Расчетная приемистость',
                data: injectionComparisonData.map(item => item.calculatedInjection),
                color: '#52c41a',
                yAxis: 0
            },
            {
                name: 'Текущий коэффициент влияния',
                data: injectionComparisonData.map(item => item.connectivity * 100),
                type: 'spline',
                color: '#ff4d4f',
                yAxis: 1,
                marker: {
                    symbol: 'diamond',
                    radius: 6
                },
                tooltip: {
                    valueSuffix: '%'
                }
            }
        ] : [],
        legend: {
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
        },
        credits: {
            enabled: false
        }
    };
        
    return (
        <>
            <Card>
                {crmData ? (
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={getProductionChartOptions(crmData)}
                    />
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        {loadingCrm ? 'Загрузка данных...' : 'Нет данных о добыче'}
                    </div>
                )}
            </Card>

            <Card style={{ marginTop: 5 }}>
                {injectionComparisonData ? (
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={injectionChartOptions}
                    />
                ) : (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: '#666'
                    }}>
                        {loadingCrm ? 'Загрузка данных...' : 'Нет данных для отображения'}
                    </div>
                )}
            </Card>
        </>
    );
};

export default ChartsModule;