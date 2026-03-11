import { ChangeEvent } from "react";

type FormInputProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  value: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

export default function FormInput({
  label,
  name,
  type = "text",
  placeholder,
  value,
  required = false,
  multiline = false,
  rows = 4,
  onChange,
}: FormInputProps) {
  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-[#0b1020]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={fieldClass}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={fieldClass}
        />
      )}
    </label>
  );
}
