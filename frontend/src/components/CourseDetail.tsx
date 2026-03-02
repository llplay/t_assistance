import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Typography, Card, message, Spin, Tag, Drawer } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, BookOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../config';

const { Title, Text } = Typography;

interface ScheduleData {
    id: number;
    course_name: string;
    semester: string;
    content_json: string;
    created_at: string;
}

interface LessonPlan {
    id: number;
    section_index: number;
    section_name: string;
    content_json: string;
    created_at: string;
}

const CourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState<ScheduleData | null>(null);
    const [scheduleItems, setScheduleItems] = useState<any[]>([]);
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [lessons, setLessons] = useState<LessonPlan[]>([]);
    const [loading, setLoading] = useState(false);

    // 生成教案的状态
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
    const [streamText, setStreamText] = useState('');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [currentViewLesson, setCurrentViewLesson] = useState<string>('');
    const [currentViewTitle, setCurrentViewTitle] = useState<string>('');

    const token = localStorage.getItem('token') || '';

    const fetchData = async () => {
        setLoading(true);
        try {
            // 获取授课计划详情
            const res1 = await fetch(`${API_BASE_URL}/api/schedules/${id}`, {
                headers: { Authorization: token },
            });
            if (!res1.ok) throw new Error('Failed to fetch schedule');
            const data1 = await res1.json();
            setSchedule(data1);

            let parsedItems = [];
            try {
                const parsed = JSON.parse(data1.content_json);
                setScheduleData(parsed);
                parsedItems = parsed.授课计划 || [];
            } catch (e) {
                console.error("Parsed failed", e);
            }
            setScheduleItems(parsedItems.map((item: any, idx: number) => ({ ...item, key: idx, section_index: idx })));

            // 获取教案列表
            const res2 = await fetch(`${API_BASE_URL}/api/schedules/${id}/lessons`, {
                headers: { Authorization: token },
            });
            if (res2.ok) {
                const data2 = await res2.json();
                setLessons(data2);
            }
        } catch (error) {
            console.error(error);
            message.error('获取课程信息失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, token]);

    const handleGenerateLesson = async (record: any) => {
        if (!schedule) return;
        setGeneratingIndex(record.section_index);
        setStreamText('');
        setCurrentViewTitle(`正在生成: 第${record.周次}周 第${record.节次}节 ${record.教学内容}`);
        setDrawerVisible(true);

        try {
            // 解析当前的课程基础信息
            let courseInfo = {};
            try {
                courseInfo = JSON.parse(schedule.content_json);
            } catch (e) { }

            const requestData = {
                course_info: courseInfo,
                section_info: record,
                schedule_id: schedule.id
            };

            const response = await fetch(`${API_BASE_URL}/api/lessons/generate_stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) throw new Error('流式生成请求失败');

            const reader = response.body!.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setStreamText(fullText);
            }

            // 生成结束，自动保存教案到数据库
            const cleanSource = fullText.replace(/```json/g, '').replace(/```/g, '').trim();

            const saveRes = await fetch(`${API_BASE_URL}/api/lessons/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({
                    schedule_id: schedule.id,
                    section_index: record.section_index,
                    section_name: `第${record.周次}周 第${record.节次}节 ${record.教学内容}`,
                    content_json: cleanSource
                })
            });

            if (saveRes.ok) {
                message.success('教案生成并保存成功！');
                fetchData(); // 刷新教案列表
            } else {
                message.warning('教案已生成但保存失败');
            }

        } catch (err: any) {
            message.error(err?.message || '生成教案发生错误');
        } finally {
            setGeneratingIndex(null);
        }
    };

    const handleViewLesson = (record: any, lesson: LessonPlan) => {
        setCurrentViewTitle(lesson.section_name);
        setStreamText(lesson.content_json);
        setDrawerVisible(true);
    };

    const handleDownloadLessonWord = async (lesson: LessonPlan) => {
        try {
            // 构造需要传递给后端的 FormData
            const formData = new FormData();
            formData.append('content', lesson.content_json); // 使用现有的接口格式

            const response = await fetch(`${API_BASE_URL}/api/download`, {
                method: 'POST',
                headers: { 'Authorization': token },
                body: formData,
            });

            if (!response.ok) throw new Error('下载失败');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `教案_${lesson.section_name.replace(/\\s+/g, '_')}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            message.success('教案 Word 下载成功！');
        } catch (err: any) {
            message.error('下载 Word 文档失败: ' + err.message);
        }
    };

    const columns = [
        { title: '周次', dataIndex: '周次', width: 60, align: 'center' as const },
        { title: '星期', dataIndex: '星期', width: 60, align: 'center' as const },
        { title: '节次', dataIndex: '节次', width: 60, align: 'center' as const },
        { title: '教学内容', dataIndex: '教学内容' },
        { title: '学时', dataIndex: '教学学时', width: 60, align: 'center' as const },
        {
            title: '教案状态',
            key: 'status',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: any) => {
                const lesson = lessons.find(l => l.section_index === record.section_index);
                if (generatingIndex === record.section_index) {
                    return <Tag color="processing" icon={<Spin size="small" />}>生成中...</Tag>;
                }
                if (lesson) {
                    return <Tag color="success">已生成</Tag>;
                }
                return <Tag color="default">未生成</Tag>;
            }
        },
        {
            title: '操作',
            key: 'action',
            width: 300,
            render: (_: any, record: any) => {
                const lesson = lessons.find(l => l.section_index === record.section_index);
                const isGenerating = generatingIndex === record.section_index;

                if (lesson) {
                    return (
                        <Space>
                            <Button size="small" onClick={() => handleViewLesson(record, lesson)}>查看/编辑内容</Button>
                            <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => handleDownloadLessonWord(lesson)}>下载 Word</Button>
                            <Button size="small" type="dashed" onClick={() => handleGenerateLesson(record)}>重新生成</Button>
                        </Space>
                    );
                }

                return (
                    <Button
                        size="small"
                        type="primary"
                        onClick={() => handleGenerateLesson(record)}
                        loading={isGenerating}
                        disabled={generatingIndex !== null && !isGenerating}
                    >
                        🚀 AI 生成教案
                    </Button>
                );
            },
        }
    ];

    const handleDownloadSchedule = async () => {
        if (!schedule) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ content: schedule.content_json }),
            });
            if (!response.ok) throw new Error('下载失败');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const courseName = schedule.course_name || '授课计划';
            const semester = schedule.semester || '';
            a.download = `授课计划_${courseName}_${semester}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            message.success('授课计划 Word 下载成功！');
        } catch (err: any) {
            message.error('下载 Word 文档失败: ' + err.message);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '16px 24px' }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => navigate('/courses')}>返回课程列表</Button>
                    <Title level={4} style={{ margin: 0 }}>
                        <BookOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        {schedule?.course_name ? `${schedule.course_name} (${schedule.semester})` : '课程流水线'}
                    </Title>
                </div>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadSchedule} disabled={!schedule}>
                    下载授课计划及基本信息 (Word的)
                </Button>
            </div>

            {scheduleData && (
                <div style={{ background: '#f0f5ff', padding: '12px 16px', borderRadius: 4, marginBottom: 16, fontSize: 13, border: '1px solid #d6e4ff' }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>课程基本信息</div>
                    <Space wrap size={[24, 8]}>
                        <span><b>课程：</b>{scheduleData.课程名称}</span>
                        <span><b>班级：</b>{scheduleData.授课班级}</span>
                        <span><b>学期：</b>{scheduleData.学年学期}</span>
                        <span><b>总学时：</b>{scheduleData.课程总学时}</span>
                        <span><b>主讲教师：</b>{scheduleData.主讲教师}</span>
                        <span><b>辅导排疑教师：</b>{scheduleData.辅导排疑教师}</span>
                        <span><b>答疑时间地点：</b>{scheduleData.答疑时间地点}</span>
                    </Space>
                    <div style={{ marginTop: 8 }}>
                        <span><b>教材及参考书：</b>{scheduleData.选用教材及参考书目}</span>
                    </div>
                </div>
            )}

            <Card
                title="教学模块及教案管理"
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    dataSource={scheduleItems}
                    columns={columns}
                    rowKey="section_index"
                    pagination={false}
                    loading={loading}
                    size="small"
                />
            </Card>

            <Drawer
                title={currentViewTitle}
                placement="right"
                width={800}
                onClose={() => { setDrawerVisible(false); if (generatingIndex === null) fetchData(); }}
                open={drawerVisible}
                maskClosable={generatingIndex === null}
                closable={generatingIndex === null}
                extra={
                    generatingIndex !== null ? (
                        <Space><Spin size="small" /> <Text type="secondary">AI 正在生成教案...</Text></Space>
                    ) : null
                }
            >
                <div style={{
                    background: '#f5f5f5',
                    padding: 16,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '100%',
                    overflowY: 'auto'
                }}>
                    <ReactMarkdown>{streamText || '等待 AI 响应...'}</ReactMarkdown>
                </div>
            </Drawer>
        </div>
    );
};

export default CourseDetail;
