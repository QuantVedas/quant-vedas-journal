import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 p-4 space-y-4">
      <div className="text-xl font-bold">Quant Vedas</div>
      <nav className="flex flex-col space-y-2">
        <NavLink to="/" className="hover:text-blue-400">
          Dashboard
        </NavLink>
        <NavLink to="/calendar" className="hover:text-blue-400">
          Calendar
        </NavLink>
        <NavLink to="/stats" className="hover:text-blue-400">
          Stats
        </NavLink>
        <NavLink to="/profile" className="hover:text-blue-400">
          Profile
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
