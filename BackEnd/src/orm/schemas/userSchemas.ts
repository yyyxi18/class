import { model, Schema } from "mongoose";
import { User } from "../../interfaces/User";

const studentInfoSchema = new Schema({
    sid: { type: String, required: false },
    name: { type: String, required: false },
    department: { type: String, required: false },
    class: { type: String, required: false },
    email: { type: String, required: false } // 系統自動生成：{sid}@o365.tku.edu.tw
});

export const userSchema = new Schema<User>({
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

// 更新時自動更新 updatedAt
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // 如果是學生並且有studentInfo，自動生成email
    if (this.role === 'student' && this.studentInfo && this.studentInfo.sid) {
        this.studentInfo.email = `${this.studentInfo.sid}@o365.tku.edu.tw`;
    }
    
    next();
});

export const userModel = model<User>('users', userSchema);
