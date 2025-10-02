import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../enum/api';
import { asyncGet } from '../utils/fetch';
import { useNavigate } from 'react-router-dom';
import '../style/StudentHomePage.css';

interface Course {
    _id: string;
    courseName: string;
    courseCode: string;
    teacher: string;
    semester: string;
    schedule: {
        dayOfWeek: number;
        startTime: string;
    };
}

interface AttendanceRecord {
    _id: string;
    courseId: string;
    courseName: string;
    attendanceDate: string;
    status: 'present' | 'absent' | 'late';
    checkInTime?: string;
    sessionCode: string;
}

const StudentHomePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'courses' | 'attendance' | 'assignments'>('courses');

    useEffect(() => {
        loadStudentData();
    }, []);

    const loadStudentData = async () => {
        setLoading(true);
        try {
            // 載入學生選課資料
            const coursesResponse = await asyncGet(api.studentCourses);
            if (coursesResponse.code === 200) {
                setCourses(coursesResponse.body || []);
            }

            // 載入點名紀錄
            const attendanceResponse = await asyncGet(api.studentRecords);
            if (attendanceResponse.code === 200) {
                setAttendanceRecords(attendanceResponse.body || []);
            }
        } catch (error) {
            console.error('載入學生資料失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDayName = (dayOfWeek: number): string => {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        return days[dayOfWeek] || '';
    };

    const getStatusText = (status: string): string => {
        switch (status) {
            case 'present': return '出席';
            case 'absent': return '缺席';
            case 'late': return '遲到';
            default: return '未知';
        }
    };

    const getStatusClass = (status: string): string => {
        switch (status) {
            case 'present': return 'status-present';
            case 'absent': return 'status-absent';
            case 'late': return 'status-late';
            default: return '';
        }
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="student-home-loading">
                <div className="loading-spinner"></div>
                <p>載入中...</p>
            </div>
        );
    }

    return (
        <div className="student-home-page">
            <div className="student-header">
                <div className="student-info">
                    <div className="avatar">
                        {user?.userName?.charAt(0) || 'S'}
                    </div>
                    <div className="student-details">
                        <h2>歡迎回來，{user?.userName}</h2>
                        <p className="student-id">學號：{user?.studentInfo?.sid || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="tab-navigation">
                <button 
                    className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('courses')}
                >
                    📚 我的課程
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    📋 點名紀錄
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('assignments')}
                >
                    📝 作業管理
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'courses' && (
                    <div className="courses-section">
                        <div className="section-header">
                            <h3>我的課程 ({courses.length})</h3>
                            <button 
                                className="attendance-btn"
                                onClick={() => navigate('/student-attendance')}
                            >
                                📱 點名
                            </button>
                        </div>
                        
                        {courses.length > 0 ? (
                            <div className="courses-grid">
                                {courses.map((course) => (
                                    <div key={course._id} className="course-card">
                                        <div className="course-header">
                                            <h4>{course.courseName}</h4>
                                            <span className="course-code">{course.courseCode}</span>
                                        </div>
                                        <div className="course-info">
                                            <p className="teacher">👨‍🏫 {course.teacher}</p>
                                            <p className="schedule">
                                                📅 星期{getDayName(course.schedule.dayOfWeek)} {course.schedule.startTime}
                                            </p>
                                            <p className="semester">📖 {course.semester}</p>
                                        </div>
                                        <div className="course-actions">
                                            <button 
                                                className="action-btn primary"
                                                onClick={() => navigate('/student-attendance')}
                                            >
                                                點名
                                            </button>
                                            <button 
                                                className="action-btn secondary"
                                                onClick={() => {
                                                    setActiveTab('attendance');
                                                    // 這裡可以添加篩選特定課程的邏輯
                                                }}
                                            >
                                                紀錄
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📚</div>
                                <h4>尚未選課</h4>
                                <p>您目前沒有選修任何課程</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="attendance-section">
                        <div className="section-header">
                            <h3>點名紀錄</h3>
                            <button 
                                className="attendance-btn"
                                onClick={() => navigate('/student-attendance')}
                            >
                                📱 立即點名
                            </button>
                        </div>

                        {attendanceRecords.length > 0 ? (
                            <div className="attendance-list">
                                {attendanceRecords.map((record) => (
                                    <div key={record._id} className="attendance-item">
                                        <div className="attendance-info">
                                            <h4>{record.courseName}</h4>
                                            <p className="attendance-date">{formatDate(record.attendanceDate)}</p>
                                            {record.checkInTime && (
                                                <p className="checkin-time">
                                                    點名時間：{new Date(record.checkInTime).toLocaleString('zh-TW')}
                                                </p>
                                            )}
                                            <p className="session-code">會話代碼：{record.sessionCode}</p>
                                        </div>
                                        <div className={`attendance-status ${getStatusClass(record.status)}`}>
                                            {getStatusText(record.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <h4>尚無點名紀錄</h4>
                                <p>您還沒有任何點名紀錄</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="assignments-section">
                        <div className="section-header">
                            <h3>作業管理</h3>
                        </div>
                        
                        <div className="assignment-functions">
                            <div className="function-card">
                                <div className="function-icon">📤</div>
                                <h4>上傳作業</h4>
                                <p>上傳您的作業檔案</p>
                                <button className="function-btn">開始上傳</button>
                            </div>
                            
                            <div className="function-card">
                                <div className="function-icon">📋</div>
                                <h4>作業清單</h4>
                                <p>查看所有作業狀態</p>
                                <button className="function-btn">查看清單</button>
                            </div>
                            
                            <div className="function-card">
                                <div className="function-icon">📊</div>
                                <h4>成績查詢</h4>
                                <p>查看作業成績與評語</p>
                                <button className="function-btn">查詢成績</button>
                            </div>
                            
                            <div className="function-card">
                                <div className="function-icon">⏰</div>
                                <h4>截止提醒</h4>
                                <p>查看即將截止的作業</p>
                                <button className="function-btn">查看提醒</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentHomePage;
