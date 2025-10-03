const mongoose = require('mongoose');
require('dotenv').config();

// 定義課程模型
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

// 定義學生模型
const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    sid: { type: String, required: false },
    name: { type: String, required: true },
    department: { type: String, required: false },
    class: { type: String, required: false },
    email: { type: String, required: false }
});

// 定義用戶模型
const studentInfoSchema = new mongoose.Schema({
    sid: { type: String, required: false },
    name: { type: String, required: false },
    department: { type: String, required: false },
    class: { type: String, required: false },
    email: { type: String, required: false }
});

const userSchema = new mongoose.Schema({
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['student', 'admin'], 
        required: true,
        default: 'student'
    },
    studentInfo: { type: studentInfoSchema, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 定義課程學生關係模型
const courseStudentSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    studentId: { type: String, required: true },
    enrolledAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Course = mongoose.model('courses', courseSchema);
const Student = mongoose.model('students', studentSchema);
const User = mongoose.model('users', userSchema);
const CourseStudent = mongoose.model('courseStudents', courseStudentSchema);

async function setupAICourse() {
    try {
        // 連接MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/class');
        console.log('已連接到MongoDB');

        // 1. 創建「數位科技與AI應用」課程
        const aiCourseData = {
            courseName: '數位科技與AI應用',
            courseCode: 'AI101',
            teacher: '陳老師',
            semester: '2024-1',
            schedule: {
                dayOfWeek: 2, // 星期二
                startTime: '10:00',
                endTime: '12:00'
            },
            isActive: true
        };

        // 檢查課程是否已存在
        let aiCourse = await Course.findOne({ courseCode: 'AI101' });
        if (!aiCourse) {
            aiCourse = new Course(aiCourseData);
            await aiCourse.save();
            console.log(`✅ 創建課程: ${aiCourseData.courseName} (${aiCourseData.courseCode})`);
        } else {
            console.log(`⏭️  課程已存在: ${aiCourse.courseName} (${aiCourse.courseCode})`);
        }

        // 2. 獲取所有學生用戶
        const students = await User.find({ role: 'student' });
        console.log(`找到 ${students.length} 名學生用戶`);

        if (students.length === 0) {
            console.log('沒有找到學生用戶');
            return;
        }

        // 3. 將所有學生註冊到AI課程
        let enrolledCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        console.log('\n開始註冊學生到AI課程...\n');

        for (const student of students) {
            try {
                // 檢查是否已經註冊
                const existingEnrollment = await CourseStudent.findOne({
                    courseId: aiCourse._id.toString(),
                    studentId: student._id.toString()
                });

                if (existingEnrollment) {
                    console.log(`⏭️  跳過 ${student.userName} (${student.studentInfo?.sid}) - 已註冊`);
                    skippedCount++;
                    continue;
                }

                // 創建選課關係
                const enrollment = new CourseStudent({
                    courseId: aiCourse._id.toString(),
                    studentId: student._id.toString(),
                    enrolledAt: new Date()
                });

                await enrollment.save();
                console.log(`✅ 註冊成功: ${student.userName} (${student.studentInfo?.sid})`);
                enrolledCount++;

            } catch (error) {
                console.error(`❌ 註冊失敗 ${student.userName}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n=== 註冊結果統計 ===');
        console.log(`✅ 成功註冊: ${enrolledCount} 名學生`);
        console.log(`⏭️  跳過: ${skippedCount} 名學生 (已註冊)`);
        console.log(`❌ 失敗: ${errorCount} 名學生`);
        console.log(`📊 總計: ${students.length} 名學生`);

        // 4. 顯示課程信息
        console.log('\n=== 課程信息 ===');
        console.log(`課程名稱: ${aiCourse.courseName}`);
        console.log(`課程代碼: ${aiCourse.courseCode}`);
        console.log(`授課教師: ${aiCourse.teacher}`);
        console.log(`上課時間: 星期${aiCourse.schedule.dayOfWeek === 0 ? '日' : aiCourse.schedule.dayOfWeek} ${aiCourse.schedule.startTime}-${aiCourse.schedule.endTime}`);
        console.log(`課程ID: ${aiCourse._id}`);

        // 5. 驗證註冊結果
        const totalEnrollments = await CourseStudent.countDocuments({
            courseId: aiCourse._id.toString()
        });
        console.log(`\n課程總註冊人數: ${totalEnrollments}`);

    } catch (error) {
        console.error('設置AI課程過程中發生錯誤:', error);
    } finally {
        // 關閉數據庫連接
        await mongoose.connection.close();
        console.log('\n數據庫連接已關閉');
    }
}

// 執行設置
if (require.main === module) {
    setupAICourse();
}

module.exports = { setupAICourse };
