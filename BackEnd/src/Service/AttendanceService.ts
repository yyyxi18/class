import { Service } from "../abstract/Service";
import { Attendance, AttendanceSession, Course } from "../interfaces/Course";
import { attendanceModel, attendanceSessionModel, courseModel } from "../orm/schemas/courseSchemas";
import { resp } from "../utils/resp";
import { logger } from "../middlewares/log";

export class AttendanceService extends Service {

    /**
     * 開始點名（管理員功能）
     */
    public async startAttendanceSession(courseId: string, sessionDate: Date, attendanceMode: string = 'code'): Promise<resp<AttendanceSession | undefined>> {
        const response: resp<AttendanceSession | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 檢查課程是否存在
            const course = await courseModel.findById(courseId);
            if (!course) {
                response.code = 404;
                response.message = "課程不存在";
                return response;
            }

            // 根據點名方式生成代碼
            let sessionCode: string;
            if (attendanceMode === 'manual') {
                // 為手動點名生成唯一代碼
                sessionCode = 'MANUAL_' + Date.now();
            } else if (attendanceMode === 'qrcode') {
                // 為QR碼點名生成唯一代碼
                sessionCode = 'QR_' + Date.now();
            } else {
                // 為代碼點名生成6位隨機數字
                sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
            }

            // 獲取課程所有學生並預設為出席
            const { CourseStudentService } = await import('./CourseStudentService');
            const courseStudentService = new CourseStudentService();
            const courseStudentsResponse = await courseStudentService.getCourseStudents(courseId);
            
            let defaultAttendedStudents = [];
            if (courseStudentsResponse.code === 200 && courseStudentsResponse.body) {
                const currentTime = new Date();
                defaultAttendedStudents = courseStudentsResponse.body.map(enrollment => ({
                    studentId: enrollment.studentInfo?.studentId || enrollment.studentId,
                    userName: enrollment.studentInfo?.name || '未知學生',
                    checkInTime: currentTime
                }));
            }

            // 創建點名會話
            const session = new attendanceSessionModel({
                courseId,
                courseName: course.courseName,
                sessionCode,
                startTime: new Date(),
                status: 'active',
                attendedStudents: defaultAttendedStudents,
                absentStudents: []
            });

            const savedSession = await session.save();
            response.body = savedSession;
            response.message = `點名會話已開始，已預設 ${defaultAttendedStudents.length} 名學生為出席`;

        } catch (error) {
            logger.error('Start attendance session error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 結束點名會話（管理員功能）
     */
    public async endAttendanceSession(sessionId: string): Promise<resp<AttendanceSession | undefined>> {
        const response: resp<AttendanceSession | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            const session = await attendanceSessionModel.findByIdAndUpdate(
                sessionId,
                { 
                    status: 'ended', 
                    endTime: new Date(),
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!session) {
                response.code = 404;
                response.message = "點名會話不存在";
                return response;
            }

            response.body = session;
            response.message = "點名會話已結束";

        } catch (error) {
            logger.error('End attendance session error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 學生點名
     */
    public async checkIn(studentId: string, attendanceCode: string): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 查找有效的點名會話 - 支持多種格式的代碼
            const session = await attendanceSessionModel.findOne({
                sessionCode: attendanceCode,
                status: 'active'
            });

            if (!session) {
                response.code = 400;
                response.message = "點名碼無效或已過期";
                return response;
            }

            // 檢查是否已經點名過（在當前會話中）
            const existingRecord = session.attendedStudents?.find(s => s.studentId === studentId);
            if (existingRecord) {
                response.code = 400;
                response.message = "您已經點名過了";
                return response;
            }

            // 獲取學生信息
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            const student = await studentModel.findById(studentId);
            if (!student) {
                response.code = 404;
                response.message = "學生不存在";
                return response;
            }

            // 將學生添加到出席列表
            if (!session.attendedStudents) session.attendedStudents = [];
            session.attendedStudents.push({
                studentId: student.studentId,
                userName: student.name,
                checkInTime: new Date()
            });

            await session.save();
            response.body = {
                studentId: student.studentId,
                userName: student.name,
                checkInTime: new Date(),
                sessionCode: session.sessionCode,
                courseName: session.courseName
            };
            response.message = "點名成功";

        } catch (error) {
            logger.error('Check in error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 獲取學生的點名記錄
     */
    public async getStudentAttendance(studentId: string, courseId?: string): Promise<resp<Attendance[] | undefined>> {
        const response: resp<Attendance[] | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            const filter: any = { studentId };
            if (courseId) {
                filter.courseId = courseId;
            }

            const attendances = await attendanceModel.find(filter).sort({ attendanceDate: -1 });
            response.body = attendances;
            response.message = "獲取點名記錄成功";

        } catch (error) {
            logger.error('Get student attendance error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 獲取課程的點名統計（管理員功能）
     */
    public async getCourseAttendanceStats(courseId: string, sessionId?: string): Promise<resp<any | undefined>> {
        const response: resp<any | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            let filter: any = { courseId };
            if (sessionId) {
                const session = await attendanceSessionModel.findById(sessionId);
                if (session) {
                    filter.attendanceDate = {
                        $gte: new Date(session.startTime.getFullYear(), session.startTime.getMonth(), session.startTime.getDate()),
                        $lt: new Date(session.startTime.getFullYear(), session.startTime.getMonth(), session.startTime.getDate() + 1)
                    };
                }
            }

            const stats = await attendanceModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            response.body = {
                total: stats.reduce((sum, stat) => sum + stat.count, 0),
                present: stats.find(s => s._id === 'present')?.count || 0,
                absent: stats.find(s => s._id === 'absent')?.count || 0,
                late: stats.find(s => s._id === 'late')?.count || 0
            };
            response.message = "獲取統計資料成功";

        } catch (error) {
            logger.error('Get course attendance stats error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 獲取活躍的點名會話
     * @returns 活躍點名會話列表
     */
    public async getActiveSessions(): Promise<resp<any[] | undefined>> {
        const response: resp<any[] | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            const activeSessions = await attendanceSessionModel
                .find({ status: 'active' })
                .populate('courseId', 'courseName courseCode')
                .sort({ startTime: -1 });

            // 為每個會話添加點名人數
            const sessionsWithCount = activeSessions.map(session => ({
                ...session.toObject(),
                attendanceCount: session.attendedStudents ? session.attendedStudents.length : 0
            }));

            response.body = sessionsWithCount;
            response.message = "獲取活躍點名會話成功";

        } catch (error) {
            logger.error('Error getting active sessions:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 獲取所有點名會話（包括已結束的）
     * @returns 所有點名會話列表
     */
    public async getAllSessions(): Promise<resp<any[] | undefined>> {
        const response: resp<any[] | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            const allSessions = await attendanceSessionModel
                .find({})
                .sort({ startTime: -1 });

            // 為每個會話添加點名人數
            const sessionsWithCount = allSessions.map(session => ({
                ...session.toObject(),
                attendanceCount: session.attendedStudents ? session.attendedStudents.length : 0
            }));

            response.body = sessionsWithCount;
            response.message = "獲取所有點名會話成功";

        } catch (error) {
            logger.error('Error getting all sessions:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 獲取課程學生列表（用於手動點名）
     */
    public async getCourseStudentsForAttendance(courseId: string): Promise<resp<any[] | undefined>> {
        const response: resp<any[] | undefined> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 從 CourseStudentService 獲取課程學生
            const { CourseStudentService } = await import('./CourseStudentService');
            const courseStudentService = new CourseStudentService();
            const courseStudentsResponse = await courseStudentService.getCourseStudents(courseId);

            if (courseStudentsResponse.code === 200 && courseStudentsResponse.body) {
                response.body = courseStudentsResponse.body;
                response.message = "獲取課程學生列表成功";
            } else {
                response.code = courseStudentsResponse.code;
                response.message = courseStudentsResponse.message;
            }

        } catch (error) {
            logger.error('Get course students for attendance error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 手動標記學生出席
     */
    public async manualAttendance(sessionId: string, studentId: string, status: 'present' | 'absent'): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 查找點名會話
            const session = await attendanceSessionModel.findById(sessionId);
            if (!session) {
                response.code = 404;
                response.message = "點名會話不存在";
                return response;
            }

            // 查找學生信息
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            const student = await studentModel.findById(studentId);
            if (!student) {
                response.code = 404;
                response.message = "學生不存在";
                return response;
            }

            // 確保數組存在
            if (!session.attendedStudents) session.attendedStudents = [];
            if (!session.absentStudents) session.absentStudents = [];

            // 檢查是否已經標記過，如果已標記則切換狀態
            const existingPresentRecord = session.attendedStudents.find(s => s.studentId === studentId);
            const existingAbsentRecord = session.absentStudents.find(s => s.studentId === studentId);

            if (existingPresentRecord || existingAbsentRecord) {
                // 學生已經點名過，切換狀態
                if (status === 'present') {
                    // 從缺席列表移除，添加到出席列表
                    session.absentStudents = session.absentStudents.filter(s => s.studentId !== studentId);
                    if (!existingPresentRecord) {
                        session.attendedStudents.push({
                            studentId: student.studentId,
                            userName: student.name,
                            checkInTime: new Date()
                        });
                    }
                } else {
                    // 從出席列表移除，添加到缺席列表
                    session.attendedStudents = session.attendedStudents.filter(s => s.studentId !== studentId);
                    if (!existingAbsentRecord) {
                        session.absentStudents.push({
                            studentId: student.studentId,
                            userName: student.name
                        });
                    }
                }
            } else {
                // 添加新記錄
                if (status === 'present') {
                    session.attendedStudents.push({
                        studentId: student.studentId,
                        userName: student.name,
                        checkInTime: new Date()
                    });
                } else {
                    session.absentStudents.push({
                        studentId: student.studentId,
                        userName: student.name
                    });
                }
            }

            await session.save();
            response.message = `學生 ${student.name} 已標記為${status === 'present' ? '出席' : '缺席'}`;

        } catch (error) {
            logger.error('Manual attendance error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 批量標記所有學生為出席
     */
    public async markAllStudentsPresent(sessionId: string): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 查找點名會話
            const session = await attendanceSessionModel.findById(sessionId);
            if (!session) {
                response.code = 404;
                response.message = "點名會話不存在";
                return response;
            }

            // 確保數組存在
            if (!session.attendedStudents) session.attendedStudents = [];
            if (!session.absentStudents) session.absentStudents = [];
            if (!session.excusedStudents) session.excusedStudents = [];

            // 獲取課程學生
            const { courseStudentModel } = await import('../orm/schemas/courseStudentSchemas');
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            
            const courseStudents = await courseStudentModel.find({ courseId: session.courseId });
            const studentIds = courseStudents.map(cs => cs.studentId);
            const students = await studentModel.find({ _id: { $in: studentIds } });

            let markedCount = 0;
            const currentTime = new Date();

            // 清空缺席和請假列表（因為要標記所有人為出席）
            session.absentStudents = [];
            session.excusedStudents = [];

            // 標記每個學生為出席
            for (const student of students) {
                // 檢查是否已經標記為出席
                const alreadyPresent = session.attendedStudents.find(s => s.studentId === student.studentId);
                
                if (!alreadyPresent) {
                    session.attendedStudents.push({
                        studentId: student.studentId,
                        userName: student.name,
                        checkInTime: currentTime
                    });
                    markedCount++;
                }
            }

            await session.save();
            response.message = `成功標記 ${markedCount} 名學生為出席`;
            response.body = { markedCount, totalStudents: students.length };

        } catch (error) {
            logger.error('Mark all students present error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 更新學生出席狀態（用於編輯點名紀錄）
     */
    public async updateAttendanceStatus(sessionId: string, studentId: string, newStatus: 'present' | 'absent' | 'excused', notes?: string): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 查找點名會話
            const session = await attendanceSessionModel.findById(sessionId);
            if (!session) {
                response.code = 404;
                response.message = "點名會話不存在";
                return response;
            }

            // 查找學生信息
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            const student = await studentModel.findById(studentId);
            if (!student) {
                response.code = 404;
                response.message = "學生不存在";
                return response;
            }

            // 確保數組存在
            if (!session.attendedStudents) session.attendedStudents = [];
            if (!session.absentStudents) session.absentStudents = [];
            if (!session.excusedStudents) session.excusedStudents = [];

            // 從所有列表中移除學生
            session.attendedStudents = session.attendedStudents.filter(s => s.studentId !== student.studentId);
            session.absentStudents = session.absentStudents.filter(s => s.studentId !== student.studentId);
            session.excusedStudents = session.excusedStudents.filter(s => s.studentId !== student.studentId);

            // 根據新狀態添加到對應列表
            if (newStatus === 'present') {
                session.attendedStudents.push({
                    studentId: student.studentId,
                    userName: student.name,
                    checkInTime: new Date(),
                    notes: notes || ''
                });
            } else if (newStatus === 'absent') {
                session.absentStudents.push({
                    studentId: student.studentId,
                    userName: student.name,
                    notes: notes || ''
                });
            } else if (newStatus === 'excused') {
                session.excusedStudents.push({
                    studentId: student.studentId,
                    userName: student.name,
                    notes: notes || ''
                });
            }

            await session.save();
            
            const statusText = newStatus === 'present' ? '出席' : newStatus === 'absent' ? '缺席' : '請假';
            response.message = `學生 ${student.name} 的狀態已更新為${statusText}`;

        } catch (error) {
            logger.error('Update attendance status error:', error);
            response.code = 500;
            response.message = "伺服器錯誤";
        }

        return response;
    }

    /**
     * 匯出單次點名會話為 Excel
     */
    public async exportSessionToExcel(sessionId: string): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            const XLSX = require('xlsx');
            
            // 查找點名會話
            const session = await attendanceSessionModel.findById(sessionId);
            if (!session) {
                response.code = 404;
                response.message = "點名會話不存在";
                return response;
            }

            // 獲取課程資訊
            const { courseModel } = await import('../orm/schemas/courseSchemas');
            const course = await courseModel.findById(session.courseId);
            if (!course) {
                response.code = 404;
                response.message = "課程不存在";
                return response;
            }

            // 獲取課程學生列表
            const { courseStudentModel } = await import('../orm/schemas/courseStudentSchemas');
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            
            const enrollments = await courseStudentModel.find({ courseId: session.courseId }).populate('studentId');
            const students = enrollments.map(enrollment => enrollment.studentId).filter(student => student != null) as any[];

            if (students.length === 0) {
                response.code = 404;
                response.message = "此課程沒有學生資料";
                return response;
            }

            // 創建 Excel 工作簿
            const workbook = XLSX.utils.book_new();

            // 1. 點名會話概覽表格
            const sessionSummaryData = [
                ['點名會話詳細資訊'],
                ['', ''],
                ['課程名稱', course.courseName],
                ['課程代碼', course.courseCode],
                ['點名代碼', session.sessionCode],
                ['開始時間', new Date(session.startTime).toLocaleString('zh-TW')],
                ['結束時間', session.endTime ? new Date(session.endTime).toLocaleString('zh-TW') : '進行中'],
                ['會話狀態', session.status === 'ended' ? '已結束' : '進行中'],
                ['總學生數', students.length.toString()],
                ['出席人數', (session.attendedStudents?.length || 0).toString()],
                ['缺席人數', (session.absentStudents?.length || 0).toString()],
                ['請假人數', (session.excusedStudents?.length || 0).toString()],
                ['出席率', students.length > 0 ? `${Math.round(((session.attendedStudents?.length || 0) / students.length) * 100)}%` : '0%'],
                [''],
                ['匯出時間', new Date().toLocaleString('zh-TW')]
            ];

            const sessionSummarySheet = XLSX.utils.aoa_to_sheet(sessionSummaryData);
            XLSX.utils.book_append_sheet(workbook, sessionSummarySheet, '點名會話概覽');

            // 2. 學生出席詳細表格
            const studentData = [
                ['學號', '姓名', '系別', '班級', '出席狀態', '簽到時間', '備註']
            ];

            // 遍歷所有學生，根據其出席狀態填入表格
            students.forEach(student => {
                const isPresent = session.attendedStudents?.find(s => s.studentId === student.studentId);
                const isAbsent = session.absentStudents?.find(s => s.studentId === student.studentId);
                const isExcused = session.excusedStudents?.find(s => s.studentId === student.studentId);

                let status = '未點名';
                let checkInTime = '-';
                let notes = '';

                if (isPresent) {
                    status = '出席';
                    checkInTime = isPresent.checkInTime ? new Date(isPresent.checkInTime).toLocaleString('zh-TW') : '-';
                    notes = isPresent.notes || '';
                } else if (isAbsent) {
                    status = '缺席';
                    notes = isAbsent.notes || '';
                } else if (isExcused) {
                    status = '請假';
                    notes = isExcused.notes || '';
                }

                studentData.push([
                    student.studentId,
                    student.name,
                    student.department || '',
                    student.class || '',
                    status,
                    checkInTime,
                    notes
                ]);
            });

            const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
            XLSX.utils.book_append_sheet(workbook, studentSheet, '學生出席明細');

            // 3. 統計資料表格
            const totalStudents = students.length;
            const presentCount = session.attendedStudents?.length || 0;
            const absentCount = session.absentStudents?.length || 0;
            const excusedCount = session.excusedStudents?.length || 0;
            const markedTotal = presentCount + absentCount + excusedCount;
            const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) + '%' : '0%';

            const statsData = [
                ['統計資料'],
                ['', ''],
                ['總學生數', totalStudents.toString()],
                ['已點名人數', markedTotal.toString()],
                ['未點名人數', (totalStudents - markedTotal).toString()],
                ['出席人數', presentCount.toString()],
                ['缺席人數', absentCount.toString()],
                ['請假人數', excusedCount.toString()],
                ['出席率', attendanceRate],
                [''],
                ['生成時間', new Date().toLocaleString('zh-TW')]
            ];

            const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
            XLSX.utils.book_append_sheet(workbook, statsSheet, '統計資料');

            // 生成 Excel 檔案
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
            const filename = `${course.courseName}_點名記錄_${sessionDate}_${session.sessionCode}.xlsx`;
            
            response.body = {
                buffer: excelBuffer,
                filename: filename
            };
            response.message = "匯出成功";

        } catch (error) {
            logger.error('Export session to Excel error:', error);
            response.code = 500;
            response.message = "匯出失敗";
        }

        return response;
    }

    /**
     * 匯出課程點名紀錄為 Excel
     */
    public async exportAttendanceToExcel(courseId: string): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            const XLSX = require('xlsx');
            
            // 獲取課程資訊
            const { courseModel } = await import('../orm/schemas/courseSchemas');
            const course = await courseModel.findById(courseId);
            if (!course) {
                response.code = 404;
                response.message = "課程不存在";
                return response;
            }

            // 獲取課程的所有點名會話
            const sessions = await attendanceSessionModel.find({ courseId }).sort({ startTime: -1 });
            if (sessions.length === 0) {
                response.code = 404;
                response.message = "此課程尚無點名紀錄";
                return response;
            }

            // 獲取課程學生列表
            const { courseStudentModel } = await import('../orm/schemas/courseStudentSchemas');
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            
            const enrollments = await courseStudentModel.find({ courseId }).populate('studentId');
            const students = enrollments.map(enrollment => enrollment.studentId).filter(student => student != null) as any[];
            
            // 調試資訊
            logger.info(`Found ${enrollments.length} enrollments for course ${courseId}`);
            logger.info(`Found ${students.length} students after populate`);
            
            if (students.length === 0) {
                response.code = 404;
                response.message = "此課程沒有學生資料";
                return response;
            }

            // 創建 Excel 工作簿
            const workbook = XLSX.utils.book_new();

            // 1. 創建總覽工作表
            const summaryData = [
                ['課程名稱', course.courseName],
                ['課程代碼', course.courseCode],
                ['總點名次數', sessions.length.toString()],
                ['學生總數', students.length.toString()],
                ['匯出日期', new Date().toLocaleString('zh-TW')],
                ['', ''],
                ['點名會話詳細列表', ''],
                ['會話代碼', '日期', '開始時間', '結束時間', '狀態', '出席人數', '缺席人數', '請假人數', '出席率']
            ];

            sessions.forEach(session => {
                const presentCount = session.attendedStudents?.length || 0;
                const absentCount = session.absentStudents?.length || 0;
                const excusedCount = session.excusedStudents?.length || 0;
                const totalCount = presentCount + absentCount + excusedCount;
                const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) + '%' : '0%';
                
                const startDate = new Date(session.startTime);
                const endDate = session.endTime ? new Date(session.endTime) : null;

                summaryData.push([
                    session.sessionCode,
                    startDate.toLocaleDateString('zh-TW'),
                    startDate.toLocaleTimeString('zh-TW'),
                    endDate ? endDate.toLocaleTimeString('zh-TW') : '進行中',
                    session.status === 'ended' ? '已結束' : '進行中',
                    presentCount.toString(),
                    absentCount.toString(),
                    excusedCount.toString(),
                    attendanceRate
                ]);
            });

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, '總覽');

            // 2. 創建詳細紀錄工作表
            const detailData = [
                ['日期', '會話代碼', '學號', '姓名', '系別', '班級', '出席狀態', '備註', '簽到時間', '會話狀態']
            ];

            sessions.forEach(session => {
                const sessionDate = new Date(session.startTime);
                const sessionStatus = session.status === 'ended' ? '已結束' : '進行中';
                
                // 出席學生
                session.attendedStudents?.forEach(student => {
                    const studentInfo = students.find(s => s && s.studentId === student.studentId);
                    detailData.push([
                        sessionDate.toLocaleDateString('zh-TW'),
                        session.sessionCode,
                        student.studentId,
                        student.userName,
                        studentInfo?.department || '',
                        studentInfo?.class || '',
                        '出席',
                        student.notes || '',
                        new Date(student.checkInTime).toLocaleString('zh-TW'),
                        sessionStatus
                    ]);
                });

                // 缺席學生
                session.absentStudents?.forEach(student => {
                    const studentInfo = students.find(s => s && s.studentId === student.studentId);
                    detailData.push([
                        sessionDate.toLocaleDateString('zh-TW'),
                        session.sessionCode,
                        student.studentId,
                        student.userName,
                        studentInfo?.department || '',
                        studentInfo?.class || '',
                        '缺席',
                        student.notes || '',
                        '-',
                        sessionStatus
                    ]);
                });

                // 請假學生
                session.excusedStudents?.forEach(student => {
                    const studentInfo = students.find(s => s && s.studentId === student.studentId);
                    detailData.push([
                        sessionDate.toLocaleDateString('zh-TW'),
                        session.sessionCode,
                        student.studentId,
                        student.userName,
                        studentInfo?.department || '',
                        studentInfo?.class || '',
                        '請假',
                        student.notes || '',
                        '-',
                        sessionStatus
                    ]);
                });
            });

            const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
            XLSX.utils.book_append_sheet(workbook, detailSheet, '詳細紀錄');

            // 3. 創建學生統計工作表
            const studentStatsData = [
                ['學號', '姓名', '系別', '班級', '總點名次數', '出席次數', '缺席次數', '請假次數', '出席率', '最後點名日期', '最後出席狀態']
            ];

            students.forEach(student => {
                let totalSessions = 0;
                let presentCount = 0;
                let absentCount = 0;
                let excusedCount = 0;
                let lastAttendanceDate = '';
                let lastAttendanceStatus = '';

                // 按時間排序會話（最新的在前）
                const sortedSessions = [...sessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

                sortedSessions.forEach(session => {
                    const isPresent = session.attendedStudents?.some(s => s.studentId === student.studentId);
                    const isAbsent = session.absentStudents?.some(s => s.studentId === student.studentId);
                    const isExcused = session.excusedStudents?.some(s => s.studentId === student.studentId);

                    if (isPresent || isAbsent || isExcused) {
                        totalSessions++;
                        if (isPresent) presentCount++;
                        if (isAbsent) absentCount++;
                        if (isExcused) excusedCount++;

                        // 記錄最後一次點名資訊（因為已經排序，第一次遇到就是最新的）
                        if (!lastAttendanceDate) {
                            lastAttendanceDate = new Date(session.startTime).toLocaleDateString('zh-TW');
                            if (isPresent) lastAttendanceStatus = '出席';
                            else if (isAbsent) lastAttendanceStatus = '缺席';
                            else if (isExcused) lastAttendanceStatus = '請假';
                        }
                    }
                });

                const attendanceRate = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) + '%' : '0%';

                studentStatsData.push([
                    student.studentId,
                    student.name,
                    student.department || '',
                    student.class || '',
                    totalSessions.toString(),
                    presentCount.toString(),
                    absentCount.toString(),
                    excusedCount.toString(),
                    attendanceRate,
                    lastAttendanceDate || '無紀錄',
                    lastAttendanceStatus || '無紀錄'
                ]);
            });

            const statsSheet = XLSX.utils.aoa_to_sheet(studentStatsData);
            XLSX.utils.book_append_sheet(workbook, statsSheet, '學生統計');

            // 4. 創建每日統計工作表
            const dailyStatsData = [
                ['日期', '會話代碼', '開始時間', '結束時間', '狀態', '總學生數', '出席人數', '缺席人數', '請假人數', '出席率', '缺席率', '請假率']
            ];

            sessions.forEach(session => {
                const presentCount = session.attendedStudents?.length || 0;
                const absentCount = session.absentStudents?.length || 0;
                const excusedCount = session.excusedStudents?.length || 0;
                const totalCount = presentCount + absentCount + excusedCount;
                
                const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) + '%' : '0%';
                const absenceRate = totalCount > 0 ? ((absentCount / totalCount) * 100).toFixed(1) + '%' : '0%';
                const excusedRate = totalCount > 0 ? ((excusedCount / totalCount) * 100).toFixed(1) + '%' : '0%';
                
                const startDate = new Date(session.startTime);
                const endDate = session.endTime ? new Date(session.endTime) : null;

                dailyStatsData.push([
                    startDate.toLocaleDateString('zh-TW'),
                    session.sessionCode,
                    startDate.toLocaleTimeString('zh-TW'),
                    endDate ? endDate.toLocaleTimeString('zh-TW') : '進行中',
                    session.status === 'ended' ? '已結束' : '進行中',
                    students.length.toString(),
                    presentCount.toString(),
                    absentCount.toString(),
                    excusedCount.toString(),
                    attendanceRate,
                    absenceRate,
                    excusedRate
                ]);
            });

            const dailyStatsSheet = XLSX.utils.aoa_to_sheet(dailyStatsData);
            XLSX.utils.book_append_sheet(workbook, dailyStatsSheet, '每日統計');

            // 生成 Excel 檔案
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            response.body = {
                buffer: excelBuffer,
                filename: `${course.courseName}_點名紀錄_${new Date().toISOString().split('T')[0]}.xlsx`
            };
            response.message = "匯出成功";

        } catch (error) {
            logger.error('Export attendance to Excel error:', error);
            response.code = 500;
            response.message = "匯出失敗";
        }

        return response;
    }

    /**
     * 隨機抽點功能 - 從指定日期已結束的點名中隨機抽取3位有出席的學生
     */
    public async randomSelection(courseId: string, targetDate?: string): Promise<resp<any>> {
        const response: resp<any> = {
            code: 200,
            message: "",
            body: undefined
        };

        try {
            // 獲取課程資訊
            const { courseModel } = await import('../orm/schemas/courseSchemas');
            const course = await courseModel.findById(courseId);
            if (!course) {
                response.code = 404;
                response.message = "課程不存在";
                return response;
            }

            // 獲取指定日期的日期範圍
            const targetDateTime = targetDate ? new Date(targetDate) : new Date();
            const startOfDay = new Date(targetDateTime.getFullYear(), targetDateTime.getMonth(), targetDateTime.getDate());
            const endOfDay = new Date(targetDateTime.getFullYear(), targetDateTime.getMonth(), targetDateTime.getDate(), 23, 59, 59, 999);

            // 查找當天已結束的點名會話
            const todaySessions = await attendanceSessionModel.find({
                courseId,
                status: 'ended',
                startTime: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).sort({ startTime: -1 });

            if (todaySessions.length === 0) {
                response.code = 404;
                response.message = targetDate ? 
                    `指定日期 (${targetDateTime.toLocaleDateString('zh-TW')}) 沒有已結束的點名會話` :
                    "今天沒有已結束的點名會話";
                return response;
            }

            // 收集所有出席的學生
            const allPresentStudents: any[] = [];
            
            todaySessions.forEach(session => {
                if (session.attendedStudents && session.attendedStudents.length > 0) {
                    session.attendedStudents.forEach(student => {
                        // 避免重複（同一個學生在多個會話中出席）
                        if (!allPresentStudents.some(existing => existing.studentId === student.studentId)) {
                            allPresentStudents.push({
                                studentId: student.studentId,
                                userName: student.userName,
                                sessionCode: session.sessionCode,
                                checkInTime: student.checkInTime,
                                notes: student.notes || ''
                            });
                        }
                    });
                }
            });

            if (allPresentStudents.length === 0) {
                response.code = 404;
                response.message = targetDate ? 
                    `指定日期 (${targetDateTime.toLocaleDateString('zh-TW')}) 沒有出席的學生` :
                    "今天沒有出席的學生";
                return response;
            }

            // 隨機抽取最多3位學生
            const selectedCount = Math.min(3, allPresentStudents.length);
            const selectedStudents = this.shuffleArray([...allPresentStudents]).slice(0, selectedCount);

            // 獲取學生詳細資訊
            const { studentModel } = await import('../orm/schemas/studentSchemas');
            const studentIds = selectedStudents.map(s => s.studentId);
            const students = await studentModel.find({ studentId: { $in: studentIds } });

            // 合併學生詳細資訊
            const result = selectedStudents.map(selected => {
                const studentInfo = students.find(s => s.studentId === selected.studentId);
                return {
                    studentId: selected.studentId,
                    userName: selected.userName,
                    department: studentInfo?.department || '',
                    class: studentInfo?.class || '',
                    sessionCode: selected.sessionCode,
                    checkInTime: selected.checkInTime,
                    notes: selected.notes,
                    email: studentInfo?.email || ''
                };
            });

            response.body = {
                selectedStudents: result,
                totalPresentStudents: allPresentStudents.length,
                totalSessions: todaySessions.length,
                selectionDate: targetDateTime.toLocaleDateString('zh-TW'),
                courseName: course.courseName
            };
            response.message = `成功抽取 ${selectedCount} 位學生`;

        } catch (error) {
            logger.error('Random selection error:', error);
            response.code = 500;
            response.message = "隨機抽點失敗";
        }

        return response;
    }

    /**
     * 陣列洗牌算法 (Fisher-Yates shuffle)
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
