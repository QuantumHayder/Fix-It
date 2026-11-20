"use client";

import { useModels } from "@/hooks/api/use-llm";

type Props = {
  value: string; // "" = use the backend's default model
  onChange: (model: string) => void;
  disabled?: boolean;
};

export default function ModelSelector({ value, onChange, disabled }: Props) {
  const modelsQuery = useModels();

  if (modelsQuery.error) {
    // usually means Ollama is not running
    return <p role="alert" className="text-sm text-red-700">{modelsQuery.error.message}</p>;
  }

  return (
    <div>
      <label htmlFor="model" className="block text-sm font-medium text-hero">Model</label>
      <select
        id="model"
        value={value}
        disabled={disabled || modelsQuery.isPending}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-hero/20 bg-white px-4 py-2 text-sm text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
      >
        <option value="">
          {modelsQuery.data ? "Default (" + modelsQuery.data.defaultModel + ")" : "Loading models…"}
        </option>
        {modelsQuery.data?.models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
            {m.parameterSize && " · " + m.parameterSize}
            {m.quantization && " · " + m.quantization}
          </option>
        ))}
      </select>
    </div>
  );
}
