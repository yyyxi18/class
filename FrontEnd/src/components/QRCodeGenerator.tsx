import React, { useState } from 'react';
import QRCode from 'qrcode';
import '../style/QRCodeGenerator.css';

interface QRCodeGeneratorProps {
    sessionCode: string;
    courseName: string;
    onClose: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    sessionCode,
    courseName,
    onClose
}) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [isVisible, setIsVisible] = useState<boolean>(true);

    React.useEffect(() => {
        generateQRCode();
    }, [sessionCode]);

    const generateQRCode = async () => {
        try {
            const qrData = {
                type: 'attendance',
                sessionCode: sessionCode,
                courseName: courseName,
                timestamp: new Date().toISOString()
            };
            
            const qrString = JSON.stringify(qrData);
            const url = await QRCode.toDataURL(qrString, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            setQrCodeUrl(url);
        } catch (error) {
            console.error('生成QR碼失敗:', error);
        }
    };

    const downloadQRCode = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.download = `attendance-qr-${sessionCode}.png`;
            link.href = qrCodeUrl;
            link.click();
        }
    };

    const copyToClipboard = async () => {
        try {
            const qrData = {
                type: 'attendance',
                sessionCode: sessionCode,
                courseName: courseName,
                timestamp: new Date().toISOString()
            };
            await navigator.clipboard.writeText(JSON.stringify(qrData));
            alert('QR碼數據已複製到剪貼板');
        } catch (error) {
            console.error('複製失敗:', error);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="qr-generator-overlay">
            <div className="qr-generator-container">
                <div className="qr-generator-header">
                    <h3>QR碼點名</h3>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="qr-generator-content">
                    <div className="qr-info">
                        <h4>{courseName}</h4>
                        <p>會話代碼: {sessionCode}</p>
                        <p>學生掃描此QR碼即可完成點名</p>
                    </div>

                    <div className="qr-code-display">
                        {qrCodeUrl ? (
                            <img src={qrCodeUrl} alt="QR Code" className="qr-image" />
                        ) : (
                            <div className="qr-loading">生成QR碼中...</div>
                        )}
                    </div>

                    <div className="qr-actions">
                        <button 
                            className="download-btn"
                            onClick={downloadQRCode}
                            disabled={!qrCodeUrl}
                        >
                            📥 下載QR碼
                        </button>
                        <button 
                            className="copy-btn"
                            onClick={copyToClipboard}
                        >
                            📋 複製數據
                        </button>
                    </div>

                    <div className="qr-instructions">
                        <h5>使用說明:</h5>
                        <ul>
                            <li>學生使用手機掃描此QR碼</li>
                            <li>系統會自動識別並完成點名</li>
                            <li>QR碼包含會話信息和時間戳</li>
                            <li>建議將QR碼投影到螢幕上供學生掃描</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRCodeGenerator;
