"use client";

import { useState } from "react";
import { CreditCard, Smartphone, Building2, Check, ArrowRight, AlertCircle } from "lucide-react";

type PaymentMethod = "chapa" | "telebirr" | "bank_transfer";

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMethodSelect: (method: PaymentMethod) => void;
  amount: number;
  currency: string;
}

export function PaymentMethodDialog({
  isOpen,
  onClose,
  onMethodSelect,
  amount,
  currency,
}: PaymentMethodDialogProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);

  if (!isOpen) return null;

  const methods = [
    {
      id: "chapa" as PaymentMethod,
      name: "Chapa",
      icon: CreditCard,
      description: "Pay securely with card or mobile banking",
      color: "blue",
      features: ["Instant payment", "Secure transaction", "Automatic confirmation"],
    },
    {
      id: "telebirr" as PaymentMethod,
      name: "Telebirr",
      icon: Smartphone,
      description: "Pay with Ethio Telecom mobile money",
      color: "green",
      features: ["Mobile payment", "Quick processing", "Widely accepted"],
    },
    {
      id: "bank_transfer" as PaymentMethod,
      name: "Bank Transfer",
      icon: Building2,
      description: "Direct bank transfer with manual verification",
      color: "purple",
      features: ["Bank transfer", "Manual verification", "1-2 business days"],
    },
  ];

  const handleContinue = () => {
    if (selected) {
      onMethodSelect(selected);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Select Payment Method</h3>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
            >
              ✕
            </button>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm text-blue-100 mb-1">Entry Fee Amount</p>
            <p className="text-3xl font-bold">
              {amount.toLocaleString()} {currency}
            </p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Choose how you'd like to pay:
          </p>

          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = selected === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setSelected(method.id)}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? `border-${method.color}-500 bg-${method.color}-50`
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      isSelected
                        ? `bg-${method.color}-500 text-white`
                        : `bg-${method.color}-100 text-${method.color}-600`
                    }`}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900">{method.name}</h4>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      {method.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {method.features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Info Box */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">Payment Information</p>
              <p>
                Your auction will be scheduled for public view only after payment
                confirmation. Bank transfers require manual verification (1-2 business
                days).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={!selected}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              Continue with {selected ? methods.find((m) => m.id === selected)?.name : "Payment"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
