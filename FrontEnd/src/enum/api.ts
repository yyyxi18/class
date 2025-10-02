// 基礎API URL - 根據環境自動選擇
const BASE_URL = (() => {
    const hostname = window.location.hostname;
    console.log('Current hostname:', hostname); // 調試用
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
        return 'http://localhost:2083';
    } else {
        return `http://${hostname}:2083`;
    }
})();

export const api = {
    // 認證相關
    login: `${BASE_URL}/api/v1/auth/login`,
    register: `${BASE_URL}/api/v1/auth/register`,
    me: `${BASE_URL}/api/v1/auth/me`,
    checkStudentName: `${BASE_URL}/api/v1/auth/check-student-name`,

    // 課程相關
    courses: `${BASE_URL}/api/v1/courses`,
    COURSES: `${BASE_URL}/api/v1/courses`,
    studentCourses: `${BASE_URL}/api/v1/courses/student`,

    // 點名相關
    ATTENDANCE: `${BASE_URL}/api/v1/attendance`,
    checkIn: `${BASE_URL}/api/v1/attendance/check-in`,
    studentRecords: `${BASE_URL}/api/v1/attendance/student-records`,
    startSession: `${BASE_URL}/api/v1/attendance/start-session`,
    endSession: `${BASE_URL}/api/v1/attendance/end-session`,
    courseStats: `${BASE_URL}/api/v1/attendance/course-stats`,
    activeSessions: `${BASE_URL}/api/v1/attendance/active-sessions`,
    allSessions: `${BASE_URL}/api/v1/attendance/all-sessions`,
    courseStudents: `${BASE_URL}/api/v1/attendance/course-students`,
    manualAttendance: `${BASE_URL}/api/v1/attendance/manual-attendance`,
    markAllPresent: `${BASE_URL}/api/v1/attendance/mark-all-present`,
    updateAttendanceStatus: `${BASE_URL}/api/v1/attendance/update-attendance-status`,
    exportExcel: `${BASE_URL}/api/v1/attendance/export-excel`,
    exportSession: `${BASE_URL}/api/v1/attendance/export-session`,
    randomSelection: `${BASE_URL}/api/v1/attendance/random-selection`,

    // 課程學生管理相關
    enrollStudent: `${BASE_URL}/api/v1/course-students/enroll`,
    importStudents: `${BASE_URL}/api/v1/course-students/import`,
    importStudentsCSV: `${BASE_URL}/api/v1/course-students/import-csv`,
    getCourseStudents: `${BASE_URL}/api/v1/course-students/course`,
    getAllStudents: `${BASE_URL}/api/v1/course-students/students`,
    removeStudentFromCourse: `${BASE_URL}/api/v1/course-students/course`,
    createStudent: `${BASE_URL}/api/v1/course-students/create-student`,

    // 舊的 API（保留向後兼容）
    findAll: `${BASE_URL}/api/v1/user/findAll`
} as const;