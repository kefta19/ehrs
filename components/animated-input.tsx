"use client";

import { useState, useEffect, useId } from "react";
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
  showCounter?: boolean;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  autoComplete?: string;
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
  showCounter = true,
  multiline = false,
  rows = 4,
  hint,
  autoComplete,
}: AnimatedInputProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const cleanLabel = required ? label.replace(/\s*\*+$/, "") : label;

  useEffect(() => {
    if (!touched || value === "") {
      setIsValid(null);
      setValidationMessage("");
      setShowSuccess(false);
      return;
    }

    let valid = true;
    let message = "";

    if (required && value.trim() === "") {
      valid = false;
      message = "This field is required";
    }

    if (valid && minLength && value.length < minLength) {
      valid = false;
      message = `Minimum ${minLength} characters required`;
    }

    if (valid && maxLength && value.length > maxLength) {
      valid = false;
      message = `Maximum ${maxLength} characters allowed`;
    }

    if (valid && pattern && !pattern.test(value)) {
      valid = false;
      message = "Invalid format";
    }

    if (valid && validate) {
      const result = validate(value);
      valid = result.valid;
      message = result.message || "";
    }

    setIsValid(valid);
    setValidationMessage(message);

    if (valid && value.length > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [value, touched, required, minLength, maxLength, pattern, validate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const hasError = touched && isValid === false;
  const hasSuccess = touched && isValid === true;
  const describedBy = [
    hint ? hintId : null,
    hasError && validationMessage ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const fieldClasses = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
    touched && value.length > 0 && !multiline ? "pr-10" : ""
  } ${
    disabled
      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
      : "bg-slate-50/50 hover:bg-white focus:bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
  } ${
    hasError
      ? "border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
      : hasSuccess
        ? "border-emerald-400 dark:border-emerald-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        : "border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
  }`;

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {cleanLabel}
          {required && (
            <span className="text-rose-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {showCounter && maxLength && (
          <span className="text-[11px] tabular-nums text-slate-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {hint && (
        <p id={hintId} className="mb-1.5 text-[11px] text-slate-500">
          {hint}
        </p>
      )}

      <div className="relative">
        {multiline ? (
          <textarea
            id={inputId}
            name={name}
            rows={rows}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={describedBy}
            className={`${fieldClasses} min-h-[104px] resize-y leading-relaxed`}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={describedBy}
            className={`${fieldClasses} min-h-[44px]`}
          />
        )}

        {/* Status Icon */}
        {touched && value.length > 0 && !multiline && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200">
            {isValid === true ? (
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ${showSuccess ? "scale-110" : "scale-100"} transition-transform duration-200`}
              >
                <Check size={12} />
              </div>
            ) : isValid === false ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                <X size={12} />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Validation Message */}
      {hasError && validationMessage && (
        <div
          id={errorId}
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-600"
        >
          <AlertCircle size={12} className="shrink-0" />
          <span>{validationMessage}</span>
        </div>
      )}
    </div>
  );
}
