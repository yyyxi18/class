const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

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

// 更新時自動更新 updatedAt 和 email
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // 如果是學生並且有studentInfo，自動生成email
    if (this.role === 'student' && this.studentInfo && this.studentInfo.sid) {
        this.studentInfo.email = `${this.studentInfo.sid}@o365.tku.edu.tw`;
    }
    
    next();
});

const Student = mongoose.model('students', studentSchema);
const User = mongoose.model('users', userSchema);

async function registerStudents() {
    try {
        // 連接MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/class');
        console.log('已連接到MongoDB');

        // 獲取所有學生
        const students = await Student.find({});
        console.log(`找到 ${students.length} 名學生`);

        if (students.length === 0) {
            console.log('沒有找到學生資料');
            return;
        }

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        console.log('\n開始批量註冊學生帳號...\n');

        for (const student of students) {
            try {
                // 檢查是否已經存在用戶
                const existingUser = await User.findOne({ 
                    $or: [
                        { userName: student.name },
                        { 'studentInfo.sid': student.studentId }
                    ]
                });

                if (existingUser) {
                    console.log(`⏭️  跳過 ${student.name} (${student.studentId}) - 用戶已存在`);
                    skipCount++;
                    continue;
                }

                // 生成密碼：Tku + studentId
                const password = `Tku${student.studentId}`;
                
                // 加密密碼
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // 創建用戶
                const newUser = new User({
                    userName: student.name,
                    password: hashedPassword,
                    role: 'student',
                    studentInfo: {
                        sid: student.studentId,
                        name: student.name,
                        department: student.department || '',
                        class: student.class || '',
                        email: `${student.studentId}@o365.tku.edu.tw`
                    }
                });

                await newUser.save();
                console.log(`✅ 成功註冊: ${student.name} (${student.studentId}) - 密碼: ${password}`);
                successCount++;

            } catch (error) {
                console.error(`❌ 註冊失敗 ${student.name} (${student.studentId}):`, error.message);
                errorCount++;
            }
        }

        console.log('\n=== 註冊結果統計 ===');
        console.log(`✅ 成功註冊: ${successCount} 名學生`);
        console.log(`⏭️  跳過: ${skipCount} 名學生 (已存在)`);
        console.log(`❌ 失敗: ${errorCount} 名學生`);
        console.log(`📊 總計: ${students.length} 名學生`);

        // 顯示註冊成功的學生列表
        if (successCount > 0) {
            console.log('\n=== 新註冊的學生帳號 ===');
            const newUsers = await User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(successCount);
            newUsers.forEach(user => {
                console.log(`用戶名: ${user.userName}, 學號: ${user.studentInfo?.sid}, 密碼: Tku${user.studentInfo?.sid}`);
            });
        }

    } catch (error) {
        console.error('批量註冊過程中發生錯誤:', error);
    } finally {
        // 關閉數據庫連接
        await mongoose.connection.close();
        console.log('\n數據庫連接已關閉');
    }
}

// 執行批量註冊
if (require.main === module) {
    registerStudents();
}

module.exports = { registerStudents };
