const mongoose = require('mongoose');
require('dotenv').config();

// 定義模型
const courseSchema = new mongoose.Schema({
    courseName: { type: String, required: true },
    courseCode: { type: String, required: true, unique: true },
    teacher: { type: String, required: true },
    semester: { type: String, required: true },
    schedule: {
        dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const courseStudentSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    studentId: { type: String, required: true },
    enrolledAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Course = mongoose.model('courses', courseSchema);
const CourseStudent = mongoose.model('courseStudents', courseStudentSchema);

async function testStudentCourses() {
    try {
        // 連接MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/class');
        console.log('已連接到MongoDB');

        // 測試學生ID（施本崧的用戶ID）
        const studentId = '68db85968198c6607bc2cdbf';
        
        console.log(`\n測試學生ID: ${studentId}`);

        // 1. 查找學生的選課記錄
        const enrollments = await CourseStudent.find({ studentId });
        console.log(`\n找到 ${enrollments.length} 個選課記錄:`);
        enrollments.forEach((enrollment, index) => {
            console.log(`${index + 1}. CourseId: ${enrollment.courseId}, EnrolledAt: ${enrollment.enrolledAt}`);
        });

        if (enrollments.length === 0) {
            console.log('沒有找到選課記錄');
            return;
        }

        // 2. 獲取課程詳情
        const courseIds = enrollments.map(enrollment => enrollment.courseId);
        console.log(`\n課程IDs: ${courseIds.join(', ')}`);

        const courses = await Course.find({ 
            _id: { $in: courseIds },
            isActive: true 
        }).sort({ courseName: 1 });

        console.log(`\n找到 ${courses.length} 個活躍課程:`);
        courses.forEach((course, index) => {
            console.log(`${index + 1}. ${course.courseName} (${course.courseCode}) - ${course.teacher}`);
        });

        // 3. 模擬API響應
        const response = {
            code: 200,
            message: "獲取學生課程列表成功",
            body: courses
        };

        console.log('\n=== API響應 ===');
        console.log(JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('測試過程中發生錯誤:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n數據庫連接已關閉');
    }
}

// 執行測試
if (require.main === module) {
    testStudentCourses();
}

module.exports = { testStudentCourses };
