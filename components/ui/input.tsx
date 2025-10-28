import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showClear?: boolean;
  onClear?: () => void;
  clearButtonClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      showClear,
      onClear,
      value,
      clearButtonClassName,
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value);

    return (
      <div className="relative w-full">
        <input
          type={type}
          value={value}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            showClear && hasValue && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {showClear && hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 p-0 rounded-full bg-[#b2b2b2]  flex items-center justify-center',
              clearButtonClassName
            )}
          >
            <X className="h-3 w-3 text-white font-bold" />
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
