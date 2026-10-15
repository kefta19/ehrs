"use client";

import { CheckCircle, ArrowRight, X } from "lucide-react";

interface WorkflowSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  nextStep?: string;
  onNextStep?: () => void;
  icon?: "success" | "info" | "warning";
}

export function WorkflowSuccessDialog({
  isOpen,
  onClose,
  title,
  message,
  nextStep,
  onNextStep,
  icon = "success",
}: WorkflowSuccessDialogProps) {
  if (!isOpen) return null;

  const iconConfig = {
    success: {
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    info: {
      icon: CheckCircle,
      color: "blue",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    warning: {
      icon: CheckCircle,
      color: "amber",
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  };

  const config = iconConfig[icon];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className={`bg-gradient-to-r from-${config.color}-500 to-${config.color}-600 p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.bgColor} ${config.iconColor}`}>
                <Icon size={28} />
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-700 text-sm leading-relaxed mb-6">{message}</p>

          {nextStep && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6">
              <p className="text-xs font-semibold text-slate-600 mb-1">Next Step:</p>
              <p className="text-sm font-medium text-slate-900">{nextStep}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onNextStep ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onNextStep();
                    onClose();
                  }}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
