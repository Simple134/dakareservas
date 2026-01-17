export const CustomCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const CustomBadge = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
  >
    {children}
  </span>
);

export const CustomButton = ({
  onClick,
  children,
  className = "",
  disabled = false,
}: {
  onClick?: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    style={{ borderRadius: "8px" }}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${className}`}
  >
    {children}
  </button>
);
