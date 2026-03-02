import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Typography, Card, message, Popconfirm } from 'antd';
import { BookOutlined, PlusOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const { Title } = Typography;

interface Schedule {
    id: number;
    course_name: string;
    semester: string;
    created_at: string;
}

const CourseList: React.FC = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('token') || '';

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules`, {
                headers: { Authorization: token },
            });
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setSchedules(data);
        } catch (error) {
            console.error(error);
            message.error('获取课程列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchSchedules();
    }, [token, navigate]);

    const handleDelete = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules/${id}`, {
                method: 'DELETE',
                headers: { Authorization: token },
            });
            if (!response.ok) throw new Error('Failed to delete');
            message.success('课程删除成功');
            fetchSchedules();
        } catch (error) {
            console.error(error);
            message.error('删除课程失败');
        }
    };

    const columns = [
        {
            title: '课程名称',
            dataIndex: 'course_name',
            key: 'course_name',
        },
        {
            title: '学年学期',
            dataIndex: 'semester',
            key: 'semester',
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: Schedule) => (
                <Space size="middle">
                    <Button type="primary" onClick={() => navigate(`/courses/${record.id}`)}>
                        进入工作流
                    </Button>
                    <Popconfirm
                        title="确定删除此课程流水线吗？"
                        description="删除将同时删除该计划下所有已生成的教案数据，此操作不可恢复。"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        }
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '16px 24px' }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => navigate('/dashboard')}>返回面板</Button>
                    <Title level={4} style={{ margin: 0 }}>
                        <BookOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        课程管理 (持久化工作流)
                    </Title>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/schedule')}>
                    创建新课程流水线（授课计划）
                </Button>
            </div>

            <Card style={{ marginTop: 20 }}>
                <Table
                    columns={columns}
                    dataSource={schedules}
                    rowKey="id"
                    loading={loading}
                    bordered
                />
            </Card>
        </div>
    );
};

export default CourseList;
