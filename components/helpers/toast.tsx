'use client';

import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Info, AlertCircle } from 'lucide-react';
import * as React from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const showToast = (message: string, type: ToastType = 'info') => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  };
  
  const colors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };
  
  toast.custom(
    (t) => (
      <div
        className={`${colors?.[type]} border rounded-lg p-4 shadow-lg flex items-center gap-3 max-w-md`}
        style={{
          animation: t?.visible ? 'fadeIn 0.3s' : 'fadeOut 0.3s',
        }}
      >
        {icons?.[type]}
        <p className="text-sm font-medium text-gray-900">{message}</p>
      </div>
    ),
    {
      duration: 4000,
      position: 'top-right',
    }
  );
};
