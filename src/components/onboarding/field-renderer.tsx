'use client';

import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import type { OnboardingField } from '@/lib/onboarding-template';

/**
 * Renders one questionnaire field from its definition. The same definitions
 * drive the zod schema on the server, so what is rendered is exactly what is
 * validated.
 */
export function FieldRenderer({
  field,
  value,
  error,
  disabled,
}: {
  field: OnboardingField;
  value: unknown;
  error?: string;
  disabled?: boolean;
}) {
  const stringValue = typeof value === 'string' ? value : value == null ? '' : String(value);

  if (field.type === 'checkbox') {
    return (
      <div className={field.wide ? 'sm:col-span-2' : undefined}>
        <Checkbox
          name={field.key}
          defaultChecked={value === true}
          disabled={disabled}
          label={field.label}
          description={field.hint}
        />
        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Field
      label={field.label}
      hint={field.hint}
      error={error}
      required={field.required}
      className={field.wide ? 'sm:col-span-2' : undefined}
    >
      {({ id, describedBy, invalid }) => {
        const shared = {
          id,
          name: field.key,
          defaultValue: stringValue,
          disabled,
          'aria-describedby': describedBy,
          'aria-invalid': invalid,
          placeholder: field.placeholder,
        };

        switch (field.type) {
          case 'textarea':
            return <Textarea {...shared} rows={3} />;

          case 'select':
            return (
              <Select {...shared} placeholder="Choose an option" options={field.options ?? []} />
            );

          case 'colour':
            return (
              <div className="flex items-center gap-2">
                <Input {...shared} placeholder="#1E3A8A" className="flex-1" />
                {/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stringValue) ? (
                  <span
                    className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border-strong)]"
                    style={{ backgroundColor: stringValue }}
                    title={stringValue}
                    aria-label={`Preview of ${stringValue}`}
                  />
                ) : (
                  <span
                    className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-[var(--border-strong)]"
                    aria-hidden="true"
                  />
                )}
              </div>
            );

          case 'date':
            return <Input {...shared} type="date" />;

          case 'email':
            return <Input {...shared} type="email" inputMode="email" />;

          case 'tel':
            return <Input {...shared} type="tel" inputMode="tel" />;

          case 'url':
            return <Input {...shared} type="url" inputMode="url" />;

          default:
            return <Input {...shared} type="text" />;
        }
      }}
    </Field>
  );
}
