'use client';

export function SelectAllEmployees({ count }: { count: number }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all employees on this page"
      title="Select all employees on this page"
      onChange={(event) => {
        const { form, checked } = event.currentTarget;
        form?.querySelectorAll<HTMLInputElement>('input[name="employeeIds"]:not(:disabled)').forEach((input) => {
          input.checked = checked;
        });
      }}
      disabled={count === 0}
    />
  );
}
