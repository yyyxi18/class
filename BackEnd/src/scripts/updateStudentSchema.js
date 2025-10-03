const mongoose = require('mongoose');

async function updateStudentSchema() {
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

        const db = mongoose.connection.db;
        
        // 更新 students 集合中的文檔
        const studentsCollection = db.collection('students');
        
        console.log('開始更新 students 集合...');
        
        // 先更新所有現有文檔添加 email 欄位
        await studentsCollection.updateMany(
            {},
            [
                {
                    $set: {
                        email: { $concat: ["$studentId", "@o365.tku.edu.tw"] }
                    }
                }
            ]
        );
        
        // 再移除不需要的欄位
        await studentsCollection.updateMany(
            {},
            {
                $unset: {
                    grade: "",
                    absences: "",
                    createdAt: "",
                    updatedAt: ""
                }
            }
        );
        
        console.log('✓ students 集合更新完成');
        
        // 更新 users 集合中的文檔，處理 studentInfo 內的欄位
        const usersCollection = db.collection('users');
        
        console.log('開始更新 users 集合...');
        
        // 先添加 email，再移除欄位
        await usersCollection.updateMany(
            { role: 'student', studentInfo: { $exists: true }, 'studentInfo.sid': { $exists: true, $ne: null } },
            {
                $set: {
                    'studentInfo.email': { $concat: ["$studentInfo.sid", "@o365.tku.edu.tw"] }
                }
            }
        );
        
        await usersCollection.updateMany(
            { role: 'student', studentInfo: { $exists: true } },
            {
                $unset: {
                    'studentInfo.grade': "",
                    'studentInfo.absences': ""
                }
            }
        );
        
        console.log('✓ users 集合更新完成');
        
        console.log('\n遷移完成！');
        console.log('- 移除了 grade, absences, createdAt, updatedAt 欄位');
        console.log('- 將所有學生的 email 設為 {studentId}@o365.tku.edu.tw');
        console.log('- 已將 users.studentInfo 中的相關欄位同步更新');

    } catch (error) {
        console.error('❌ 遷移錯誤:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✓ 與 MongoDB 連線已關閉');
    }
}

// 執行遷移
updateStudentSchema();
