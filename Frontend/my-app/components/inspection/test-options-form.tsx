"use client";

import { TEST_TYPES, type TestType } from "@/lib/snapshots";

export type TestOptions = {
  testType: TestType | "";
  testGoal: string;
  requirementsText: string; // one requirement per line
};

type Props = {
  options: TestOptions;
  onChange: (options: TestOptions) => void;
  disabled?: boolean;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-hero/20 bg-white px-4 py-3 text-sm text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue";

export default function TestOptionsForm({ options, onChange, disabled }: Props) {
  return (
    <fieldset disabled={disabled} className="space-y-5 rounded-3xl border border-hero/10 bg-white p-6 shadow-sm disabled:opacity-70">
      <legend className="sr-only">Test options</legend>
      <h2 className="text-lg font-semibold text-hero">What do you want to test?</h2>

      <div>
        <label htmlFor="test-type" className="block text-sm font-medium text-hero">Test type</label>
        <select
          id="test-type"
          required
          value={options.testType}
          onChange={(e) => onChange({ ...options, testType: e.target.value as TestType })}
          className={inputClass}
        >
          <option value="" disabled>Choose…</option>
          {TEST_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="test-goal" className="block text-sm font-medium text-hero">Testing goal</label>
        <textarea
          id="test-goal"
          required
          rows={3}
          maxLength={2000}
          placeholder="e.g. Check that a user can log in and sees an error with a wrong password"
          value={options.testGoal}
          onChange={(e) => onChange({ ...options, testGoal: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="requirements" className="block text-sm font-medium text-hero">
          Expected behaviour you already know <span className="font-normal text-hero-muted">(optional, one per line)</span>
        </label>
        <textarea
          id="requirements"
          rows={4}
          placeholder={"Wrong password shows “Invalid credentials”\nAfter login the user lands on /dashboard"}
          value={options.requirementsText}
          onChange={(e) => onChange({ ...options, requirementsText: e.target.value })}
          className={inputClass}
        />
      </div>
    </fieldset>
  );
}
