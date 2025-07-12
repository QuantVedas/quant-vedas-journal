const Input = ({
  label,
  type = "text",
  value,
  onChange,
  name,
  placeholder = "",
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  placeholder?: string;
}) => {
  return (
    <div className="mb-4">
      <label className="block mb-1">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
      />
    </div>
  );
};

export default Input;
