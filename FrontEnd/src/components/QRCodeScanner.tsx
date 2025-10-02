import React, { useRef, useEffect, useState } from 'react';
import QrScanner from 'qr-scanner';
import '../style/QRCodeScanner.css';

interface QRCodeScannerProps {
    onScanSuccess: (result: string) => void;
    onScanError?: (error: string) => void;
    onClose: () => void;
    isVisible: boolean;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
    onScanSuccess,
    onScanError,
    onClose,
    isVisible
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<QrScanner | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (isVisible && videoRef.current) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isVisible]);

    const startScanner = async () => {
        try {
            if (!videoRef.current) return;

            // 檢查是否為安全上下文（HTTPS或localhost）
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                setError('相機功能需要HTTPS連接。請使用HTTPS或localhost訪問。');
                setHasPermission(false);
                return;
            }

            // 檢查相機權限
            const hasCamera = await QrScanner.hasCamera();
            if (!hasCamera) {
                setError('未找到相機設備');
                setHasPermission(false);
                return;
            }

            // 創建QR掃描器
            scannerRef.current = new QrScanner(
                videoRef.current,
                (result) => {
                    onScanSuccess(result.data);
                    stopScanner();
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    preferredCamera: 'environment', // 使用後置相機
                    maxScansPerSecond: 5,
                    returnDetailedScanResult: true
                }
            );

            // 啟動掃描
            await scannerRef.current.start();
            setHasPermission(true);
            setError('');
        } catch (err: any) {
            console.error('QR掃描器啟動失敗:', err);
            
            // 更具體的錯誤處理
            if (err.name === 'NotAllowedError') {
                setError('相機權限被拒絕，請允許相機權限後重試');
            } else if (err.name === 'NotFoundError') {
                setError('未找到相機設備');
            } else if (err.name === 'NotSupportedError') {
                setError('瀏覽器不支持相機功能');
            } else if (err.name === 'NotReadableError') {
                setError('相機被其他應用程序占用');
            } else {
                setError(`無法啟動相機: ${err.message || '未知錯誤'}`);
            }
            
            setHasPermission(false);
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.destroy();
            scannerRef.current = null;
        }
    };

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    const requestPermission = async () => {
        try {
            // 檢查是否為安全上下文
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                setError('相機功能需要HTTPS連接。請使用HTTPS或localhost訪問。');
                setHasPermission(false);
                return;
            }

            // 請求相機權限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment' // 優先使用後置相機
                } 
            });
            stream.getTracks().forEach(track => track.stop());
            setHasPermission(true);
            setError('');
            if (isVisible) {
                startScanner();
            }
        } catch (err: any) {
            console.error('相機權限請求失敗:', err);
            
            if (err.name === 'NotAllowedError') {
                setError('相機權限被拒絕。請在瀏覽器設置中允許相機權限。');
            } else if (err.name === 'NotFoundError') {
                setError('未找到相機設備');
            } else if (err.name === 'NotSupportedError') {
                setError('瀏覽器不支持相機功能');
            } else if (err.name === 'NotReadableError') {
                setError('相機被其他應用程序占用');
            } else {
                setError(`無法獲取相機權限: ${err.message || '未知錯誤'}`);
            }
            
            setHasPermission(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="qr-scanner-overlay">
            <div className="qr-scanner-container">
                <div className="qr-scanner-header">
                    <h3>掃描QR碼點名</h3>
                    <button className="close-btn" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <div className="qr-scanner-content">
                    {hasPermission === false ? (
                        <div className="permission-error">
                            <div className="error-icon">📷</div>
                            <h4>相機權限問題</h4>
                            {error && <p className="error-message">{error}</p>}
                            
                            {error.includes('HTTPS') ? (
                                <div className="solution-box">
                                    <h5>解決方案：</h5>
                                    <ol>
                                        <li>使用HTTPS連接（推薦）</li>
                                        <li>或使用localhost訪問</li>
                                        <li>或在瀏覽器設置中允許不安全內容</li>
                                    </ol>
                                </div>
                            ) : (
                                <div className="solution-box">
                                    <h5>解決方案：</h5>
                                    <ol>
                                        <li>點擊下方按鈕允許相機權限</li>
                                        <li>檢查瀏覽器地址欄的相機圖標</li>
                                        <li>確保沒有其他應用占用相機</li>
                                        <li>嘗試刷新頁面</li>
                                    </ol>
                                </div>
                            )}
                            
                            <button className="permission-btn" onClick={requestPermission}>
                                允許相機權限
                            </button>
                        </div>
                    ) : (
                        <div className="scanner-area">
                            <video
                                ref={videoRef}
                                className="qr-video"
                                playsInline
                                muted
                            />
                            <div className="scanner-overlay">
                                <div className="scan-frame">
                                    <div className="scan-corner top-left"></div>
                                    <div className="scan-corner top-right"></div>
                                    <div className="scan-corner bottom-left"></div>
                                    <div className="scan-corner bottom-right"></div>
                                </div>
                                <div className="scan-line"></div>
                            </div>
                            <div className="scan-instructions">
                                <p>將QR碼對準掃描框內</p>
                                <p>保持穩定以確保掃描成功</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="qr-scanner-footer">
                    <button className="cancel-btn" onClick={handleClose}>
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRCodeScanner;
