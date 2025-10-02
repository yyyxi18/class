export interface User {
    _id: string,
    userName: string,
    role: 'student' | 'admin',
    studentInfo?: StudentInfo
}

export interface StudentInfo {
    sid: string,
    name: string,
    department: string,
    class: string,
    email: string // 系統自動生成：{studentId}@o365.tku.edu.tw
}

export interface LoginRequest {
    userName: string,
    password: string
}

export interface RegisterRequest {
    userName: string,
    password: string,
    role: 'student' | 'admin',
    studentInfo?: StudentInfo
}

export interface AuthResponse {
    token: string,
    user: User
}
