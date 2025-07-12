const Button = ({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}) => {
  return (
    <button
      onClick={onClick}
      type={type}
      className={`bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
