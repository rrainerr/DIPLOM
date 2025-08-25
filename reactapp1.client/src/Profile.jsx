import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Typography, Modal, Form, Input, Table, Select, Row, Col, notification } from 'antd';
import './App.css';

const { Title, Text } = Typography;
const { Option } = Select;

const ProfilePage = () => {
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isRazrab = user?.roleName === 'Администратор';
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [data, setData] = useState([]);
    const [ngdus, setNgdus] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [api, contextHolder] = notification.useNotification();

    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        navigate('/');
    };

    const showNotification = (type, message, description = '') => {
        api[type]({
            message,
            description,
            placement: 'topRight',
            duration: 4.5,
        });
    };

    const fetchFields = async () => {
        try {
            const response = await fetch('/api/field/');
            if (!response.ok) throw new Error('Не удалось загрузить месторождения');
            const result = await response.json();
            return result.$values || result;
        } catch (error) {
            showNotification('error', 'Ошибка загрузки', error.message);
            return [];
        }
    };

    const fetchNgdus = async () => {
        try {
            const response = await fetch('/api/ngdu/add');
            if (!response.ok) throw new Error('Не удалось загрузить НГДУ');
            const result = await response.json();
            return result.$values || result;
        } catch (error) {
            showNotification('error', 'Ошибка загрузки', error.message);
            return [];
        }
    };

    const fetchTypes = async () => {
        try {
            const response = await fetch('/api/map/type');
            if (!response.ok) throw new Error('Не удалось загрузить типы');
            const result = await response.json();
            return result.$values || result;
        } catch (error) {
            showNotification('error', 'Ошибка загрузки', error.message);
            return [];
        }
    };

    const fetchWorkshops = async () => {
        try {
            const response = await fetch('/api/workshop');
            if (!response.ok) throw new Error('Не удалось загрузить цехи');
            const result = await response.json();
            return result.$values || result;
        } catch (error) {
            showNotification('error', 'Ошибка загрузки', error.message);
            return [];
        }
    };

    const showModal = async (type) => {
        setModalType(type);
        setIsModalVisible(true);

        try {
            let data;
            switch (type) {
                case 'field':
                    data = await fetchFields();
                    break;
                case 'ngdu':
                    data = await fetchNgdus();
                    break;
                case 'workshop':
                    data = await fetchWorkshops();
                    const ngduData = await fetchNgdus();
                    const typeData = await fetchTypes();
                    setNgdus(ngduData);
                    setTypes(typeData);
                    break;
                default:
                    data = [];
            }
            setData(data);
        } catch (error) {
            showNotification('error', 'Ошибка', error.message);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleEditCancel = () => {
        setIsEditModalVisible(false);
        editForm.resetFields();
    };

    const addField = async (values) => {
        const response = await fetch('/api/field/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Не удалось добавить месторождение');
        }
        return response.json();
    };

    const addNgdu = async (values) => {
        const response = await fetch('/api/ngdu/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Не удалось добавить НГДУ');
        }
        return response.json();
    };

    const addWorkshop = async (values) => {
        const selectedNgdu = ngdus.find(ngdu => ngdu.idNgdu === parseInt(values.idNgdu, 10));
        if (!selectedNgdu) throw new Error('Selected Ngdu not found');

        const data = {
            name: values.name,
            idNgdu: selectedNgdu.idNgdu,
            idType: parseInt(values.idType, 10),
        };

        const response = await fetch('/api/workshop/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.message || 'Не удалось добавить цех');
        }

        return response.json();
    };

    const onFinish = async (values) => {
        setLoading(true);
        try {
            let result;
            switch (modalType) {
                case 'field':
                    result = await addField(values);
                    break;
                case 'ngdu':
                    result = await addNgdu(values);
                    break;
                case 'workshop':
                    result = await addWorkshop(values);
                    break;
                default:
                    throw new Error('Неизвестный тип данных');
            }
            showNotification('success', 'Успешно', result.message);
            form.resetFields();
            setIsModalVisible(false);
            showModal(modalType);
        } catch (error) {
            showNotification('error', 'Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };

    const editField = async (values) => {
        const response = await fetch(`/api/field/${editingRecord.idField}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idField: Number(editingRecord.idField),
                name: values.name,
            }),
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.message || 'Не удалось обновить месторождение');
        }

        return response.json();
    };

    const editNgdu = async (values) => {
        const response = await fetch(`/api/ngdu/add/${editingRecord.idNgdu}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idNgdu: Number(editingRecord.idNgdu),
                name: values.name,
            }),
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.message || 'Не удалось обновить НГДУ');
        }

        return response.json();
    };

    const editWorkshop = async (values) => {
        const data = {
            IdWorkshop: Number(editingRecord.idWorkshop),
            Name: values.name,
            IdNgdu: Number(values.idNgdu),
            IdType: Number(values.idType),
        };

        const response = await fetch(`/api/workshop/${editingRecord.idWorkshop}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.message || 'Не удалось обновить цех');
        }

        return response.json();
    };

    const onEditFinish = async (values) => {
        setLoading(true);
        try {
            let result;
            switch (modalType) {
                case 'field':
                    result = await editField(values);
                    break;
                case 'ngdu':
                    result = await editNgdu(values);
                    break;
                case 'workshop':
                    result = await editWorkshop(values);
                    break;
                default:
                    throw new Error('Неизвестный тип данных');
            }
            showNotification('success', 'Успешно', result.message);
            setIsEditModalVisible(false);
            showModal(modalType);
        } catch (error) {
            showNotification('error', 'Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (id) => {
        // 1. Временный лог для проверки
        console.log('Delete initiated', { id, modalType });

        // 2. Упрощенное подтверждение (если Modal.confirm не работает)
        if (!window.confirm('Вы уверены, что хотите удалить этот элемент?')) {
            console.log('Удаление отменено');
            return;
        }

        try {
            // 3. Определяем endpoint
            const endpointMap = {
                field: `/api/field/${id}`,
                ngdu: `/api/ngdu/add/${id}`,
                workshop: `/api/workshop/${id}`
            };

            const endpoint = endpointMap[modalType];
            if (!endpoint) throw new Error('Неизвестный тип данных');

            console.log('Sending DELETE to:', endpoint);

            // 4. Отправляем запрос
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`
                }
            });

            console.log('Response received:', {
                status: response.status,
                statusText: response.statusText
            });

            // 5. Обрабатываем ответ
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Ошибка сервера');
            }

            // 6. Обновляем состояние
            const filterKeyMap = {
                field: 'idField',
                ngdu: 'idNgdu',
                workshop: 'idWorkshop'
            };

            setData(prevData =>
                prevData.filter(item => item[filterKeyMap[modalType]] !== id)
            );

            showNotification('success', 'Успешно', 'Элемент удален');
        } catch (error) {
            console.error('Delete failed:', error);
            showNotification('error', 'Ошибка', error.message);
        }
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setIsEditModalVisible(true);
        editForm.setFieldsValue({
            name: record.name,
            ...(modalType === 'workshop' && {
                idNgdu: record.idNgdu,
                idType: record.idType,
            }),
        });
    };

    const columns = {
        field: [
            { title: 'ID', dataIndex: 'idField', key: 'idField' },
            { title: 'Название', dataIndex: 'name', key: 'name' },
            {
                title: 'Действия',
                key: 'actions',
                render: (_, record) => (
                    <div key={`actions-${record.idField}`}>
                        <Button type="link" onClick={() => handleEdit(record)}>Редактировать</Button>
                        <Button
                            type="link"
                            danger
                            onClick={() => {
                                console.log('Кнопка удаления нажата', record.id);
                                handleDelete(record.idField || record.idNgdu || record.idWorkshop);
                            }}
                        >
                            Удалить
                        </Button>
                    </div>
                ),
            },
        ],
        ngdu: [
            { title: 'ID', dataIndex: 'idNgdu', key: 'idNgdu' },
            { title: 'Название', dataIndex: 'name', key: 'name' },
            {
                title: 'Действия',
                key: 'actions',
                render: (_, record) => (
                    <div key={`actions-${record.idNgdu}`}>
                        <Button type="link" onClick={() => handleEdit(record)}>Редактировать</Button>
                        <Button
                            type="link"
                            danger
                            onClick={() => {
                                console.log('Кнопка удаления нажата', record.id);
                                handleDelete(record.idField || record.idNgdu || record.idWorkshop);
                            }}
                        >
                            Удалить
                        </Button>
                    </div>
                ),
            },
        ],
        workshop: [
            { title: 'ID', dataIndex: 'idWorkshop', key: 'idWorkshop' },
            { title: 'Название', dataIndex: 'name', key: 'name' },
            { title: 'НГДУ', dataIndex: 'ngduName', key: 'ngduName' },
            { title: 'Тип', dataIndex: 'typeName', key: 'typeName' },
            {
                title: 'Действия',
                key: 'actions',
                render: (_, record) => (
                    <div key={`actions-${record.idWorkshop}`}>
                        <Button type="link" onClick={() => handleEdit(record)}>Редактировать</Button>
                        <Button
                            type="link"
                            danger
                            onClick={() => {
                                console.log('Кнопка удаления нажата', record.id);
                                handleDelete(record.idField || record.idNgdu || record.idWorkshop);
                            }}
                        >
                            Удалить
                        </Button>
                    </div>
                ),
            },
        ],
    };

    return (
        <Card
            
            title={
                <span>Профиль</span>
            }   
        >
            {contextHolder}
            <Row
                style={{ backgroundColor: '#f0f2f5', padding: 10, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                gutter={[16, 16]}
            >
                <Col span={8}>
                    <Card
                        className="profile-card"
                        actions={[
                            <Button type="link" danger onClick={handleLogout} key="logout">
                                Выйти
                            </Button>,
                        ]}
                    >
                        <div className="profile-header">
                            <Title level={3}>{user?.firstName} {user?.surname}</Title>
                        </div>
                        <Descriptions column={1}>
                            <Descriptions.Item label="Должность">
                                <Text strong>{user?.roleName}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Почта">
                                <Text strong>{user?.email}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
                {isRazrab && (
                    <Col span={8}>
                        <Row gutter={[8, 8]}>
                            {[
                                { type: 'field', text: 'Добавить месторождение' },
                                { type: 'ngdu', text: 'Добавить НГДУ' },
                                { type: 'workshop', text: 'Добавить цех' },
                                { to: '/Add_hor', text: 'Добавить горизонт' },
                                { to: '/Add_packer', text: 'Добавить пакер' },
                                { to: '/Add_stem', text: 'Добавить ствол' },
                                { to: '/Add_map', text: 'Добавить скважину' },
                                { to: '/Add_slant', text: 'Добавить кривизну' },
                            ].map((item, index) => (
                                <Col span={10} key={`action-${index}`}>
                                    {item.to ? (
                                        <Button type="primary" block>
                                            <Link to={item.to}>{item.text}</Link>
                                        </Button>
                                    ) : (
                                        <Button type="primary" onClick={() => showModal(item.type)} block>
                                            {item.text}
                                        </Button>
                                    )}
                                </Col>
                            ))}
                        </Row>
                    </Col>
                )}
            </Row>

            <Modal
                title={`Добавить ${modalType}`}
                visible={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={800}
            >
                <Table
                    columns={columns[modalType] || []}
                    dataSource={data}
                    rowKey={record => record.idField || record.idNgdu || record.idWorkshop}
                    loading={loading}
                    pagination={false}
                    style={{ marginBottom: 16 }}
                />
                <Form form={form} onFinish={onFinish}>
                    <Form.Item
                        label="Название"
                        name="name"
                        rules={[{ required: true, message: 'Пожалуйста, введите название!' }]}
                    >
                        <Input />
                    </Form.Item>
                    {modalType === 'workshop' && (
                        <>
                            <Form.Item
                                label="НГДУ"
                                name="idNgdu"
                                rules={[{ required: true, message: 'Пожалуйста, выберите НГДУ!' }]}
                            >
                                <Select placeholder="Выберите НГДУ">
                                    {ngdus.map((ngdu) => (
                                        <Option key={`ngdu-${ngdu.idNgdu}`} value={ngdu.idNgdu}>
                                            {ngdu.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="Тип"
                                name="idType"
                                rules={[{ required: true, message: 'Пожалуйста, выберите тип!' }]}
                            >
                                <Select placeholder="Выберите тип">
                                    {types.map((type) => (
                                        <Option key={`type-${type.idType}`} value={type.idType}>
                                            {type.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </>
                    )}
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Добавить
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Редактировать ${modalType}`}
                visible={isEditModalVisible}
                onCancel={handleEditCancel}
                footer={null}
                width={800}
            >
                <Form form={editForm} onFinish={onEditFinish}>
                    <Form.Item
                        label="Название"
                        name="name"
                        rules={[{ required: true, message: 'Пожалуйста, введите название!' }]}
                    >
                        <Input />
                    </Form.Item>
                    {modalType === 'workshop' && (
                        <>
                            <Form.Item
                                label="НГДУ"
                                name="idNgdu"
                                rules={[{ required: true, message: 'Пожалуйста, выберите НГДУ!' }]}
                            >
                                <Select placeholder="Выберите НГДУ">
                                    {ngdus.map((ngdu) => (
                                        <Option key={`edit-ngdu-${ngdu.idNgdu}`} value={ngdu.idNgdu}>
                                            {ngdu.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="Тип"
                                name="idType"
                                rules={[{ required: true, message: 'Пожалуйста, выберите тип!' }]}
                            >
                                <Select placeholder="Выберите тип">
                                    {types.map((type) => (
                                        <Option key={`edit-type-${type.idType}`} value={type.idType}>
                                            {type.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </>
                    )}
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Сохранить
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ProfilePage;