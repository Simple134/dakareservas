function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600 font-medium">{label}:</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-[#A9780F]" : "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default DetailRow;
