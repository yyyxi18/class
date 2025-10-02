import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../enum/api';
import { asyncPost } from '../utils/fetch';
import QRCodeScanner from './QRCodeScanner';
import Toast from './Toast';
import '../style/StudentAttendancePage.css';

interface AttendanceSession {
    _id: string;
    courseId: string;
    courseName: string;
    sessionCode: string;
    startTime: string;
    status: 'active' | 'ended';
}

const StudentAttendancePage: React.FC = () => {
    const { user } = useAuth();
    const [attendanceCode, setAttendanceCode] = useState<string>('');
    const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [toast, setToast] = useState({ 
        message: '', 
        type: 'success' as 'success' | 'error' | 'info', 
        isVisible: false 
    });
    const [recentAttendance, setRecentAttendance] = useState<any>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast({ ...toast, isVisible: false });
        }, 3000);
    };

    const hideToast = () => {
        setToast({ ...toast, isVisible: false });
    };

    const handleCodeAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attendanceCode.trim()) {
            showToast('請輸入點名代碼', 'error');
            return;
        }

        await performAttendance(attendanceCode);
    };

    const handleQRScanSuccess = async (qrData: string) => {
        try {
            // 嘗試解析QR碼數據
            const qrInfo = JSON.parse(qrData);
            if (qrInfo.type === 'attendance' && qrInfo.sessionCode) {
                await performAttendance(qrInfo.sessionCode);
            } else {
                // 如果不是標準格式，直接使用原始數據
                await performAttendance(qrData);
            }
        } catch (error) {
            // 如果解析失敗，直接使用原始數據
            await performAttendance(qrData);
        }
    };

    const handleQRScanError = (error: string) => {
        showToast(`掃描失敗: ${error}`, 'error');
    };

    const performAttendance = async (code: string) => {
        setLoading(true);
        try {
            const response = await asyncPost(api.checkIn, {
                attendanceCode: code
            });

            if (response.code === 200) {
                showToast('點名成功！', 'success');
                setRecentAttendance({
                    courseName: response.body.courseName,
                    sessionCode: response.body.sessionCode,
                    checkInTime: response.body.checkInTime,
                    userName: response.body.userName
                });
                setAttendanceCode('');
                setShowQRScanner(false);
            } else {
                showToast(response.message || '點名失敗', 'error');
            }
        } catch (error) {
            console.error('點名失敗:', error);
            showToast('點名失敗，請檢查網路連接', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openQRScanner = () => {
        setShowQRScanner(true);
    };

    const closeQRScanner = () => {
        setShowQRScanner(false);
    };

    return (
        <div className="student-attendance-page">
            <div className="attendance-header">
                <div className="user-info">
                    <div className="avatar">
                        {user?.userName?.charAt(0) || 'S'}
                    </div>
                    <div className="user-details">
                        <h2>{user?.userName || '學生'}</h2>
                        <p className="student-id">{user?.studentInfo?.sid || '學生'}</p>
                    </div>
                </div>
            </div>

            <div className="attendance-content">
                <div className="attendance-title">
                    <h1>📱 學生點名</h1>
                    <p>請選擇點名方式</p>
                </div>

                {/* 點名方式選擇 */}
                <div className="attendance-methods">
                    <button 
                        className="method-btn qr-btn"
                        onClick={openQRScanner}
                        disabled={loading}
                    >
                        <div className="method-icon">📷</div>
                        <div className="method-text">
                            <h3>掃描QR碼</h3>
                            <p>使用相機掃描QR碼</p>
                        </div>
                    </button>

                    <div className="divider">
                        <span>或</span>
                    </div>

                    <form onSubmit={handleCodeAttendance} className="code-form">
                        <div className="input-group">
                            <label>輸入點名代碼</label>
                            <input
                                type="text"
                                value={attendanceCode}
                                onChange={(e) => setAttendanceCode(e.target.value)}
                                placeholder="請輸入6位數字代碼"
                                maxLength={10}
                                className="code-input"
                                disabled={loading}
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="submit-btn"
                            disabled={loading || !attendanceCode.trim()}
                        >
                            {loading ? '點名中...' : '提交點名'}
                        </button>
                    </form>
                </div>

                {/* 最近點名記錄 */}
                {recentAttendance && (
                    <div className="recent-attendance">
                        <h3>✅ 點名成功</h3>
                        <div className="attendance-card">
                            <div className="card-header">
                                <span className="course-name">{recentAttendance.courseName}</span>
                                <span className="attendance-time">
                                    {new Date(recentAttendance.checkInTime).toLocaleString('zh-TW')}
                                </span>
                            </div>
                            <div className="card-body">
                                <p>會話代碼: {recentAttendance.sessionCode}</p>
                                <p>學生: {recentAttendance.userName}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 使用說明 */}
                <div className="instructions">
                    <h3>📋 使用說明</h3>
                    <div className="instruction-list">
                        <div className="instruction-item">
                            <span className="step">1</span>
                            <p>選擇QR碼掃描或輸入代碼</p>
                        </div>
                        <div className="instruction-item">
                            <span className="step">2</span>
                            <p>掃描老師提供的QR碼或輸入點名代碼</p>
                        </div>
                        <div className="instruction-item">
                            <span className="step">3</span>
                            <p>等待系統確認點名成功</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR碼掃描器 */}
            <QRCodeScanner
                isVisible={showQRScanner}
                onScanSuccess={handleQRScanSuccess}
                onScanError={handleQRScanError}
                onClose={closeQRScanner}
            />

            {/* Toast通知 */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />
        </div>
    );
};

export default StudentAttendancePage;
