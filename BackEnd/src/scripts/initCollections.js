const mongoose = require('mongoose');

// 用戶 Schema
const userSchema = new mongoose.Schema({
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['student', 'admin'], 
        required: true,
        default: 'student'
    },
    studentInfo: {
        sid: { type: String, required: false },
        name: { type: String, required: false },
        department: { type: String, required: false },
        grade: { type: String, required: false },
        class: { type: String, required: false },
        email: { type: String, required: false },
        absences: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 學生 Schema
const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, required: false },
    class: { type: String, required: false },
    email: { type: String, required: false } // 系統自動生成：{studentId}@o365.tku.edu.tw
});

// 課程 Schema
const courseSchema = new mongoose.Schema({
    courseName: { type: String, required: true },
    courseCode: { type: String, required: true, unique: true },
    teacher: { type: String, required: false, default: '未指定' },
    semester: { type: String, required: false, default: '當前學期' },
    schedule: {
        dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 課程學生關聯 Schema
const courseStudentSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    studentId: { type: String, required: true },
    enrolledAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 考勤 Schema
const attendanceSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    studentId: { type: String, required: true },
    attendanceDate: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['present', 'absent', 'late'], 
        required: true 
    },
    checkInTime: { type: Date },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// 考勤場次 Schema
const attendanceSessionSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    sessionCode: { type: String, required: true, unique: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    attendedStudents: [{
        studentId: { type: String, required: true },
        userName: { type: String, required: true },
        checkInTime: { type: Date, default: Date.now },
        notes: { type: String, required: false }
    }],
    absentStudents: [{
        studentId: { type: String, required: true },
        userName: { type: String, required: true },
        notes: { type: String, required: false }
    }],
    excusedStudents: [{
        studentId: { type: String, required: true },
        userName: { type: String, required: true },
        notes: { type: String, required: false }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 建立複合索引
courseStudentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

// 為所有 schema 添加 pre-save 鉤子
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // 如果是學生並且有studentInfo，自動生成email
    if (this.role === 'student' && this.studentInfo && this.studentInfo.sid) {
        this.studentInfo.email = `${this.studentInfo.sid}@o365.tku.edu.tw`;
    }
    
    next();
});

studentSchema.pre('save', function(next) {
    // 如果是新建或者是 studentId 有變更，則更新 email
    if (this.isNew || this.isModified('studentId')) {
        this.email = `${this.studentId}@o365.tku.edu.tw`;
    }
    next();
});

courseSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

courseStudentSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

attendanceSessionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

async function initCollections() {
    try {
        // 連接資料庫
        try {
            await mongoose.connect('mongodb://chunlin:azsxdcfv123@127.0.0.1:27017/class');
            console.log('✓ 連接到 MongoDB class 資料庫成功');
        } catch (err) {
            console.log('嘗試無認證連接...');
            await mongoose.connect('mongodb://127.0.0.1:27017/class');
            console.log('✓ 連接到 MongoDB class 資料庫成功 (無認證)');
        }

        // 建立模型，這會自動建立對應的集合
        const User = mongoose.model('users', userSchema);
        const Student = mongoose.model('students', studentSchema);
        const Course = mongoose.model('courses', courseSchema);
        const CourseStudent = mongoose.model('courseStudents', courseStudentSchema);
        const Attendance = mongoose.model('attendances', attendanceSchema);
        const AttendanceSession = mongoose.model('attendanceSessions', attendanceSessionSchema);

        console.log('✓ Collections schemas have been registered:');
        console.log('  - users');
        console.log('  - students'); 
        console.log('  - courses');
        console.log('  - courseStudents');
        console.log('  - attendances');
        console.log('  - attendanceSessions');

        // 檢查資料庫中現有的集合
        const db = mongoose.connection.db;
        const existingCollections = await db.listCollections().toArray();
        console.log('\n現有集合:');
        existingCollections.forEach(col => console.log(`  - ${col.name}`));

        // 檢查是否需要建立集合並壓印（建立索引）
        console.log('\n建立集合和索引...');
        
        // 為每個集合明確建立查詢來觸發集合建立
        await User.findOne(); // 觸發 users 集合
        await Student.findOne(); // 觸發 students 集合
        await Course.findOne(); // 觸發 courses 集合
        await CourseStudent.findOne(); // 觸發 courseStudents 集合
        await Attendance.findOne(); // 觸發 attendances 集合  
        await AttendanceSession.findOne(); // 觸發 attendanceSessions 集合

        // 為 courseStudents 建立複合唯一索引
        const courseStudentModel = mongoose.model('courseStudents', courseStudentSchema);
        try {
            await courseStudentModel.createIndexes();
            console.log('  ✓ courseStudents 複合索引已建立');
        } catch (err) {
            // 索引可能已存在，忽略錯誤
        }

        // 最終檢查所有集合
        const finalCollections = await db.listCollections().toArray();
        console.log('\n最終集合狀態:');
        finalCollections.forEach(col => console.log(`  ✓ ${col.name}`));

        console.log('\n✓ 所有必要的集合已準備好，包括所有索引');

    } catch (error) {
        console.error('✗ 錯誤:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✓ 與 MongoDB 連線已關閉');
    }
}

// 執行初始化
initCollections();
