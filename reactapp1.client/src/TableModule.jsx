import React, { useState } from 'react';
import { Table, Button, Modal, InputNumber, Alert, Tooltip, Typography, Card } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const TableModule = ({
    linkedWells,
    crmData,
    usedDefaults,
    isGeologist,
    onOpenRatioModal
}) => {
    const navigate = useNavigate();
    const columns = [
        {
            title: '№Скважины', dataIndex: 'name', key: "name",
            render: (text, record) => (
                <a
                    onClick={() => navigate(`/Mapp_nag?wellId=${record.idWell}`)}
                    style={{ cursor: 'pointer', color: '#8cbea8' }}
                >
                    {text}
                </a>
            ), },
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
        {
            title: 'Разница приемистости',
            key: 'injectionDifference',
            render: (_, record) => {
                if (!crmData?.injectionDifferences) return null;
                const diff = crmData.injectionDifferences[record.idWell];
                return (
                    <Text type={diff > 0 ? 'success' : 'danger'}>
                        {diff?.toFixed(2)} м³/сут
                    </Text>
                );
            }
        }
    ];

    return (
        <Card
            title={
                <div style={{ display: 'flex', justifyContent: '', alignItems: 'center' }}>
                    <span>Нагнетательные скважины</span>
                    {isGeologist && (
                        <Button
                            color="primary" variant="dashed"
                            onClick={onOpenRatioModal}
                            style={{ marginLeft: 20 }}
                        >
                            Изменить КВ
                        </Button>
                    )}
                </div>
            }

        >

            <Table
                style={{
                    width: '100%',
                    height: '340px',
                    borderRadius: '5px',
                }}
                dataSource={linkedWells}
                columns={columns}
                rowKey="idWell"
                pagination={false}
                scroll={{ x: "max-content", y: 350 }}
            />
        </Card>
    );
};

export default TableModule;