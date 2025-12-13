"use client";

import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: AlertType;
    isConfirm?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export default function AlertModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    isConfirm = false,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
}: AlertModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-12 h-12 text-green-500" />;
            case 'error':
                return <AlertTriangle className="w-12 h-12 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-12 h-12 text-orange-500" />;
            default:
                return <Info className="w-12 h-12 text-blue-500" />;
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700';
            case 'error':
                return 'bg-red-600 hover:bg-red-700';
            case 'warning':
                return 'bg-orange-600 hover:bg-orange-700';
            default:
                return 'bg-[#A9780F] hover:bg-[#8e650c]';
        }
    };

    return (
        <div className="fixed inset-0 z-[60]  flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full transform transition-all scale-100 p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-black mb-2">
                        {title}
                    </h3>

                    <p className="text-gray-600 mb-6 text-sm">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        {isConfirm && (
                            <button
                            style={{ borderRadius: '25px' }}
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                        style={{ borderRadius: '25px' }}
                            onClick={() => {
                                if (isConfirm && onConfirm) {
                                    onConfirm();
                                } else {
                                    onClose();
                                }
                            }}
                            className={`flex-1 px-4 py-2 text-white rounded-md font-medium transition-colors ${getButtonColor()}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
