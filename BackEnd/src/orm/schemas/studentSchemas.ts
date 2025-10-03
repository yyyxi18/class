import { model, Schema } from "mongoose";

const studentSchema = new Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, required: false },
    class: { type: String, required: false },
    email: { type: String, required: false } // 系統自動生成，從studentId衍生
});

// 在保存前設置 email 為 studentId + @o365.tku.edu.tw
studentSchema.pre('save', function(next) {
    // 如果是新建或者是 studentId 有變更，則更新 email
    if (this.isNew || this.isModified('studentId')) {
        this.email = `${this.studentId}@o365.tku.edu.tw`;
    }
    next();
});

export const studentModel = model('students', studentSchema);