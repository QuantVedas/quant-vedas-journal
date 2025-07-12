import React from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";

const SignUp: React.FC = () => {
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="p-8 bg-gray-800 rounded shadow-md w-96 text-center">
        <h1 className="text-2xl font-bold mb-6">Sign Up for Quant Vedas</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white w-full"
          onClick={loginWithGoogle}
        >
          Sign up with Google
        </button>
      </div>
    </div>
  );
};

export default SignUp;
