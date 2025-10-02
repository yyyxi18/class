import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AttendanceSession, Course } from '../types/Attendance';
import { api } from '../enum/api';
import { asyncPost, asyncGet } from '../utils/fetch';
import Toast from './Toast';
import QRCodeScanner from './QRCodeScanner';
import QRCodeGenerator from './QRCodeGenerator';

const AttendanceManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [attendanceDate, setAttendanceDate] = useState<string>('');
    const [attendanceMode, setAttendanceMode] = useState<'code' | 'manual' | 'qrcode'>('code');
    const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
    const [courseStudents, setCourseStudents] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info', isVisible: false });
    const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
    const [showQRGenerator, setShowQRGenerator] = useState<boolean>(false);

    useEffect(() => {
        loadCourses();
        loadActiveSessions();
    }, []);

    const loadCourses = async () => {
        try {
            // 課程列表現在是公開的，不需要token
            const response = await asyncGet(api.COURSES);
            if (response.code === 200) {
                setCourses(response.body || []);
            } else {
                showToast(response.message || '載入課程失敗', 'error');
            }
        } catch (error) {
            console.error('載入課程失敗:', error);
            showToast('載入課程失敗', 'error');
        }
    };

    const loadActiveSessions = async () => {
        try {
            const response = await asyncGet(api.activeSessions);
            if (response.code === 200) {
                const sessions = response.body || [];
                setActiveSessions(sessions);
                
                // 如果有手動點名或QR碼點名的會話，設置為當前會話並載入學生
                const manualOrQRSession = sessions.find((session: AttendanceSession) => 
                    session.sessionCode.startsWith('MANUAL_') || session.sessionCode.startsWith('QR_')
                );
                
                if (manualOrQRSession && !currentSession) {
                    setCurrentSession(manualOrQRSession);
                    loadCourseStudents(manualOrQRSession.courseId);
                }
            } else {
                showToast(response.message || '載入活躍會話失敗', 'error');
            }
        } catch (error) {
            console.error('載入活躍會話失敗:', error);
            showToast('載入活躍會話失敗', 'error');
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const hideToast = () => {
        setToast({ ...toast, isVisible: false });
    };

    const handleStartAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !attendanceDate) {
            showToast('請選擇課程和日期', 'error');
            return;
        }

        try {
            const response = await asyncPost(api.startSession, {
                courseId: selectedCourse,
                sessionDate: attendanceDate,
                attendanceMode: attendanceMode
            });

            if (response.code === 200) {
                showToast('點名已開始', 'success');
                
                // 如果是手動點名或QR碼點名，設置當前會話並載入學生
                if (attendanceMode === 'manual' || attendanceMode === 'qrcode') {
                    setCurrentSession(response.body);
                    loadCourseStudents(selectedCourse);
                }
                
                setSelectedCourse('');
                setAttendanceDate('');
                loadActiveSessions();
            } else {
                showToast(response.message || '開始點名失敗', 'error');
            }
        } catch (error) {
            console.error('開始點名失敗:', error);
            showToast('開始點名失敗', 'error');
        }
    };

    const handleEndSession = async (sessionId: string) => {
        try {
            const response = await asyncPost(`${api.endSession}/${sessionId}`, {});
            if (response.code === 200) {
                showToast('點名會話已結束', 'success');
                
                // 如果結束的是當前會話，清除狀態
                if (currentSession && currentSession._id === sessionId) {
                    setCurrentSession(null);
                }
                
                loadActiveSessions();
            } else {
                showToast(response.message || '結束會話失敗', 'error');
            }
        } catch (error) {
            console.error('結束會話失敗:', error);
            showToast('結束會話失敗', 'error');
        }
    };

    const loadCourseStudents = async (courseId: string) => {
        try {
            console.log('正在載入課程學生，課程ID:', courseId);
            const response = await asyncGet(`${api.courseStudents}/${courseId}`);
            console.log('課程學生API響應:', response);
            if (response.code === 200) {
                setCourseStudents(response.body || []);
                console.log('成功載入學生數量:', (response.body || []).length);
            } else {
                console.error('載入課程學生失敗:', response.message);
                showToast(response.message || '載入課程學生失敗', 'error');
            }
        } catch (error) {
            console.error('載入課程學生失敗:', error);
            showToast('載入課程學生失敗', 'error');
        }
    };

    // 立即更新本地出席狀態
    const updateLocalAttendanceStatus = (studentId: string, status: 'present' | 'absent') => {
        if (!currentSession) return;

        // 找到對應的學生信息
        const student = courseStudents.find(cs => cs.studentInfo._id === studentId)?.studentInfo;
        if (!student) return;

        const actualStudentId = student.studentId; // 使用學生的實際學號

        setActiveSessions(prevSessions => 
            prevSessions.map(session => {
                if (session._id === currentSession._id) {
                    const updatedSession = { ...session };
                    
                    // 確保數組存在
                    if (!updatedSession.attendedStudents) updatedSession.attendedStudents = [];
                    if (!updatedSession.absentStudents) updatedSession.absentStudents = [];
                    
                    // 從所有列表中移除學生
                    updatedSession.attendedStudents = updatedSession.attendedStudents.filter(s => s.studentId !== actualStudentId);
                    updatedSession.absentStudents = updatedSession.absentStudents.filter(s => s.studentId !== actualStudentId);
                    
                    // 根據新狀態添加到對應列表
                    if (status === 'present') {
                        updatedSession.attendedStudents.push({
                            studentId: actualStudentId,
                            userName: student.name,
                            checkInTime: new Date().toISOString()
                        });
                    } else if (status === 'absent') {
                        updatedSession.absentStudents.push({
                            studentId: actualStudentId,
                            userName: student.name
                        });
                    }
                    
                    return updatedSession;
                }
                return session;
            })
        );

        // 更新當前會話
        setCurrentSession(prevSession => {
            if (!prevSession || prevSession._id !== currentSession._id) return prevSession;
            
            const updatedSession = { ...prevSession };
            
            // 確保數組存在
            if (!updatedSession.attendedStudents) updatedSession.attendedStudents = [];
            if (!updatedSession.absentStudents) updatedSession.absentStudents = [];
            
            // 從所有列表中移除學生
            updatedSession.attendedStudents = updatedSession.attendedStudents.filter(s => s.studentId !== actualStudentId);
            updatedSession.absentStudents = updatedSession.absentStudents.filter(s => s.studentId !== actualStudentId);
            
            // 根據新狀態添加到對應列表
            if (status === 'present') {
                updatedSession.attendedStudents.push({
                    studentId: actualStudentId,
                    userName: student.name,
                    checkInTime: new Date().toISOString()
                });
            } else if (status === 'absent') {
                updatedSession.absentStudents.push({
                    studentId: actualStudentId,
                    userName: student.name
                });
            }
            
            return updatedSession;
        });
    };

    // 立即更新本地狀態 - 標記所有學生為出席
    const updateLocalMarkAllPresent = () => {
        if (!currentSession) return;

        const allStudentIds = courseStudents.map(cs => cs.studentInfo._id);
        const currentTime = new Date().toISOString();

        setActiveSessions(prevSessions => 
            prevSessions.map(session => {
                if (session._id === currentSession._id) {
                    const updatedSession = { ...session };
                    
                    // 確保數組存在
                    if (!updatedSession.attendedStudents) updatedSession.attendedStudents = [];
                    if (!updatedSession.absentStudents) updatedSession.absentStudents = [];
                    
                    // 清空缺席學生列表
                    updatedSession.absentStudents = [];
                    
                    // 將所有學生添加到出席列表
                    updatedSession.attendedStudents = allStudentIds.map(studentId => ({
                        studentId,
                        userName: courseStudents.find(cs => cs.studentInfo._id === studentId)?.studentInfo?.name || '未知學生',
                        checkInTime: currentTime
                    }));
                    
                    return updatedSession;
                }
                return session;
            })
        );

        // 更新當前會話
        setCurrentSession(prevSession => {
            if (!prevSession || prevSession._id !== currentSession._id) return prevSession;
            
            const updatedSession = { ...prevSession };
            
            // 確保數組存在
            if (!updatedSession.attendedStudents) updatedSession.attendedStudents = [];
            if (!updatedSession.absentStudents) updatedSession.absentStudents = [];
            
            // 清空缺席學生列表
            updatedSession.absentStudents = [];
            
            // 將所有學生添加到出席列表
            updatedSession.attendedStudents = allStudentIds.map(studentId => ({
                studentId,
                userName: courseStudents.find(cs => cs.studentInfo._id === studentId)?.studentInfo?.name || '未知學生',
                checkInTime: currentTime
            }));
            
            return updatedSession;
        });
    };

    const handleManualAttendance = async (studentId: string, status: 'present' | 'absent') => {
        if (!currentSession) {
            showToast('請先選擇點名會話', 'error');
            return;
        }

        // 立即更新本地狀態
        updateLocalAttendanceStatus(studentId, status);

        try {
            const response = await asyncPost(api.manualAttendance, {
                sessionId: currentSession._id,
                studentId: studentId,
                status: status
            });

            if (response.code === 200) {
                showToast(response.message || '標記成功', 'success');
                // 不需要重新載入，因為已經立即更新了本地狀態
            } else {
                showToast(response.message || '標記失敗', 'error');
                // 如果API調用失敗，恢復之前的狀態
                loadActiveSessions();
            }
        } catch (error) {
            console.error('標記失敗:', error);
            showToast('標記失敗', 'error');
            // 如果API調用失敗，恢復之前的狀態
            loadActiveSessions();
        }
    };

    const handleMarkAllPresent = async () => {
        if (!currentSession) {
            showToast('請先選擇點名會話', 'error');
            return;
        }

        // 立即更新本地狀態 - 標記所有學生為出席
        updateLocalMarkAllPresent();

        try {
            const response = await asyncPost(api.markAllPresent, {
                sessionId: currentSession._id
            });

            if (response.code === 200) {
                showToast(response.message || '批量標記成功', 'success');
                // 不需要重新載入，因為已經立即更新了本地狀態
            } else {
                showToast(response.message || '批量標記失敗', 'error');
                // 如果API調用失敗，恢復之前的狀態
                loadActiveSessions();
            }
        } catch (error) {
            console.error('批量標記失敗:', error);
            showToast('批量標記失敗', 'error');
            // 如果API調用失敗，恢復之前的狀態
            loadActiveSessions();
        }
    };

    // 搜尋過濾學生
    const filteredStudents = courseStudents.filter(enrollment => {
        if (!searchTerm) return true;
        const student = enrollment.studentInfo;
        if (!student) return false;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            student.studentId.toLowerCase().includes(searchLower) ||
            student.name.toLowerCase().includes(searchLower) ||
            (student.department && student.department.toLowerCase().includes(searchLower)) ||
            (student.class && student.class.toLowerCase().includes(searchLower))
        );
    });

    const handleBack = () => {
        navigate('/');
    };

    // QR碼掃描成功處理
    const handleQRScanSuccess = async (qrData: string) => {
        try {
            // 使用掃描到的QR碼進行點名
            const response = await asyncPost(api.checkIn, {
                attendanceCode: qrData
            });

            if (response.code === 200) {
                showToast('點名成功！', 'success');
                // 重新載入活躍會話以更新點名人數
                loadActiveSessions();
            } else {
                showToast(response.message || '點名失敗', 'error');
            }
        } catch (error) {
            console.error('QR碼點名失敗:', error);
            showToast('點名失敗', 'error');
        }
    };

    // QR碼掃描錯誤處理
    const handleQRScanError = (error: string) => {
        showToast(`掃描失敗: ${error}`, 'error');
    };

    // 打開QR碼掃描器
    const openQRScanner = () => {
        setShowQRScanner(true);
    };

    // 關閉QR碼掃描器
    const closeQRScanner = () => {
        setShowQRScanner(false);
    };

    // 打開QR碼生成器
    const openQRGenerator = () => {
        setShowQRGenerator(true);
    };

    // 關閉QR碼生成器
    const closeQRGenerator = () => {
        setShowQRGenerator(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="attendance-management-page">
            <div className="page-header">
                <h1>點名管理</h1>
            </div>

            <div className="management-sections">
                {/* 開始點名區域 */}
                <div className="start-attendance-section">
                    <h2>開始點名</h2>
                    <form onSubmit={handleStartAttendance} className="attendance-form">
                        <div className="form-group">
                            <label>選擇課程:</label>
                            <select 
                                value={selectedCourse} 
                                onChange={(e) => {
                                    setSelectedCourse(e.target.value);
                                    if (e.target.value) {
                                        loadCourseStudents(e.target.value);
                                    }
                                }}
                                required
                            >
                                <option value="">請選擇課程</option>
                                {courses.map(course => (
                                    <option key={course._id} value={course._id}>
                                        {course.courseName} ({course.courseCode})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>點名日期:</label>
                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={(e) => setAttendanceDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>點名方式:</label>
                            <div className="attendance-mode-selector">
                                <label className="mode-option">
                                    <input
                                        type="radio"
                                        value="code"
                                        checked={attendanceMode === 'code'}
                                        onChange={(e) => setAttendanceMode(e.target.value as 'code')}
                                    />
                                    代碼點名
                                </label>
                                <label className="mode-option">
                                    <input
                                        type="radio"
                                        value="qrcode"
                                        checked={attendanceMode === 'qrcode'}
                                        onChange={(e) => setAttendanceMode(e.target.value as 'qrcode')}
                                    />
                                    QR碼點名
                                </label>
                                <label className="mode-option">
                                    <input
                                        type="radio"
                                        value="manual"
                                        checked={attendanceMode === 'manual'}
                                        onChange={(e) => setAttendanceMode(e.target.value as 'manual')}
                                    />
                                    手動點名
                                </label>
                            </div>
                        </div>
                        <button type="submit" className="start-btn">
                            開始點名
                        </button>
                    </form>
                </div>

                {/* 進行中的點名區域 */}
                <div className="active-sessions-section">
                    <h2>進行中的點名</h2>
                    {activeSessions.length === 0 ? (
                        <p>目前沒有進行中的點名</p>
                    ) : (
                        <div className="sessions-list">
                            {activeSessions.map((session) => (
                                <div key={session._id} className="session-item">
                                    <div className="session-info">
                                        <h4>{session.courseName}</h4>
                                        {session.sessionCode.startsWith('MANUAL_') ? (
                                            <p><span className="manual-mode">手動點名</span></p>
                                        ) : session.sessionCode.startsWith('QR_') ? (
                                            <p><span className="qr-mode">QR碼點名</span></p>
                                        ) : (
                                            <p>點名代碼: <span className="session-code">{session.sessionCode}</span></p>
                                        )}
                                        <p>開始時間: {formatDate(session.startTime)}</p>
                                        <p>目前點名人數: <span className="attendance-count">{session.attendanceCount || 0}</span> 人</p>
                                    </div>
                                    <div className="session-actions">
                                        {session.sessionCode.startsWith('QR_') && (
                                            <button 
                                                className="generate-qr-btn"
                                                onClick={openQRGenerator}
                                            >
                                                📱 生成QR碼
                                            </button>
                                        )}
                                        <button 
                                            className="end-session-btn"
                                            onClick={() => handleEndSession(session._id)}
                                        >
                                            結束點名
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 手動點名區域 */}
            {currentSession && (currentSession.sessionCode.startsWith('MANUAL_') || currentSession.sessionCode.startsWith('QR_')) && (
                    <div className="manual-attendance-section">
                        <div className="page-header">
                            <h1>
                                {currentSession.sessionCode.startsWith('QR_') ? 'QR碼點名' : '手動點名'} - {currentSession.courseName}
                            </h1>
                        </div>
                        
                        {/* 統計卡片 */}
                        <div className="attendance-stats">
                            <div className="stat-card">
                                <h3>總學生數</h3>
                                <div className="stat-number">{courseStudents.length}</div>
                            </div>
                            <div className="stat-card">
                                <h3>已點名</h3>
                                <div className="stat-number">
                                    {(currentSession.attendedStudents?.length || 0) + (currentSession.absentStudents?.length || 0)}
                                </div>
                            </div>
                            <div className="stat-card">
                                <h3>出席人數</h3>
                                <div className="stat-number present-count">{currentSession.attendedStudents?.length || 0}</div>
                            </div>
                            <div className="stat-card">
                                <h3>缺席人數</h3>
                                <div className="stat-number absent-count">{currentSession.absentStudents?.length || 0}</div>
                            </div>
                        </div>

                        {/* 批量操作按鈕 */}
                        <div className="batch-actions">
                            {currentSession.sessionCode.startsWith('QR_') && (
                                <button 
                                    className="qr-scan-btn"
                                    onClick={openQRScanner}
                                >
                                    📱 開啟QR碼掃描器
                                </button>
                            )}
                            <button 
                                className="mark-all-present-btn"
                                onClick={handleMarkAllPresent}
                                disabled={courseStudents.length === 0}
                            >
                                批量標記所有學生為出席
                            </button>
                        </div>

                        {/* 搜尋框 */}
                        <div className="search-section">
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="搜尋學生（學號、姓名、院系、班級）..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                <div className="search-icon">🔍</div>
                            </div>
                            {searchTerm && (
                                <div className="search-results-info">
                                    找到 {filteredStudents.length} 名學生
                                </div>
                            )}
                        </div>

                        {/* 學生列表 */}
                        {courseStudents.length === 0 ? (
                            <div className="no-students">
                                <p>此課程暫無學生</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="no-students">
                                <p>沒有找到符合搜尋條件的學生</p>
                            </div>
                        ) : (
                            <div className="students-table">
                                <div className="table-header">
                                    <div className="col-id">學號</div>
                                    <div className="col-name">姓名</div>
                                    <div className="col-department">院系</div>
                                    <div className="col-class">班級</div>
                                    <div className="col-status">狀態</div>
                                    <div className="col-actions">操作</div>
                                </div>
                                <div className="table-body">
                                    {filteredStudents.map((enrollment) => {
                                        const student = enrollment.studentInfo;
                                        if (!student) return null;
                                        
                                        const isPresent = currentSession.attendedStudents?.some(s => s.studentId === student.studentId);
                                        const isAbsent = currentSession.absentStudents?.some(s => s.studentId === student.studentId);
                                        
                                        return (
                                            <div key={student._id} className={`table-row ${isPresent ? 'present' : isAbsent ? 'absent' : 'unmarked'}`}>
                                                <div className="col-id">{student.studentId}</div>
                                                <div className="col-name">{student.name}</div>
                                                <div className="col-department">{student.department || '-'}</div>
                                                <div className="col-class">{student.class || '-'}</div>
                                                <div className="col-status">
                                                    {isPresent ? (
                                                        <span className="status-badge present">出席</span>
                                                    ) : isAbsent ? (
                                                        <span className="status-badge absent">缺席</span>
                                                    ) : (
                                                        <span className="status-badge present">出席</span>
                                                    )}
                                                </div>
                                                <div className="col-actions">
                                                    <button
                                                        className={`toggle-attendance-btn ${isPresent ? 'present' : isAbsent ? 'absent' : 'present'}`}
                                                        onClick={() => {
                                                            if (isPresent) {
                                                                handleManualAttendance(student._id, 'absent');
                                                            } else if (isAbsent) {
                                                                handleManualAttendance(student._id, 'present');
                                                            } else {
                                                                handleManualAttendance(student._id, 'absent');
                                                            }
                                                        }}
                                                    >
                                                        {isPresent ? '出席' : isAbsent ? '缺席' : '出席'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            <div className="page-footer">
                <button className="back-btn" onClick={handleBack}>
                    ← 返回
                </button>
            </div>

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />

            {/* QR碼掃描器 */}
            <QRCodeScanner
                isVisible={showQRScanner}
                onScanSuccess={handleQRScanSuccess}
                onScanError={handleQRScanError}
                onClose={closeQRScanner}
            />

            {/* QR碼生成器 */}
            {showQRGenerator && currentSession && currentSession.sessionCode.startsWith('QR_') && (
                <QRCodeGenerator
                    sessionCode={currentSession.sessionCode}
                    courseName={currentSession.courseName}
                    onClose={closeQRGenerator}
                />
            )}
        </div>
    );
};

export default AttendanceManagementPage;
