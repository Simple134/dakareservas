"use client";
import { Check, ChevronDown } from "lucide-react";
import { useEffect } from "react";

type SelectOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export const CustomSelect = ({
  value,
  onChange,
  options,
  ref,
  isOpen,
  setIsOpen,
}: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  ref: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref && ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-64" ref={ref}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer border-gray-200"
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && <selectedOption.icon className="w-4 h-4" />}
          <span>{selectedOption?.label}</span>
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md border bg-white text-popover-foreground shadow-md animate-in fade-in-80">
          <div className="p-1">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-gray-100 ${value === option.value ? "bg-gray-100 font-medium" : ""}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{option.label}</span>
                  </div>
                  {value === option.value && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
