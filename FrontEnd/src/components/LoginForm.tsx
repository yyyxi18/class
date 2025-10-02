import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest, RegisterRequest } from '../types/User';
import { asyncGet } from '../utils/fetch';
import { api } from '../enum/api';

const LoginForm: React.FC = () => {
    const { login, register } = useAuth();
    const [formData, setFormData] = useState<LoginRequest>({
        userName: '',
        password: ''
    });
    const [registerData, setRegisterData] = useState<RegisterRequest>({
        userName: '',
        password: '',
        role: 'admin',
        studentInfo: undefined
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'student' | 'admin'>('admin');
    const [nameCheckLoading, setNameCheckLoading] = useState(false);
    const [nameCheckMessage, setNameCheckMessage] = useState('');
    const [isNameValid, setIsNameValid] = useState(true);

    // 檢查姓名是否在students表中存在
    const checkStudentName = async (userName: string) => {
        if (!userName.trim() || selectedRole !== 'admin') {
            setIsNameValid(true);
            setNameCheckMessage('');
            return;
        }

        setNameCheckLoading(true);
        try {
            const response = await asyncGet(`${api.checkStudentName}?userName=${encodeURIComponent(userName)}`);
            if (response.code === 200) {
                const exists = response.body;
                setIsNameValid(!exists);
                setNameCheckMessage(exists ? '你就是學生，給我用學生身分註冊，還想偷用老師權限啊?' : '姓名可用');
            } else {
                setIsNameValid(false);
                setNameCheckMessage('檢查失敗，請稍後再試');
            }
        } catch (error) {
            setIsNameValid(false);
            setNameCheckMessage('檢查失敗，請稍後再試');
        } finally {
            setNameCheckLoading(false);
        }
    };

    // 當姓名或身分改變時檢查姓名
    useEffect(() => {
        if (isRegisterMode && selectedRole === 'admin' && registerData.userName) {
            const timeoutId = setTimeout(() => {
                checkStudentName(registerData.userName);
            }, 500); // 防抖動，500ms後檢查

            return () => clearTimeout(timeoutId);
        } else {
            setIsNameValid(true);
            setNameCheckMessage('');
        }
    }, [registerData.userName, selectedRole, isRegisterMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (isRegisterMode) {
                // 如果是教師註冊且姓名無效，阻止提交
                if (selectedRole === 'admin' && !isNameValid) {
                    setMessage('該姓名已存在於學生資料中，無法以教師身分註冊');
                    setLoading(false);
                    return;
                }

                const success = await register({
                    ...registerData,
                    role: selectedRole
                });
                if (!success) {
                    setMessage('註冊失敗');
                } else {
                    setMessage('註冊成功！請使用您的帳號密碼登入');
                    setIsRegisterMode(false);
                    // 重置註冊表單
                    setRegisterData({
                        userName: '',
                        password: '',
                        role: 'admin',
                        studentInfo: undefined
                    });
                    setSelectedRole('admin');
                    setIsNameValid(true);
                    setNameCheckMessage('');
                }
            } else {
                const success = await login({
                    userName: formData.userName,
                    password: formData.password
                });

                if (!success) {
                    setMessage('登入失敗');
                }
            }
        } catch (error) {
            setMessage('發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (isRegisterMode) {
            if (name === 'role') {
                setSelectedRole(value as 'student' | 'admin');
                setRegisterData(prev => ({
                    ...prev,
                    role: value as 'student' | 'admin',
                    studentInfo: value === 'student' ? {
                        sid: '',
                        name: '',
                        department: '',
                        class: '',
                        email: ''
                    } : undefined
                }));
            } else {
                setRegisterData(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setMessage('');
        setFormData({ userName: '', password: '' });
        setRegisterData({
            userName: '',
            password: '',
            role: 'admin',
            studentInfo: undefined
        });
        setSelectedRole('admin');
        setIsNameValid(true);
        setNameCheckMessage('');
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="auth-header">
                    <h2>{isRegisterMode ? '註冊' : '登入'}</h2>
                    <button 
                        type="button" 
                        className="toggle-mode-btn"
                        onClick={toggleMode}
                    >
                        {isRegisterMode ? '已有帳號？登入' : '註冊帳號'}
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {isRegisterMode && (
                        <div className="form-group">
                            <label>身分:</label>
                            <select
                                name="role"
                                value={selectedRole}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="student">學生</option>
                                <option value="admin">教師</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label>姓名:</label>
                        <div className="name-input-container">
                            <input
                                type="text"
                                name="userName"
                                value={isRegisterMode ? registerData.userName : formData.userName}
                                onChange={handleInputChange}
                                required
                                className={isRegisterMode && selectedRole === 'admin' && registerData.userName ? 
                                    (isNameValid ? 'name-valid' : 'name-invalid') : ''}
                            />
                            {nameCheckLoading && (
                                <div className="name-check-loading">檢查中...</div>
                            )}
                        </div>
                        {isRegisterMode && selectedRole === 'admin' && nameCheckMessage && (
                            <div className={`name-check-message ${isNameValid ? 'valid' : 'invalid'}`}>
                                {nameCheckMessage}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>密碼:</label>
                        <input
                            type="password"
                            name="password"
                            value={isRegisterMode ? registerData.password : formData.password}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    {isRegisterMode && selectedRole === 'student' && (
                        <div className="student-info">
                            <h3>學生資訊</h3>
                            <div className="form-group">
                                <label>學號:</label>
                                <input
                                    type="text"
                                    name="sid"
                                    value={registerData.studentInfo?.sid || ''}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setRegisterData(prev => ({
                                            ...prev,
                                            studentInfo: {
                                                ...prev.studentInfo!,
                                                sid: value,
                                                email: value ? `${value}@o365.tku.edu.tw` : ''
                                            }
                                        }));
                                    }}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>姓名:</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={registerData.studentInfo?.name || ''}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setRegisterData(prev => ({
                                            ...prev,
                                            studentInfo: {
                                                ...prev.studentInfo!,
                                                name: value
                                            }
                                        }));
                                    }}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>科系:</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={registerData.studentInfo?.department || ''}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setRegisterData(prev => ({
                                            ...prev,
                                            studentInfo: {
                                                ...prev.studentInfo!,
                                                department: value
                                            }
                                        }));
                                    }}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Email:</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={registerData.studentInfo?.email || ''}
                                    disabled
                                    className="disabled-input"
                                />
                                <small>系統自動生成：{registerData.studentInfo?.sid}@o365.tku.edu.tw</small>
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || (isRegisterMode && selectedRole === 'admin' && !isNameValid)}
                        className={loading || (isRegisterMode && selectedRole === 'admin' && !isNameValid) ? 'disabled' : ''}
                        style={{
                            marginTop: '2rem',
                            marginBottom: '1rem',
                            display: 'block',
                            visibility: 'visible'
                        }}
                    >
                        {loading ? (isRegisterMode ? '註冊中...' : '登入中...') : (isRegisterMode ? '註冊' : '登入')}
                    </button>
                    
                    {/* 按鈕禁用提示 */}
                    {isRegisterMode && selectedRole === 'admin' && !isNameValid && (
                        <div className="button-disabled-hint">
                            <small style={{ color: '#e74c3c', display: 'block', marginTop: '8px', textAlign: 'center' }}>
                                請先確認姓名可用性後再註冊
                            </small>
                        </div>
                    )}
                    
                    {/* 學生註冊提示 */}
                    {isRegisterMode && selectedRole === 'student' && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <small style={{ color: '#28a745', display: 'block' }}>
                                請填寫完整的學生資訊後點擊註冊按鈕
                            </small>
                        </div>
                    )}
                </form>

                {message && <div className="error-message">{message}</div>}
            </div>
        </div>
    );
};

export default LoginForm;
