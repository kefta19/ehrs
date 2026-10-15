"use client";

import { useState, useEffect } from "react";
import { Check, X, AlertCircle } from "lucide-react";

interface AnimatedInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: string) => { valid: boolean; message?: string };
  disabled?: boolean;
  name?: string;
}

export function AnimatedInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  minLength,
  maxLength,
  pattern,
  validate,
  disabled = false,
  name,
}: AnimatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!touched || value === "") {
      setIsValid(null);
      setValidationMessage("");
      setShowSuccess(false);
      return;
    }

    let valid = true;
    let message = "";

    // Required check
    if (required && value.trim() === "") {
      valid = false;
      message = "This field is required";
    }

    // Min length check
    if (valid && minLength && value.length < minLength) {
      valid = false;
      message = `Minimum ${minLength} characters required`;
    }

    // Max length check
    if (valid && maxLength && value.length > maxLength) {
      valid = false;
      message = `Maximum ${maxLength} characters allowed`;
    }

    // Pattern check
    if (valid && pattern && !pattern.test(value)) {
      valid = false;
      message = "Invalid format";
    }

    // Custom validation
    if (valid && validate) {
      const result = validate(value);
      valid = result.valid;
      message = result.message || "";
    }

    setIsValid(valid);
    setValidationMessage(message);

    if (valid && value.length > 0) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    }
  }, [value, touched, required, minLength, maxLength, pattern, validate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
            disabled
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          } ${
            touched && isValid === false
              ? "border-rose-300 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950"
              : touched && isValid === true
                ? "border-emerald-300 dark:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          }`}
        />

        {/* Status Icon */}
        {touched && value.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300">
            {isValid === true ? (
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ${showSuccess ? "scale-125" : "scale-100"} transition-transform duration-300`}>
                <Check size={12} />
              </div>
            ) : isValid === false ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white animate-pulse">
                <X size={12} />
              </div>
            ) : null}
          </div>
        )}

        {/* Success Animation */}
        {showSuccess && isValid === true && (
          <div className="absolute inset-0 rounded-xl border-2 border-emerald-400 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Validation Message */}
      {touched && validationMessage && (
        <div
          className={`mt-1.5 flex items-center gap-1.5 text-[11px] transition-all duration-300 ${
            isValid === false ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {isValid === false ? <AlertCircle size={12} /> : <Check size={12} />}
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Character Counter */}
      {maxLength && (
        <div className="mt-1 text-[10px] text-slate-400 text-right">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}
