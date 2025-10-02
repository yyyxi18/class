import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Attendance } from '../types/Attendance';
import { api } from '../enum/api';
import { asyncPost, asyncGet } from '../utils/fetch';

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attendanceCode, setAttendanceCode] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAttendanceRecords();
    }, []);

    const loadAttendanceRecords = async () => {
        try {
            const response = await asyncGet(api.studentRecords);
            if (response.code === 200) {
                setAttendanceRecords(response.body || []);
            }
        } catch (error) {
            console.error('Failed to load attendance records:', error);
        }
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attendanceCode.trim()) {
            setMessage('請輸入點名碼');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await asyncPost(
                api.checkIn, 
                { attendanceCode }, 
            );

            if (response.code === 200) {
                setMessage('點名成功！');
                setAttendanceCode('');
                loadAttendanceRecords(); // 重新載入記錄
            } else {
                setMessage(response.message || '點名失敗');
            }
        } catch (error) {
            setMessage('點名失敗，請重試');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-TW');
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'present': return '出席';
            case 'absent': return '缺席';
            case 'late': return '遲到';
            default: return status;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'present': return 'status-present';
            case 'absent': return 'status-absent';
            case 'late': return 'status-late';
            default: return '';
        }
    };

    return (
        <div className="student-dashboard">
            <div className="dashboard-header">
                <h2>學生儀表板</h2>
                <div className="user-info">
                    <span>歡迎，{user?.userName}</span>
                </div>
            </div>

            <div className="quick-actions">
                <button 
                    className="action-btn primary"
                    onClick={() => navigate('/student-attendance')}
                >
                    📱 手機點名
                </button>
            </div>

            <div className="checkin-section">
                <h3>快速點名</h3>
                <form onSubmit={handleCheckIn}>
                    <div className="form-group">
                        <label>點名碼:</label>
                        <input
                            type="text"
                            value={attendanceCode}
                            onChange={(e) => setAttendanceCode(e.target.value)}
                            placeholder="請輸入老師提供的點名碼"
                            maxLength={6}
                        />
                    </div>
                    <button type="submit" disabled={loading}>
                        {loading ? '點名中...' : '點名'}
                    </button>
                </form>
            </div>

            <div className="records-section">
                <h3>點名記錄</h3>
                {attendanceRecords.length > 0 ? (
                    <div className="records-list">
                        {attendanceRecords.map((record) => (
                            <div key={record._id} className="record-item">
                                <div className="record-date">
                                    {formatDate(record.attendanceDate)}
                                </div>
                                <div className={`record-status ${getStatusClass(record.status)}`}>
                                    {getStatusText(record.status)}
                                </div>
                                {record.checkInTime && (
                                    <div className="record-time">
                                        點名時間: {formatDate(record.checkInTime)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>尚無點名記錄</p>
                )}
            </div>

            {message && (
                <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
