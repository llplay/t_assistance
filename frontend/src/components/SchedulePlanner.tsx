import React, { useState, useEffect } from 'react';
import {
    Form, Button, Table, message,
    Card, Row, Col, Spin, Typography, Space, Tag, Input
} from 'antd';
import {
    BookOutlined, DownloadOutlined, FileTextOutlined,
    ArrowLeftOutlined, ThunderboltOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const { Title } = Typography;
const { TextArea } = Input;

interface ScheduleItem {
    月份: string; 周次: string; 星期: string; 节次: string;
    教学内容: string; 教学学时: string; 理论: string; 实践: string;
    重难点: string; 课外作业: string;
}
interface ScheduleData {
    课程名称: string; 授课班级: string; 学年学期: string;
    课程总学时: string; 授课计划: ScheduleItem[];
    [key: string]: any;
}

const STORAGE_KEY = 'schedule_desc';
const DEFAULT_DESC = `课程名称：计算机视觉
学年学期：2024-2025学年第一学期
系部：信息工程系，教研室：人工智能教研室
授课班级：D23人工智能1、2班，教学层次：大专
制订人：许春秀，其他任课教师：杨令铎
制订日期：2024年8月22日

学时安排：课程共72学时，理论36学时，实践36学时
每周4学时，教学周18周，复习4学时，考核2学时
上课时间：每周四第1-2节，每周五第1-2节

教材：《OpenCV图像处理实战》贾睿，机械工业出版社，2022年
参考书：《Python计算机视觉实战》清华大学出版社

课程简介：本课程面向人工智能专业学生，系统讲授计算机视觉基础理论与实践，
涵盖图像处理、特征提取、目标检测等核心内容，培养学生使用OpenCV进行视觉应用开发的能力。

教材目录（AI将据此生成排课计划）：
第1章 OpenCV简介与环境搭建
  1.1 计算机视觉概述
  1.2 开发环境配置
第2章 图像基础操作
  2.1 图像读取与显示
  2.2 色彩空间转换
第3章 图像滤波与增强
  3.1 均值滤波、高斯滤波
  3.2 边缘检测
第4章 形态学操作
  4.1 腐蚀与膨胀
  4.2 开运算与闭运算
第5章 特征检测与匹配
  5.1 角点检测
  5.2 SIFT/ORB特征
第6章 目标检测基础
  6.1 Haar级联分类器
  6.2 基于深度学习的检测
第7章 视频处理
  7.1 视频读取与播放
  7.2 运动检测
第8章 综合项目实战
  8.1 人脸识别系统
  8.2 手势识别项目`;

const SchedulePlanner: React.FC = () => {
    const navigate = useNavigate();
    const [description, setDescription] = useState('');
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [rawContent, setRawContent] = useState('');
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [streamText, setStreamText] = useState('');

    const token = localStorage.getItem('token') || '';

    // 恢复上次输入
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        setDescription(saved || DEFAULT_DESC);
    }, []);

    const handleDescChange = (val: string) => {
        setDescription(val);
        localStorage.setItem(STORAGE_KEY, val);
    };

    const handleGenerate = async () => {
        if (!description.trim()) {
            message.warning('请描述课程信息和教材目录');
            return;
        }
        setGenerating(true);
        setRawContent('');
        setStreamText('');
        setScheduleData(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ 自由描述: description }),
            });
            if (!response.ok) throw new Error('生成失败，请检查网络或重试');

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
            setRawContent(fullText);

            try {
                const clean = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
                let parsed: ScheduleData;

                try {
                    parsed = JSON.parse(clean);
                } catch (e1) {
                    // 如果存在未转义的真实换行符导致 JSON.parse 报错
                    // 我们尝试预处理：把所有换行强行替换成 \n，然后再恢复结构性的换行
                    let fixed = clean.replace(/\n/g, '\\n').replace(/\r/g, '');
                    fixed = fixed.replace(/}\\n/g, '}\n').replace(/\\n\s*"/g, '\n"').replace(/,\\n/g, ',\n').replace(/{\\n/g, '{\n').replace(/]\\n/g, ']\n').replace(/\[\\n/g, '[\n');
                    try {
                        parsed = JSON.parse(fixed);
                    } catch (e2) {
                        throw new Error('修复后依然无法解析 JSON');
                    }
                }

                setScheduleData(parsed);

                // 自动保存到数据库
                try {
                    const saveRes = await fetch(`${API_BASE_URL}/api/schedules/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: token },
                        body: JSON.stringify({ content_json: clean })
                    });
                    if (saveRes.ok) {
                        message.success(`✅ 生成并保存成功！共 ${parsed.授课计划?.length ?? 0} 条排课记录`);
                    } else {
                        message.warning('已生成，但自动保存失败');
                    }
                } catch (saveErr) {
                    console.error('Save failed:', saveErr);
                    message.warning('已生成，但自动保存请求失败');
                }
            } catch (e) {
                console.error('JSON 解析失败:', e);
                message.warning('内容已生成，但解析 JSON 失败返回了非法格式，仍可点击下载 Word');
            }
        } catch (err: any) {
            message.error(err?.message || '生成失败');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!rawContent) { message.warning('请先生成授课计划'); return; }
        setDownloading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ content: rawContent }),
            });
            if (!response.ok) {
                const e = await response.json().catch(() => ({}));
                throw new Error(e.message || '下载失败');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const courseName = scheduleData?.课程名称 || '授课计划';
            const semester = scheduleData?.学年学期 || '';
            a.download = `授课计划_${courseName}_${semester}.docx`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            message.success('Word 下载成功！');
        } catch (err: any) {
            message.error(err?.message || '下载失败');
        } finally {
            setDownloading(false);
        }
    };

    const columns = [
        { title: '月', dataIndex: '月份', width: 40, align: 'center' as const },
        { title: '周', dataIndex: '周次', width: 40, align: 'center' as const },
        { title: '星期', dataIndex: '星期', width: 50, align: 'center' as const },
        { title: '节次', dataIndex: '节次', width: 60, align: 'center' as const },
        { title: '教学内容', dataIndex: '教学内容', render: (t: string) => <span style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{t}</span> },
        { title: '学时', dataIndex: '教学学时', width: 45, align: 'center' as const },
        { title: '理论', dataIndex: '理论', width: 45, align: 'center' as const },
        { title: '实践', dataIndex: '实践', width: 45, align: 'center' as const },
        { title: '重点难点', dataIndex: '重难点', render: (t: string) => <span style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{t}</span> },
        { title: '课外作业', dataIndex: '课外作业', width: 90 },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '16px 24px' }}>
            {/* 顶部导航 */}
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => navigate('/dashboard')}>返回</Button>
                <Title level={4} style={{ margin: 0 }}>
                    <BookOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    学期授课计划生成
                </Title>
            </div>

            <Row gutter={16}>
                {/* 左侧：自由描述输入 */}
                <Col xs={24} lg={9}>
                    <Card
                        size="small"
                        title={<><FileTextOutlined /> 描述你的课程</>}
                        extra={
                            <Button size="small" icon={<ReloadOutlined />}
                                onClick={() => { setDescription(DEFAULT_DESC); localStorage.setItem(STORAGE_KEY, DEFAULT_DESC); }}>
                                重置示例
                            </Button>
                        }
                        style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}
                        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 12px' }}
                    >
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                            用自然语言描述课程信息，无需一格格填写。包含：课程名称、学期、班级、学时、上课时间、教材目录等内容即可。
                        </div>
                        <TextArea
                            value={description}
                            onChange={e => handleDescChange(e.target.value)}
                            style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 13 }}
                            placeholder={DEFAULT_DESC}
                        />
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleGenerate}
                            loading={generating}
                            block
                            size="middle"
                            style={{ marginTop: 10 }}
                        >
                            {generating ? 'AI 生成中...' : '🚀 AI 生成授课计划'}
                        </Button>
                    </Card>
                </Col>

                {/* 右侧：预览 */}
                <Col xs={24} lg={15}>
                    <Card
                        size="small"
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>
                                    <FileTextOutlined /> 预览
                                    {scheduleData && <Tag color="green" style={{ marginLeft: 8 }}>{scheduleData.授课计划?.length} 条记录</Tag>}
                                </span>
                                <Button type="primary" icon={<DownloadOutlined />}
                                    onClick={handleDownload} loading={downloading}
                                    disabled={!rawContent} size="small">
                                    下载 Word
                                </Button>
                            </div>
                        }
                        style={{ minHeight: 'calc(100vh - 100px)' }}
                    >
                        {generating && (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 12, color: '#666' }}>AI 正在生成授课计划，请稍候...</div>
                                <div style={{
                                    marginTop: 8, maxHeight: 300, overflow: 'auto',
                                    background: '#f5f5f5', padding: 8, borderRadius: 4,
                                    fontSize: 11, fontFamily: 'monospace', textAlign: 'left'
                                }}>
                                    {streamText.slice(-800)}
                                </div>
                            </div>
                        )}

                        {!generating && scheduleData && (
                            <>
                                <div style={{ background: '#f0f5ff', padding: '6px 12px', borderRadius: 4, marginBottom: 10, fontSize: 12 }}>
                                    <Space wrap>
                                        <span><b>课程：</b>{scheduleData.课程名称}</span>
                                        <span><b>班级：</b>{scheduleData.授课班级}</span>
                                        <span><b>学期：</b>{scheduleData.学年学期}</span>
                                        <span><b>总学时：</b>{scheduleData.课程总学时}</span>
                                    </Space>
                                </div>
                                <Table
                                    dataSource={scheduleData.授课计划?.map((item, i) => ({ ...item, key: i }))}
                                    columns={columns}
                                    size="small"
                                    scroll={{ x: 900, y: 'calc(100vh - 280px)' }}
                                    pagination={false}
                                    bordered
                                />
                            </>
                        )}

                        {!generating && !scheduleData && (
                            <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb' }}>
                                <BookOutlined style={{ fontSize: 48 }} />
                                <div style={{ marginTop: 12 }}>在左侧描述你的课程，点击「AI 生成授课计划」</div>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SchedulePlanner;
