import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  type JSX,
} from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import { TradeType } from "./types/trade";

// --- Global Variables from Canvas Environment ---
// These variables are provided by the Canvas environment and should not be modified.
const appId = "1:750644695638:web:96dbd07de4dc2fc29661f7";
const firebaseConfig = {
  apiKey: "AIzaSyDVqjz17TI8kwxfR5C2XhNoK7t-XlMqA1c",
  authDomain: "moedge-59980.firebaseapp.com",
  databaseURL: "https://moedge-59980-default-rtdb.firebaseio.com",
  projectId: "moedge-59980",
  storageBucket: "moedge-59980.firebasestorage.app",
  messagingSenderId: "750644695638",
  appId: "1:750644695638:web:96dbd07de4dc2fc29661f7",
};
const initialAuthToken = null;

// --- Firebase Initialization ---
let app: any;
let auth: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Handle cases where firebaseConfig might be missing or invalid
}

// --- Context for User and Firebase Services ---
interface AuthContextType {
  currentUser: any;
  userId: string | null;
  auth: any;
  db: any;
  isAuthReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const initFirebaseAndAuth = async () => {
      if (!auth) {
        console.error("Firebase Auth not initialized.");
        setIsAuthReady(true);
        return;
      }

      // Sign in with custom token if available, otherwise anonymously
      if (initialAuthToken) {
        try {
          await signInWithCustomToken(auth, initialAuthToken);
          console.log("Signed in with custom token.");
        } catch (error) {
          console.error("Error signing in with custom token:", error);
          await signInAnonymously(auth);
          console.log("Signed in anonymously due to custom token error.");
        }
      } else {
        try {
          await signInAnonymously(auth);
          console.log("Signed in anonymously.");
        } catch (error) {
          console.error("Error signing in anonymously:", error);
        }
      }

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setUserId(user ? user.uid : crypto.randomUUID()); // Use UID if logged in, else a random UUID
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    };

    initFirebaseAndAuth();
  }, []); // Empty dependency array ensures this runs only once on mount

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in with Google:", error.message);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing up with email:", error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing in with email:", error.message);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Error signing out:", error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userId,
        auth,
        db,
        isAuthReady,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// --- Message Box Component (replaces alert/confirm) ---
interface MessageBoxProps {
  message: string;
  onClose: () => void;
  type?: "alert" | "confirm";
  onConfirm?: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  onClose,
  type = "alert",
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full min-w-[300px] text-center">
        <p className="text-xl font-semibold mb-6 text-gray-800 break-words">
          {message}
        </p>
        <div className="flex justify-center space-x-4">
          {type === "confirm" && (
            <button
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-lg font-semibold"
            >
              Confirm
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 text-lg font-semibold"
          >
            {type === "alert" ? "OK" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Loading Spinner Component ---
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
  </div>
);

// --- Auth Pages (Login, SignUp) ---
const AuthPage: React.FC<{ onAuthSuccess: () => void }> = ({
  onAuthSuccess,
}) => {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onAuthSuccess(); // Navigate to dashboard on success
    } catch (error: any) {
      setMessage(error.message);
      setShowMessageBox(true);
    }
  };

  const handleGoogleAuth = async () => {
    setMessage("");
    try {
      await signInWithGoogle();
      onAuthSuccess(); // Navigate to dashboard on success
    } catch (error: any) {
      setMessage(error.message);
      setShowMessageBox(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {isLogin ? "Login" : "Sign Up"}
        </h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>
          <button
            onClick={handleGoogleAuth}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.0003 4.75C14.0113 4.75 15.8283 5.438 17.2483 6.848L20.0453 4.051C18.0003 2.006 15.1413 0.75 12.0003 0.75C7.2753 0.75 3.1993 3.447 1.2503 7.044L4.5493 9.687C5.4603 7.956 8.5283 4.75 12.0003 4.75Z" />
              <path d="M23.25 12.0003C23.25 11.2323 23.181 10.4883 23.053 9.7593L12 9.7503V14.2503H18.421C18.177 15.5873 17.433 16.7863 16.322 17.5873L19.614 20.1533C21.579 18.3343 22.999 15.3993 22.999 12.0003H23.25Z" />
              <path d="M4.5493 9.687L1.2503 7.044C0.7743 7.935 0.5163 8.924 0.5163 10.0003C0.5163 11.0763 0.7743 12.0653 1.2503 12.9563L4.5493 15.5993L4.5493 9.687Z" />
              <path d="M12.0003 23.25C15.0603 23.25 17.7473 22.213 19.6143 20.153L16.3223 17.587C15.3223 18.293 13.7843 18.75 12.0003 18.75C8.5283 18.75 5.4603 15.544 4.5493 13.813L1.2503 16.456C3.1993 20.053 7.2753 22.75 12.0003 22.75V23.25Z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Navbar Component ---
interface NavbarProps {
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  currentUser: any; // Added currentUser to NavbarProps
}

const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onSignOut,
  currentUser,
}) => {
  return (
    <nav className="bg-gray-800 p-4 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          {/* Quant Vedas Logo */}
          <img
            src="logo.jpg"
            alt="Quant Vedas Logo"
            className="h-10 w-10 mr-2 rounded-full"
            onError={(e) =>
              (e.currentTarget.src =
                "https://placehold.co/40x40/FF0000/FFFFFF?text=Error")
            }
          />
          <span className="text-2xl font-bold mr-2">Quant Vedas</span>
          <span className="text-xl font-semibold text-blue-400">Journal</span>
        </div>
        <div className="flex space-x-4 items-center">
          {" "}
          {/* Added items-center for alignment */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="hover:text-blue-300 transition duration-200"
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate("profile")}
            className="hover:text-blue-300 transition duration-200"
          >
            Profile
          </button>
          {/* Profile Photo/Icon for navigation */}
          {currentUser && (
            <button onClick={() => onNavigate("profile")} className="ml-4">
              <img
                src={
                  currentUser.photoURL ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${
                    currentUser.displayName || currentUser.email || "User"
                  }`
                }
                alt="Profile"
                className="h-10 w-10 rounded-full border-2 border-blue-400 object-cover cursor-pointer hover:border-blue-300 transition duration-200"
                title="Go to Profile"
              />
            </button>
          )}
          <button
            onClick={onSignOut}
            className="bg-red-600 px-3 py-1 rounded-md hover:bg-red-700 transition duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

// --- TradeOrder Interface ---
interface TradeOrder {
  action: "BUY" | "SELL";
  date: string;
  time: string;
  quantity: number;
  price: number;
  fee: number;
}

// --- Trade Interface ---
interface Trade {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  type: TradeType;
  status: "Open" | "Closed";
  pnl: number;
  date: string;
  orders?: TradeOrder[];
  market?: string;
  target?: number;
  stopLoss?: number;
  tags?: string[];
  notes?: string;
  confidence?: number;
  imageUrls?: string[];
  strategyId?: string | null; // New field to link to a strategy
}

// --- Strategy Interface ---
interface Strategy {
  id: string;
  name: string;
  description: string;
  rules?: string;
  riskManagement?: string;
  // Add other strategy-specific fields as needed
}

// --- New Trade Modal Component ---
interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    trade: Omit<Trade, "id" | "pnl" | "status">,
    orders: TradeOrder[],
    additionalData: {
      tags: string[];
      notes: string;
      confidence: number;
      imageUrls: string[];
      strategyId: string | null;
    }
  ) => Promise<void>;
  strategies: Strategy[]; // Pass available strategies to the modal
}

const NewTradeModal: React.FC<NewTradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  strategies,
}) => {
  const [activeTab, setActiveTab] = useState("general"); // 'general' or 'journal'
  const [market, setMarket] = useState("FUTURES");
  const [symbol, setSymbol] = useState("");
  const [target, setTarget] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [orders, setOrders] = useState<TradeOrder[]>([
    {
      action: "BUY",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      quantity: 0,
      price: 0,
      fee: 0,
    },
  ]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState(5);
  const [imageUrls, setImageUrls] = useState<string[]>([]); // To store base64 image data or URLs
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
    null
  ); // New state for strategy
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when closed
      setActiveTab("general");
      setMarket("FUTURES");
      setSymbol("");
      setTarget("");
      setStopLoss("");
      setOrders([
        {
          action: "BUY",
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toTimeString().slice(0, 5),
          quantity: 0,
          price: 0,
          fee: 20,
        },
      ]);
      setTags([]);
      setNewTag("");
      setNotes("");
      setConfidence(5);
      setImageUrls([]);
      setSelectedStrategyId(null); // Reset selected strategy
      setMessage("");
    }
  }, [isOpen]);

  const handleOrderChange = (
    index: number,
    field: keyof TradeOrder,
    value: any
  ) => {
    const newOrders = [...orders];
    newOrders[index] = { ...newOrders[index], [field]: value };
    setOrders(newOrders);
  };

  const addOrder = () => {
    setOrders([
      ...orders,
      {
        action: "BUY",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        quantity: 0,
        price: 0,
        fee: 0,
      },
    ]);
  };

  const removeOrder = (index: number) => {
    const newOrders = orders.filter((_, i) => i !== index);
    setOrders(newOrders);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim() !== "") {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls([...imageUrls, reader.result as string]);
      };
      reader.readAsDataURL(file); // Read file as base64
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls(imageUrls.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    if (!symbol || orders.some((order) => !order.quantity || !order.price)) {
      setMessage(
        "Please fill in all required trade fields (Symbol, Quantity, Price)."
      );
      setShowMessageBox(true);
      return;
    }

    const newTrade = {
      symbol,
      entryPrice: orders[0]?.price || 0, // Assuming first order is entry
      exitPrice: null, // Will be updated when trade is closed
      quantity: orders.reduce((sum, order) => sum + order.quantity, 0),
      type: orders[0]?.action === "BUY" ? TradeType.Buy : TradeType.Sell, // Use TradeType enum
      date: orders[0]?.date || new Date().toISOString().slice(0, 10),
      market,
      target: target === "" ? undefined : target,
      stopLoss: stopLoss === "" ? undefined : stopLoss,
    };

    const additionalData = {
      tags,
      notes,
      confidence,
      imageUrls,
      strategyId: selectedStrategyId, // Include selected strategy ID
    };

    try {
      await onSave(newTrade, orders, additionalData);
      onClose();
    } catch (error: any) {
      setMessage(`Failed to save trade: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] overflow-y-auto text-white">
        {/* Header with Close Button and Trade ID */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">New Trade</h2>
          <div className="flex items-center space-x-4">
            <p className="text-gray-400 text-lg">
              Trade ID: <span className="font-semibold">Pending</span>
            </p>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition duration-200 ${
              activeTab === "general"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-700"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("journal")}
            className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition duration-200 ${
              activeTab === "journal"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-700"
            }`}
          >
            Journal
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === "general" && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-200">General</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Market
                  </label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FUTURES">FUTURES</option>
                    <option value="OPTIONS">OPTIONS</option>
                    <option value="EQUITY">EQUITY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="RELIANCE"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Target
                  </label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) =>
                      setTarget(parseFloat(e.target.value) || "")
                    }
                    className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Stop-Loss
                  </label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) =>
                      setStopLoss(parseFloat(e.target.value) || "")
                    }
                    className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Strategy
                  </label>
                  <select
                    value={selectedStrategyId || ""}
                    onChange={(e) =>
                      setSelectedStrategyId(e.target.value || null)
                    }
                    className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- No Strategy --</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-4 text-gray-200">
                Trade Orders
              </h3>
              {orders.map((order, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-center mb-4 bg-gray-700 p-4 rounded-md"
                >
                  <div className="col-span-1">
                    <button
                      onClick={() =>
                        handleOrderChange(
                          index,
                          "action",
                          order.action === "BUY" ? "SELL" : "BUY"
                        )
                      }
                      className={`w-full py-2 rounded-md font-semibold transition duration-200 ${
                        order.action === "BUY"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {order.action}
                    </button>
                  </div>
                  <div className="col-span-1">
                    <input
                      type="date"
                      value={order.date}
                      onChange={(e) =>
                        handleOrderChange(index, "date", e.target.value)
                      }
                      className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="time"
                      value={order.time}
                      onChange={(e) =>
                        handleOrderChange(index, "time", e.target.value)
                      }
                      className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      value={order.quantity}
                      onChange={(e) =>
                        handleOrderChange(
                          index,
                          "quantity",
                          parseInt(e.target.value) || ""
                        )
                      }
                      className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      value={order.price}
                      onChange={(e) =>
                        handleOrderChange(
                          index,
                          "price",
                          parseFloat(e.target.value) || ""
                        )
                      }
                      className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                      placeholder="Price"
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center space-x-2">
                    <input
                      type="number"
                      value={order.fee}
                      onChange={(e) =>
                        handleOrderChange(
                          index,
                          "fee",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                      placeholder="Fee"
                    />
                    {orders.length > 1 && (
                      <button
                        onClick={() => removeOrder(index)}
                        className="text-red-500 hover:text-red-700 text-xl font-bold"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addOrder}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center mx-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add Order
              </button>
            </div>
          )}

          {activeTab === "journal" && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-200">Journal</h3>

              {/* Tags */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-600 text-white px-3 py-1 rounded-full flex items-center text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-white hover:text-gray-200"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add tags (e.g., DTF Line Breakout, Gapped Down Below SL)"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Notes
                </label>
                <div className="bg-gray-700 rounded-md p-2 mb-2 flex space-x-2">
                  {/* Basic rich text controls - simulated for now */}
                  <button className="p-1 rounded hover:bg-gray-600 text-gray-300 font-bold">
                    B
                  </button>
                  <button className="p-1 rounded hover:bg-gray-600 text-gray-300 italic">
                    I
                  </button>
                  <button className="p-1 rounded hover:bg-gray-600 text-gray-300 underline">
                    U
                  </button>
                  <button className="p-1 rounded hover:bg-gray-600 text-gray-300 line-through">
                    S
                  </button>
                  <button className="p-1 rounded hover:bg-gray-600 text-gray-300">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </button>{" "}
                  {/* List icon */}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[120px]"
                  placeholder="Add your notes here..."
                ></textarea>
              </div>

              {/* Confidence Slider */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Confidence: {confidence}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>

              {/* Image Attachments */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Attachments
                </label>
                <div className="flex flex-wrap gap-4">
                  <label
                    htmlFor="image-upload"
                    className="w-24 h-24 border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-700 transition duration-200"
                  >
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {imageUrls.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative w-24 h-24 rounded-md overflow-hidden"
                    >
                      <img
                        src={imageUrl}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons at the bottom */}
        <div className="mt-auto p-4 flex justify-end space-x-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
          >
            Save Trade
          </button>
        </div>
        {showMessageBox && (
          <MessageBox
            message={message}
            onClose={() => setShowMessageBox(false)}
            type="alert"
          />
        )}
      </div>
    </div>
  );
};

// --- New Setup Modal Component ---
interface NewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrades: (trades: any[]) => Promise<void>;
}

const NewSetupModal: React.FC<NewSetupModalProps> = ({
  isOpen,
  onClose,
  onImportTrades,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setMessage("");
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage("");
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row: ${lines[i]}`);
        continue;
      }
      const row: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        let value: any = values[index];
        // Attempt to convert to number if possible
        if (!isNaN(Number(value)) && value.trim() !== "") {
          value = Number(value);
        }
        row[header] = value;
      });
      data.push(row);
    }
    return data;
  };

  const handleImport = async () => {
    if (!file) {
      setMessage("Please select a file to import.");
      setShowMessageBox(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        // Assuming CSV for simplicity. For Excel (.xlsx), a library like 'xlsx' would be needed.
        const importedData = parseCSV(text);

        // Basic validation and mapping to Trade interface
        const validTrades: Omit<Trade, "id" | "pnl" | "status">[] =
          importedData.map((row) => ({
            symbol: row.Symbol || "UNKNOWN",
            entryPrice: parseFloat(row.EntryPrice) || 0,
            exitPrice: row.ExitPrice ? parseFloat(row.ExitPrice) : null,
            quantity: parseInt(row.Quantity) || 0,
            type: row.Type === "Buy" ? TradeType.Buy : TradeType.Sell,
            date: row.Date || new Date().toISOString().slice(0, 10),
            // Add other fields from CSV if they map to Trade interface
            market: row.Market || "FUTURES",
            target: row.Target ? parseFloat(row.Target) : undefined,
            stopLoss: row.StopLoss ? parseFloat(row.StopLoss) : undefined,
            // Orders would need more complex parsing if present in CSV
          }));

        await onImportTrades(validTrades);
        setMessage("Trades imported successfully!");
        setShowMessageBox(true);
        onClose();
      } catch (error: any) {
        console.error("Error processing file:", error);
        setMessage(`Failed to import trades: ${error.message}`);
        setShowMessageBox(true);
      }
    };
    reader.onerror = () => {
      setMessage("Failed to read file.");
      setShowMessageBox(true);
    };
    reader.readAsText(file); // For CSV
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Import Trades</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className="block text-gray-300 text-sm font-bold mb-2"
          >
            Select CSV/Excel File
          </label>
          <input
            type="file"
            id="file-upload"
            accept=".csv" // Limiting to CSV for this demo
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-500 file:text-white
                       hover:file:bg-blue-600"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-400">
              Selected file: {file.name}
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={handleImport}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
          >
            Import
          </button>
        </div>
        {showMessageBox && (
          <MessageBox
            message={message}
            onClose={() => setShowMessageBox(false)}
            type="alert"
          />
        )}
      </div>
    </div>
  );
};

// --- New Note Modal Component ---
interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Add any props for saving notes
}

const NewNoteModal: React.FC<NewNoteModalProps> = ({ isOpen, onClose }) => {
  const [noteContent, setNoteContent] = useState("");
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNoteContent("");
      setMessage("");
    }
  }, [isOpen]);

  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      setMessage("Note content cannot be empty.");
      setShowMessageBox(true);
      return;
    }
    // Implement save note logic here (e.g., to Firestore)
    console.log("Saving note:", noteContent);
    setMessage("Note saved successfully! (Simulated)");
    setShowMessageBox(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">New Note</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Write your note here..."
          rows={6}
          className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y"
        ></textarea>
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNote}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
          >
            Save Note
          </button>
        </div>
        {showMessageBox && (
          <MessageBox
            message={message}
            onClose={() => setShowMessageBox(false)}
            type="alert"
          />
        )}
      </div>
    </div>
  );
};

// --- Trade View Modal Component ---
interface TradeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onUpdateTrade: (
    tradeId: string,
    updatedData: Partial<Trade>,
    updatedOrders: TradeOrder[]
  ) => Promise<void>;
  onDeleteTrade: (tradeId: string) => Promise<void>;
  strategies: Strategy[]; // Pass strategies for dropdown
}

const TradeViewModal: React.FC<TradeViewModalProps> = ({
  isOpen,
  onClose,
  trade,
  onUpdateTrade,
  onDeleteTrade,
  strategies,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // 'general' or 'journal'
  const [editedTrade, setEditedTrade] = useState<Trade | null>(null);
  const [editedOrders, setEditedOrders] = useState<TradeOrder[]>([]);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [editedConfidence, setEditedConfidence] = useState(5);
  const [editedImageUrls, setEditedImageUrls] = useState<string[]>([]);
  const [editedStrategyId, setEditedStrategyId] = useState<string | null>(null); // New state for strategy
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);

  useEffect(() => {
    if (isOpen && trade) {
      setEditedTrade({ ...trade });
      setEditedOrders(trade.orders ? [...trade.orders] : []);
      setEditedTags(trade.tags ? [...trade.tags] : []);
      setEditedNotes(trade.notes || "");
      setEditedConfidence(trade.confidence || 5);
      setEditedImageUrls(trade.imageUrls ? [...trade.imageUrls] : []);
      setEditedStrategyId(trade.strategyId || null); // Set initial strategy ID
      setIsEditing(false); // Start in view mode
      setActiveTab("general");
    }
  }, [isOpen, trade]);

  if (!isOpen || !trade || !editedTrade) return null;

  const handleEditChange = (field: keyof Trade, value: any) => {
    setEditedTrade((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleOrderChange = (
    index: number,
    field: keyof TradeOrder,
    value: any
  ) => {
    const newOrders = [...editedOrders];
    newOrders[index] = { ...newOrders[index], [field]: value };
    setEditedOrders(newOrders);
  };

  const addOrder = () => {
    setEditedOrders([
      ...editedOrders,
      {
        action: "BUY",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        quantity: 0,
        price: 0,
        fee: 0,
      },
    ]);
  };

  const removeOrder = (index: number) => {
    const newOrders = editedOrders.filter((_, i) => i !== index);
    setEditedOrders(newOrders);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim() !== "") {
      setEditedTags([...editedTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedImageUrls([...editedImageUrls, reader.result as string]);
      };
      reader.readAsDataURL(file); // Read file as base64
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEditedImageUrls(
      editedImageUrls.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSave = async () => {
    if (
      !editedTrade.symbol ||
      editedOrders.some((order) => !order.quantity || !order.price)
    ) {
      setMessage(
        "Please fill in all required trade fields (Symbol, Quantity, Price)."
      );
      setShowMessageBox(true);
      return;
    }

    const updatedTradeData: Partial<Trade> = {
      symbol: editedTrade.symbol,
      entryPrice: editedOrders[0]?.price || 0,
      exitPrice: editedTrade.exitPrice,
      quantity: editedOrders.reduce((sum, order) => sum + order.quantity, 0),
      type: editedOrders[0]?.action === "BUY" ? TradeType.Buy : TradeType.Sell,
      date: editedOrders[0]?.date || new Date().toISOString().slice(0, 10),
      market: editedTrade.market,
      target: editedTrade.target === undefined ? undefined : editedTrade.target,
      stopLoss:
        editedTrade.stopLoss === undefined ? undefined : editedTrade.stopLoss,
      tags: editedTags,
      notes: editedNotes,
      confidence: editedConfidence,
      imageUrls: editedImageUrls,
      strategyId: editedStrategyId, // Include updated strategy ID
    };

    try {
      await onUpdateTrade(trade.id, updatedTradeData, editedOrders);
      setMessage("Trade updated successfully!");
      setShowMessageBox(true);
      setIsEditing(false);
      onClose();
    } catch (error: any) {
      setMessage(`Failed to update trade: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const handleDelete = async () => {
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await onDeleteTrade(trade.id);
      setMessage("Trade deleted successfully!");
      setShowMessageBox(true);
      onClose();
    } catch (error: any) {
      setMessage(`Failed to delete trade: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const linkedStrategy = strategies.find((s) => s.id === trade.strategyId);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] overflow-y-auto text-white">
        {/* Header with Close Button and Trade ID */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Trade View</h2>
          <div className="flex items-center space-x-4">
            <p className="text-gray-400 text-lg">
              Trade ID: <span className="font-semibold">{trade.id}</span>
            </p>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Trade Summary */}
        {!isEditing && (
          <div className="mb-6 p-4 bg-gray-700 rounded-md">
            <h3 className="text-2xl font-bold mb-2">
              {trade.symbol}{" "}
              <span
                className={`ml-2 text-xl ${
                  trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ₹{trade.pnl.toFixed(2)}
              </span>
            </h3>
            <p className="text-gray-300">
              Market: {trade.market} | Type: {trade.type} | Status:{" "}
              {trade.status}
            </p>
            <p className="text-gray-300">
              Entry: ₹{trade.entryPrice.toFixed(2)} | Exit:{" "}
              {trade.exitPrice ? `₹${trade.exitPrice.toFixed(2)}` : "N/A"} |
              Quantity: {trade.quantity}
            </p>
            {trade.target && (
              <p className="text-gray-300">
                Target: ₹{trade.target.toFixed(2)}
              </p>
            )}
            {trade.stopLoss && (
              <p className="text-gray-300">
                Stop-Loss: ₹{trade.stopLoss.toFixed(2)}
              </p>
            )}
            {linkedStrategy && (
              <p className="text-gray-300">
                Strategy:{" "}
                <span className="font-semibold">{linkedStrategy.name}</span>
              </p>
            )}
            {trade.notes && (
              <div className="mt-4">
                <p className="font-semibold text-gray-200">Notes:</p>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {trade.notes}
                </p>
              </div>
            )}
            {trade.tags && trade.tags.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold text-gray-200">Tags:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {trade.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {trade.imageUrls && trade.imageUrls.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold text-gray-200">Attachments:</p>
                <div className="flex flex-wrap gap-4 mt-2">
                  {trade.imageUrls.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Attachment ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-md border border-gray-600"
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-lg font-semibold"
              >
                Edit Trade
              </button>
            </div>
          </div>
        )}

        {/* Edit Form */}
        {isEditing && editedTrade && (
          <div>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab("general")}
                className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition duration-200 ${
                  activeTab === "general"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab("journal")}
                className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition duration-200 ${
                  activeTab === "journal"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                Journal
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1">
              {activeTab === "general" && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-gray-200">
                    General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-2">
                        Market
                      </label>
                      <select
                        value={editedTrade.market}
                        onChange={(e) =>
                          handleEditChange("market", e.target.value)
                        }
                        className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="FUTURES">FUTURES</option>
                        <option value="OPTIONS">OPTIONS</option>
                        <option value="EQUITY">EQUITY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-2">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={editedTrade.symbol}
                        onChange={(e) =>
                          handleEditChange("symbol", e.target.value)
                        }
                        className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="RELIANCE"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-2">
                        Target
                      </label>
                      <input
                        type="number"
                        value={
                          editedTrade.target === undefined
                            ? ""
                            : editedTrade.target
                        }
                        onChange={(e) =>
                          handleEditChange(
                            "target",
                            parseFloat(e.target.value) || ""
                          )
                        }
                        className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-2">
                        Stop-Loss
                      </label>
                      <input
                        type="number"
                        value={
                          editedTrade.stopLoss === undefined
                            ? ""
                            : editedTrade.stopLoss
                        }
                        onChange={(e) =>
                          handleEditChange(
                            "stopLoss",
                            parseFloat(e.target.value) || ""
                          )
                        }
                        className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-2">
                        Strategy
                      </label>
                      <select
                        value={editedStrategyId || ""}
                        onChange={(e) =>
                          setEditedStrategyId(e.target.value || null)
                        }
                        className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- No Strategy --</option>
                        {strategies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4 text-gray-200">
                    Trade Orders
                  </h3>
                  {editedOrders.map((order, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-center mb-4 bg-gray-700 p-4 rounded-md"
                    >
                      <div className="col-span-1">
                        <button
                          onClick={() =>
                            handleOrderChange(
                              index,
                              "action",
                              order.action === "BUY" ? "SELL" : "BUY"
                            )
                          }
                          className={`w-full py-2 rounded-md font-semibold transition duration-200 ${
                            order.action === "BUY"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {order.action}
                        </button>
                      </div>
                      <div className="col-span-1">
                        <input
                          type="date"
                          value={order.date}
                          onChange={(e) =>
                            handleOrderChange(index, "date", e.target.value)
                          }
                          className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="time"
                          value={order.time}
                          onChange={(e) =>
                            handleOrderChange(index, "time", e.target.value)
                          }
                          className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          value={order.quantity}
                          onChange={(e) =>
                            handleOrderChange(
                              index,
                              "quantity",
                              parseInt(e.target.value) || ""
                            )
                          }
                          className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                          placeholder="Qty"
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          value={order.price}
                          onChange={(e) =>
                            handleOrderChange(
                              index,
                              "price",
                              parseFloat(e.target.value) || ""
                            )
                          }
                          className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                          placeholder="Price"
                          required
                        />
                      </div>
                      <div className="col-span-1 flex items-center space-x-2">
                        <input
                          type="number"
                          value={order.fee}
                          onChange={(e) =>
                            handleOrderChange(
                              index,
                              "fee",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full p-2 rounded-md bg-gray-600 border border-gray-500 text-white"
                          placeholder="Fee"
                        />
                        {editedOrders.length > 1 && (
                          <button
                            onClick={() => removeOrder(index)}
                            className="text-red-500 hover:text-red-700 text-xl font-bold"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addOrder}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center mx-auto"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Add Order
                  </button>
                </div>
              )}

              {activeTab === "journal" && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-gray-200">
                    Journal
                  </h3>

                  {/* Tags */}
                  <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editedTags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-blue-600 text-white px-3 py-1 rounded-full flex items-center text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-white hover:text-gray-200"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add tags (e.g., DTF Line Breakout, Gapped Down Below SL)"
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Notes
                    </label>
                    <div className="bg-gray-700 rounded-md p-2 mb-2 flex space-x-2">
                      {/* Basic rich text controls - simulated for now */}
                      <button className="p-1 rounded hover:bg-gray-600 text-gray-300 font-bold">
                        B
                      </button>
                      <button className="p-1 rounded hover:bg-gray-600 text-gray-300 italic">
                        I
                      </button>
                      <button className="p-1 rounded hover:bg-gray-600 text-gray-300 underline">
                        U
                      </button>
                      <button className="p-1 rounded hover:bg-gray-600 text-gray-300 line-through">
                        S
                      </button>
                      <button className="p-1 rounded hover:bg-gray-600 text-gray-300">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </button>{" "}
                      {/* List icon */}
                    </div>
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[120px]"
                      placeholder="Add your notes here..."
                    ></textarea>
                  </div>

                  {/* Confidence Slider */}
                  <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Confidence: {editedConfidence}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={editedConfidence}
                      onChange={(e) =>
                        setEditedConfidence(parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>

                  {/* Image Attachments */}
                  <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      Attachments
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label
                        htmlFor="image-upload"
                        className="w-24 h-24 border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-700 transition duration-200"
                      >
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          ></path>
                        </svg>
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      {editedImageUrls.map((imageUrl, index) => (
                        <div
                          key={index}
                          className="relative w-24 h-24 rounded-md overflow-hidden"
                        >
                          <img
                            src={imageUrl}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons at the bottom */}
            <div className="mt-auto p-4 flex justify-between space-x-4 border-t border-gray-700">
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
              >
                Delete
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        {showMessageBox && (
          <MessageBox
            message={message}
            onClose={() => setShowMessageBox(false)}
            type="alert"
          />
        )}
        {isConfirmDeleteModalOpen && (
          <MessageBox
            message="Are you sure you want to delete this trade? This action cannot be undone."
            onClose={() => setIsConfirmDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            type="confirm"
          />
        )}
      </div>
    </div>
  );
};

// --- New Strategy Modal Component ---
interface NewStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategy: Omit<Strategy, "id">) => Promise<void>;
}

const NewStrategyModal: React.FC<NewStrategyModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [riskManagement, setRiskManagement] = useState("");
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setRules("");
      setRiskManagement("");
      setMessage("");
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage("Strategy name cannot be empty.");
      setShowMessageBox(true);
      return;
    }

    const newStrategy: Omit<Strategy, "id"> = {
      name,
      description,
      rules,
      riskManagement,
    };

    try {
      await onSave(newStrategy);
      onClose();
    } catch (error: any) {
      setMessage(`Failed to save strategy: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl h-[90vh] overflow-y-auto text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">New Strategy</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Strategy Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Breakout Trading, Options Selling"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px]"
              placeholder="Brief overview of the strategy."
            ></textarea>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Entry/Exit Rules
            </label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[120px]"
              placeholder="Detailed rules for entering and exiting trades."
            ></textarea>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Risk Management
            </label>
            <textarea
              value={riskManagement}
              onChange={(e) => setRiskManagement(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[100px]"
              placeholder="How do you manage risk for this strategy? (e.g., max loss per trade, position sizing)"
            ></textarea>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
          >
            Save Strategy
          </button>
        </div>
        {showMessageBox && (
          <MessageBox
            message={message}
            onClose={() => setShowMessageBox(false)}
            type="alert"
          />
        )}
      </div>
    </div>
  );
};

// --- Strategy View Modal Component ---
interface StrategyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy | null;
  trades: Trade[]; // All trades to filter by strategy
  onUpdateStrategy: (
    strategyId: string,
    updatedData: Partial<Strategy>
  ) => Promise<void>;
  onDeleteStrategy: (strategyId: string) => Promise<void>;
}

const StrategyViewModal: React.FC<StrategyViewModalProps> = ({
  isOpen,
  onClose,
  strategy,
  trades,
  onUpdateStrategy,
  onDeleteStrategy,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStrategy, setEditedStrategy] = useState<Strategy | null>(null);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);

  useEffect(() => {
    if (isOpen && strategy) {
      setEditedStrategy({ ...strategy });
      setIsEditing(false); // Start in view mode
    }
  }, [isOpen, strategy]);

  if (!isOpen || !strategy || !editedStrategy) return null;

  const handleEditChange = (field: keyof Strategy, value: any) => {
    setEditedStrategy((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!editedStrategy.name.trim()) {
      setMessage("Strategy name cannot be empty.");
      setShowMessageBox(true);
      return;
    }

    try {
      await onUpdateStrategy(strategy.id, editedStrategy);
      setMessage("Strategy updated successfully!");
      setShowMessageBox(true);
      setIsEditing(false);
    } catch (error: any) {
      setMessage(`Failed to update strategy: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const handleDelete = async () => {
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await onDeleteStrategy(strategy.id);
      setMessage("Strategy deleted successfully!");
      setShowMessageBox(true);
      onClose();
    } catch (error: any) {
      setMessage(`Failed to delete strategy: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const linkedTrades = trades.filter(
    (trade) => trade.strategyId === strategy.id
  );
  const totalPnl = linkedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const totalTrades = linkedTrades.length;
  const winningTrades = linkedTrades.filter((trade) => trade.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] overflow-y-auto text-white">
        {/* Header with Close Button and Strategy Name */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">{strategy.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Strategy Summary / Edit Form */}
        {!isEditing ? (
          <div className="mb-6 p-4 bg-gray-700 rounded-md">
            <h3 className="text-xl font-bold mb-2 text-gray-200">Details</h3>
            <p className="text-gray-300 mb-2">
              <strong>Description:</strong> {strategy.description || "N/A"}
            </p>
            <p className="text-gray-300 mb-2">
              <strong>Rules:</strong>{" "}
              <span className="whitespace-pre-wrap">
                {strategy.rules || "N/A"}
              </span>
            </p>
            <p className="text-gray-300 mb-4">
              <strong>Risk Management:</strong>{" "}
              <span className="whitespace-pre-wrap">
                {strategy.riskManagement || "N/A"}
              </span>
            </p>

            <h3 className="text-xl font-bold mb-2 text-gray-200">
              Performance Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-gray-300">
              <div>
                <strong>Total Trades:</strong> {totalTrades}
              </div>
              <div>
                <strong>Total PnL:</strong>{" "}
                <span
                  className={`${
                    totalPnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ₹{totalPnl.toFixed(2)}
                </span>
              </div>
              <div>
                <strong>Win Rate:</strong> {winRate.toFixed(2)}%
              </div>
              {/* Add more summary stats here */}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-lg font-semibold"
              >
                Edit Strategy
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-200">
              Edit Strategy
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={editedStrategy.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Description
                </label>
                <textarea
                  value={editedStrategy.description || ""}
                  onChange={(e) =>
                    handleEditChange("description", e.target.value)
                  }
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px]"
                ></textarea>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Entry/Exit Rules
                </label>
                <textarea
                  value={editedStrategy.rules || ""}
                  onChange={(e) => handleEditChange("rules", e.target.value)}
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[120px]"
                ></textarea>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Risk Management
                </label>
                <textarea
                  value={editedStrategy.riskManagement || ""}
                  onChange={(e) =>
                    handleEditChange("riskManagement", e.target.value)
                  }
                  className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[100px]"
                ></textarea>
              </div>
            </div>

            <div className="mt-8 flex justify-between space-x-4">
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
              >
                Delete Strategy
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Linked Trades Section */}
        <div className="mt-8 p-4 bg-gray-700 rounded-md">
          <h3 className="text-xl font-bold mb-4 text-gray-200">
            Trades Linked to This Strategy ({linkedTrades.length})
          </h3>
          {linkedTrades.length === 0 ? (
            <p className="text-gray-400">
              No trades linked to this strategy yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      PnL
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                  {linkedTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                        {trade.date}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-300">
                        {trade.symbol}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span
                          className={`${
                            trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          ₹{trade.pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            trade.status === "Open"
                              ? "bg-yellow-600 text-white"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          {trade.status === "Open" ? "● OPEN" : "● CLOSED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showMessageBox && (
          <MessageBox
            message={message}
            onClose={() => setShowMessageBox(false)}
            type="alert"
          />
        )}
        {isConfirmDeleteModalOpen && (
          <MessageBox
            message="Are you sure you want to delete this strategy? All linked trades will remain but will no longer be associated with this strategy."
            onClose={() => setIsConfirmDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            type="confirm"
          />
        )}
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard: React.FC = () => {
  const { currentUser, userId, db, isAuthReady } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]); // New state for strategies
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [livePnl, setLivePnl] = useState(0);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isNewTradeModalOpen, setIsNewTradeModalOpen] = useState(false);
  const [isNewSetupModalOpen, setIsNewSetupModalOpen] = useState(false); // State for New Setup modal
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false); // State for New Note modal
  const [isTradeViewModalOpen, setIsTradeViewModalOpen] = useState(false); // State for Trade View modal
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null); // State to hold the selected trade

  // Simulate fetching trades from Firestore (replace with your backend API)
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const tradesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/trades`
    );

    // Simulate initial trades if none exist
    const checkAndAddInitialTrades = async () => {
      const querySnapshot = await getDocs(tradesCollectionRef);
      if (querySnapshot.empty) {
        const initialTrades: Trade[] = [
          {
            id: "1",
            symbol: "AAPL",
            entryPrice: 150,
            exitPrice: 155,
            quantity: 10,
            type: TradeType.Buy,
            status: "Closed",
            pnl: 50,
            date: "2025-07-01",
            tags: ["Demo", "Closed"],
            notes: "Initial demo trade for AAPL.",
            confidence: 8,
            imageUrls: [],
            orders: [
              {
                action: "BUY",
                date: "2025-07-01",
                time: "09:30",
                quantity: 10,
                price: 150,
                fee: 1.5,
              },
              {
                action: "SELL",
                date: "2025-07-01",
                time: "15:00",
                quantity: 10,
                price: 155,
                fee: 1.5,
              },
            ],
          },
          {
            id: "2",
            symbol: "GOOG",
            entryPrice: 100,
            exitPrice: null,
            quantity: 5,
            type: TradeType.Buy,
            status: "Open",
            pnl: 0,
            date: "2025-07-05",
            tags: ["Demo", "Open"],
            notes: "Initial demo trade for GOOG, still open.",
            confidence: 7,
            imageUrls: [],
            orders: [
              {
                action: "BUY",
                date: "2025-07-05",
                time: "10:00",
                quantity: 5,
                price: 100,
                fee: 0.5,
              },
            ],
          },
          {
            id: "3",
            symbol: "MSFT",
            entryPrice: 300,
            exitPrice: 290,
            quantity: 7,
            type: TradeType.Sell,
            status: "Closed",
            pnl: 70,
            date: "2025-07-08",
            tags: ["Demo", "Closed"],
            notes: "Initial demo trade for MSFT.",
            confidence: 9,
            imageUrls: [],
            orders: [
              {
                action: "SELL",
                date: "2025-07-08",
                time: "11:00",
                quantity: 7,
                price: 300,
                fee: 2.0,
              },
              {
                action: "BUY",
                date: "2025-07-08",
                time: "16:00",
                quantity: 7,
                price: 290,
                fee: 2.0,
              },
            ],
          },
          {
            id: "4",
            symbol: "AMZN",
            entryPrice: 120,
            exitPrice: null,
            quantity: 12,
            type: TradeType.Buy,
            status: "Open",
            pnl: 0,
            date: "2025-07-10",
            tags: ["Demo", "Open"],
            notes: "Initial demo trade for AMZN, still open.",
            confidence: 6,
            imageUrls: [],
            orders: [
              {
                action: "BUY",
                date: "2025-07-10",
                time: "09:45",
                quantity: 12,
                price: 120,
                fee: 1.0,
              },
            ],
          },
          {
            id: "5",
            symbol: "TSLA",
            entryPrice: 250,
            exitPrice: 260,
            quantity: 3,
            type: TradeType.Buy,
            status: "Closed",
            pnl: 30,
            date: "2025-07-11",
            tags: ["Demo", "Closed"],
            notes: "Initial demo trade for TSLA.",
            confidence: 8,
            imageUrls: [],
            orders: [
              {
                action: "BUY",
                date: "2025-07-11",
                time: "13:00",
                quantity: 3,
                price: 250,
                fee: 0.75,
              },
              {
                action: "SELL",
                date: "2025-07-11",
                time: "14:30",
                quantity: 3,
                price: 260,
                fee: 0.75,
              },
            ],
          },
        ];
        for (const trade of initialTrades) {
          await addDoc(tradesCollectionRef, trade);
        }
        setMessage("Initial trades added for demonstration.");
        setShowMessageBox(true);
      }
    };

    checkAndAddInitialTrades();

    const unsubscribeTrades = onSnapshot(
      tradesCollectionRef,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trade[];
        setTrades(fetchedTrades);
      },
      (error) => {
        console.error("Error fetching trades:", error);
        setMessage("Failed to load trades. Please try again.");
        setShowMessageBox(true);
      }
    );

    // Fetch strategies
    const strategiesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/strategies`
    );
    const unsubscribeStrategies = onSnapshot(
      strategiesCollectionRef,
      (snapshot) => {
        const fetchedStrategies: Strategy[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Strategy[];
        setStrategies(fetchedStrategies);
      },
      (error) => {
        console.error("Error fetching strategies:", error);
      }
    );

    return () => {
      unsubscribeTrades();
      unsubscribeStrategies();
    };
  }, [isAuthReady, db, userId]);

  // Apply date filters whenever trades or date range changes
  useEffect(() => {
    let currentFilteredTrades = trades;

    if (startDate) {
      currentFilteredTrades = currentFilteredTrades.filter(
        (trade) => new Date(trade.date) >= new Date(startDate)
      );
    }
    if (endDate) {
      currentFilteredTrades = currentFilteredTrades.filter(
        (trade) => new Date(trade.date) <= new Date(endDate)
      );
    }
    setFilteredTrades(currentFilteredTrades);
  }, [trades, startDate, endDate]);

  // Simulate Live PnL (replace with WebSocket integration)
  useEffect(() => {
    // This is a simulation. In a real app, you'd connect to your WebSocket here.
    const simulateLivePnl = () => {
      const openTrades = trades.filter((trade) => trade.status === "Open");
      let currentPnl = 0;
      openTrades.forEach((trade) => {
        // For simulation, let's assume some random fluctuations for open trades
        // In reality, this would come from your live stock price websocket
        const simulatedLTP =
          trade.entryPrice * (1 + (Math.random() - 0.5) * 0.02); // +/- 2% fluctuation
        currentPnl += (simulatedLTP - trade.entryPrice) * trade.quantity;
      });
      setLivePnl(currentPnl);
    };

    const interval = setInterval(simulateLivePnl, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [trades]); // Recalculate if trades change

  // Handle saving new trade from modal
  const handleSaveNewTrade = async (
    newTradeData: Omit<Trade, "id" | "pnl" | "status">,
    orders: TradeOrder[],
    additionalData: {
      tags: string[];
      notes: string;
      confidence: number;
      imageUrls: string[];
      strategyId: string | null;
    }
  ) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const tradesCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/trades`
      );
      // Calculate initial PnL for new open trade (0)
      const pnl = 0;
      const status = "Open"; // New trades are typically open

      await addDoc(tradesCollectionRef, {
        ...newTradeData,
        pnl,
        status,
        orders,
        ...additionalData,
      });
      setMessage("New trade added successfully!");
      setShowMessageBox(true);
    } catch (error: any) {
      console.error("Error adding new trade:", error);
      setMessage(`Failed to add new trade: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  // Handle importing trades from CSV/Excel - This function is now in AppContent
  // const handleImportTrades = async (importedTrades: Omit<Trade, 'id' | 'pnl' | 'status'>[]) => { ... };

  // Handle updating an existing trade
  const handleUpdateTrade = async (
    tradeId: string,
    updatedData: Partial<Trade>,
    updatedOrders: TradeOrder[]
  ) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const tradeDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/trades`,
        tradeId
      );
      await updateDoc(tradeDocRef, { ...updatedData, orders: updatedOrders });
      setMessage("Trade updated successfully!");
      setShowMessageBox(true);
    } catch (error: any) {
      console.error("Error updating trade:", error);
      setMessage(`Failed to update trade: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  // Handle deleting a trade
  const handleDeleteTrade = async (tradeId: string) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const tradeDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/trades`,
        tradeId
      );
      await deleteDoc(tradeDocRef);
      setMessage("Trade deleted successfully!");
      setShowMessageBox(true);
    } catch (error: any) {
      setMessage(`Failed to delete trade: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  // Function to open Trade View Modal
  const openTradeViewModal = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsTradeViewModalOpen(true);
  };

  // Calculate statistics
  const wins = filteredTrades.filter(
    (t) => t.status === "Closed" && t.pnl > 0
  ).length;
  const losses = filteredTrades.filter(
    (t) => t.status === "Closed" && t.pnl < 0
  ).length;
  const openTradesCount = filteredTrades.filter(
    (t) => t.status === "Open"
  ).length;
  const closedTradesCount = filteredTrades.filter(
    (t) => t.status === "Closed"
  ).length;

  const totalProfit = filteredTrades
    .filter((t) => t.status === "Closed" && t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = filteredTrades
    .filter((t) => t.status === "Closed" && t.pnl < 0)
    .reduce((sum, t) => sum + Math.abs(t.pnl), 0);

  const avgProfit = wins > 0 ? totalProfit / wins : 0;
  const avgLoss = losses > 0 ? totalLoss / losses : 0;

  // Calculate overall PnL for closed trades
  const overallClosedPnl = filteredTrades
    .filter((t) => t.status === "Closed")
    .reduce((sum, t) => sum + t.pnl, 0);

  // Calculate average win and average loss percentage
  const avgWinPercentage = wins > 0 ? (totalProfit / totalProfit) * 100 : 0; // Simplified for demo
  const avgLossPercentage = losses > 0 ? (totalLoss / totalLoss) * 100 : 0; // Simplified for demo

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
      {/* Header and Account Info */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <div className="text-blue-400 text-4xl font-extrabold">₹</div>
          <div>
            <p className="text-xl font-semibold">Default Account</p>
            <p className="text-3xl font-bold text-green-500">
              ₹{livePnl.toFixed(2)}
            </p>
            <p className="text-sm text-gray-400">Cash: ₹2,40,015.00</p>
            <p className="text-sm text-gray-400">Active: ₹2,34,200.00</p>
          </div>
        </div>
        <div className="flex space-x-4">
          {/* Date Filters */}
          <div className="flex items-center space-x-2">
            <label htmlFor="startDate" className="text-sm text-gray-400">
              From:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="endDate" className="text-sm text-gray-400">
              To:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <p className="text-md font-semibold text-gray-400">WINS</p>
            <p className="text-2xl font-bold text-green-500">{wins}</p>
          </div>
          <div className="text-right">
            <p className="text-md font-semibold text-gray-400">AVG W</p>
            <p className="text-2xl font-bold text-green-500">
              ₹{avgProfit.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <p className="text-md font-semibold text-gray-400">LOSSES</p>
            <p className="text-2xl font-bold text-red-500">{losses}</p>
          </div>
          <div className="text-right">
            <p className="text-md font-semibold text-gray-400">AVG L</p>
            <p className="text-2xl font-bold text-red-500">
              ₹{avgLoss.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <p className="text-md font-semibold text-gray-400">OPEN</p>
            <p className="text-2xl font-bold text-yellow-500">
              {openTradesCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-md font-semibold text-gray-400">CLOSED</p>
            <p className="text-2xl font-bold text-blue-500">
              {closedTradesCount}
            </p>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <p className="text-md font-semibold text-gray-400">PnL</p>
            <p
              className={`text-2xl font-bold ${
                overallClosedPnl >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              ₹{overallClosedPnl.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-md font-semibold text-gray-400">PnL %</p>
            <p
              className={`text-2xl font-bold ${
                overallClosedPnl >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {(
                (overallClosedPnl / (totalProfit + totalLoss || 1)) *
                100
              ).toFixed(2)}
              % {/* Simplified PnL % */}
            </p>
          </div>
        </div>
      </div>

      {/* New Trade Button */}
      <div className="mb-8 flex justify-center">
        <button
          onClick={() => setIsNewTradeModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-lg font-semibold shadow-lg"
        >
          + New Trade
        </button>
      </div>

      {/* All Trades Table */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-200 mb-4">All Trades</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Open Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Exit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ent Tot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ext Tot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Pos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Hold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Return
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Return %
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-6 py-4 whitespace-nowrap text-center text-gray-500"
                  >
                    No trades found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="hover:bg-gray-700 transition duration-150 cursor-pointer"
                    onClick={() => openTradeViewModal(trade)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trade.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-400">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.status === "Open"
                            ? "bg-yellow-600 text-white"
                            : "bg-green-600 text-white"
                        }`}
                      >
                        {trade.status === "Open" ? "● OPEN" : "● CLOSED"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trade.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trade.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ₹{trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trade.exitPrice
                        ? `₹${trade.exitPrice.toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ₹{(trade.entryPrice * trade.quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trade.exitPrice
                        ? `₹${(trade.exitPrice * trade.quantity).toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trade.status === "Open" ? trade.quantity : 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {/* Placeholder for Hold Days */}
                      {trade.status === "Closed"
                        ? `${Math.floor(Math.random() * 30) + 1} DAYS`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`font-semibold ${
                          trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        ₹{trade.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`font-semibold ${
                          trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {(
                          (trade.pnl /
                            (trade.entryPrice * trade.quantity || 1)) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isNewTradeModalOpen && (
        <NewTradeModal
          isOpen={isNewTradeModalOpen}
          onClose={() => setIsNewTradeModalOpen(false)}
          onSave={handleSaveNewTrade}
          strategies={strategies} // Pass strategies to NewTradeModal
        />
      )}

      {isNewSetupModalOpen && (
        <NewSetupModal
          isOpen={isNewSetupModalOpen}
          onClose={() => setIsNewSetupModalOpen(false)}
          onImportTrades={async (trades) => {
            setMessage(
              "Import functionality is handled at the AppContent level."
            );
            setShowMessageBox(true);
          }}
        />
      )}

      {isNewNoteModalOpen && (
        <NewNoteModal
          isOpen={isNewNoteModalOpen}
          onClose={() => setIsNewNoteModalOpen(false)}
        />
      )}

      {isTradeViewModalOpen && selectedTrade && (
        <TradeViewModal
          isOpen={isTradeViewModalOpen}
          onClose={() => setIsTradeViewModalOpen(false)}
          trade={selectedTrade}
          onUpdateTrade={handleUpdateTrade}
          onDeleteTrade={handleDeleteTrade}
          strategies={strategies} // Pass strategies to TradeViewModal
        />
      )}

      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Stats Component ---
const Stats: React.FC = () => {
  const { userId, db, isAuthReady } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const tradesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/trades`
    );

    const unsubscribe = onSnapshot(
      tradesCollectionRef,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trade[];
        setTrades(fetchedTrades);
      },
      (error) => {
        console.error("Error fetching trades for stats:", error);
        setMessage("Failed to load trade data for stats. Please try again.");
        setShowMessageBox(true);
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, db, userId]);

  // Filter for closed trades for most stats calculations
  const closedTrades = trades.filter((trade) => trade.status === "Closed");
  const winningTrades = closedTrades.filter((trade) => trade.pnl > 0);
  const losingTrades = closedTrades.filter((trade) => trade.pnl < 0);

  const totalClosedPnl = closedTrades.reduce(
    (sum, trade) => sum + trade.pnl,
    0
  );
  const totalWinningPnl = winningTrades.reduce(
    (sum, trade) => sum + trade.pnl,
    0
  );
  const totalLosingPnl = losingTrades.reduce(
    (sum, trade) => sum + trade.pnl,
    0
  );

  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;
  const avgWin =
    winningTrades.length > 0 ? totalWinningPnl / winningTrades.length : 0;
  const avgLoss =
    losingTrades.length > 0 ? totalLosingPnl / losingTrades.length : 0;

  // Expectancy: (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const lossRate =
    closedTrades.length > 0 ? losingTrades.length / closedTrades.length : 0;
  const expectancy = (winRate / 100) * avgWin + lossRate * avgLoss; // avgLoss is already negative, so add it.

  // Profit Factor: Total Gross Profit / Total Gross Loss
  const profitFactor =
    totalLosingPnl !== 0
      ? Math.abs(totalWinningPnl / totalLosingPnl)
      : totalWinningPnl > 0
      ? Infinity
      : 0;

  // Win Streak / Loss Streak (simplified for demo, would require sorting by date and iterating)
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  // Sort trades by date to calculate streaks correctly
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const trade of sortedTrades) {
    if (trade.status === "Closed") {
      if (trade.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
      } else if (trade.pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
      }
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  }

  // Top Win / Top Loss
  const topWin =
    winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0;
  const topLoss =
    losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0;

  // Avg Daily Vol (placeholder)
  const avgDailyVol = "701"; // Placeholder

  // Avg Size (placeholder)
  const avgSize = "701"; // Placeholder

  // --- Chart Data Calculations ---

  // Equity Curve Data
  const equityCurveData = sortedTrades.reduce((acc, trade) => {
    const lastPnl = acc.length > 0 ? acc[acc.length - 1].cumulativePnl : 0;
    const cumulativePnl = lastPnl + trade.pnl;
    acc.push({ date: trade.date, cumulativePnl });
    return acc;
  }, [] as { date: string; cumulativePnl: number }[]);

  // Performance by Day of Week Data
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const pnlByDayOfWeek = daysOfWeek.map((day) => ({ name: day, pnl: 0 }));

  closedTrades.forEach((trade) => {
    const dayIndex = new Date(trade.date).getDay();
    pnlByDayOfWeek[dayIndex].pnl += trade.pnl;
  });

  // Performance by Hour Data
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23
  const pnlByHour = hours.map((hour) => ({ name: `${hour}:00`, pnl: 0 }));

  closedTrades.forEach((trade) => {
    // For simplicity, we'll use the entry time of the first order if available, otherwise just the current hour.
    const tradeHour =
      trade.orders && trade.orders.length > 0
        ? parseInt(trade.orders[0].time.substring(0, 2))
        : new Date(`${trade.date}T00:00:00`).getHours(); // Default to 00:00 if no order time

    if (!isNaN(tradeHour) && tradeHour >= 0 && tradeHour < 24) {
      pnlByHour[tradeHour].pnl += trade.pnl;
    }
  });

  // Group trades by tag and symbol for tables
  const performanceByTag: {
    [key: string]: { trades: number; pnl: number; weightedPnl: number };
  } = {};
  const performanceBySymbol: {
    [key: string]: { trades: number; pnl: number; weightedPnl: number };
  } = {};

  trades.forEach((trade) => {
    // By Tag
    const tagsToProcess =
      trade.tags && trade.tags.length > 0 ? trade.tags : ["NO TAGS"];
    tagsToProcess.forEach((tag) => {
      if (!performanceByTag[tag]) {
        performanceByTag[tag] = { trades: 0, pnl: 0, weightedPnl: 0 };
      }
      performanceByTag[tag].trades++;
      performanceByTag[tag].pnl += trade.pnl;
      // Weighted PnL calculation (simplified: PnL / quantity for now)
      performanceByTag[tag].weightedPnl += trade.pnl / (trade.quantity || 1);
    });

    // By Symbol
    if (!performanceBySymbol[trade.symbol]) {
      performanceBySymbol[trade.symbol] = { trades: 0, pnl: 0, weightedPnl: 0 };
    }
    performanceBySymbol[trade.symbol].trades++;
    performanceBySymbol[trade.symbol].pnl += trade.pnl;
    performanceBySymbol[trade.symbol].weightedPnl +=
      trade.pnl / (trade.quantity || 1);
  });

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
      <h1 className="text-4xl font-extrabold mb-8 text-center">
        Trade Statistics
      </h1>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">WIN RATE</p>
          <p className="text-2xl font-bold text-blue-400">
            {winRate.toFixed(2)}%
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">EXPECTANCY</p>
          <p className="text-2xl font-bold text-yellow-400">
            {expectancy.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">PROFIT FACTOR</p>
          <p className="text-2xl font-bold text-green-400">
            {profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">AVG WIN HOLD</p>
          <p className="text-2xl font-bold text-blue-400">50.0 Days</p>{" "}
          {/* Placeholder */}
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">AVG LOSS HOLD</p>
          <p className="text-2xl font-bold text-red-400">4.5 Days</p>{" "}
          {/* Placeholder */}
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">AVG LOSS</p>
          <p className="text-2xl font-bold text-red-400">
            ₹{avgLoss.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">AVG WIN</p>
          <p className="text-2xl font-bold text-green-400">
            ₹{avgWin.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">WIN STREAK</p>
          <p className="text-2xl font-bold text-green-400">{maxWinStreak}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">LOSS STREAK</p>
          <p className="text-2xl font-bold text-red-400">{maxLossStreak}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">TOP WIN</p>
          <p className="text-2xl font-bold text-green-400">
            ₹{topWin.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">TOP LOSS</p>
          <p className="text-2xl font-bold text-red-400">
            ₹{topLoss.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">AVG DAILY VOL</p>
          <p className="text-2xl font-bold text-blue-400">{avgDailyVol}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
          <p className="text-sm text-gray-400">AVG SIZE</p>
          <p className="text-2xl font-bold text-blue-400">{avgSize}</p>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-bold text-gray-200 mb-4">Equity Curve</h2>
        <div className="h-64 bg-gray-700 rounded-md flex items-center justify-center text-gray-400">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={equityCurveData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
              <XAxis
                dataKey="date"
                stroke="#cbd5e0"
                tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
              />
              <YAxis stroke="#cbd5e0" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#2d3748",
                  border: "none",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#a0aec0" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={(value: number) => `₹${value.toFixed(2)}`}
              />
              <Line
                type="monotone"
                dataKey="cumulativePnl"
                stroke="#63b3ed"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance by Day of Week & Hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Performance by Day of Week
          </h2>
          <div className="h-48 bg-gray-700 rounded-md flex items-center justify-center text-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pnlByDayOfWeek}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#cbd5e0" />
                <YAxis stroke="#cbd5e0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2d3748",
                    border: "none",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#a0aec0" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(value: number) => `₹${value.toFixed(2)}`}
                />
                <Bar dataKey="pnl" fill="#63b3ed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Performance by Hour
          </h2>
          <div className="h-48 bg-gray-700 rounded-md flex items-center justify-center text-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pnlByHour}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#cbd5e0" />
                <YAxis stroke="#cbd5e0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2d3748",
                    border: "none",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#a0aec0" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(value: number) => `₹${value.toFixed(2)}`}
                />
                <Bar dataKey="pnl" fill="#9f7aea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Performance by Tag
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    PnL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Weighted %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {Object.entries(performanceByTag).map(([tag, data]) => (
                  <tr key={tag}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {tag}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {data.trades}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ₹{data.pnl.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {(data.weightedPnl * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Performance by Symbol
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    PnL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Weighted %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {Object.entries(performanceBySymbol).map(([symbol, data]) => (
                  <tr key={symbol}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {data.trades}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ₹{data.pnl.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {(data.weightedPnl * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Reports Component ---
interface ReportsProps {
  onImportTrades: (
    trades: Omit<Trade, "id" | "pnl" | "status">[]
  ) => Promise<void>;
}

const Reports: React.FC<ReportsProps> = ({ onImportTrades }) => {
  const { userId, db, isAuthReady } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isConfirmImportModalOpen, setIsConfirmImportModalOpen] =
    useState(false);

  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const tradesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/trades`
    );

    const unsubscribe = onSnapshot(
      tradesCollectionRef,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trade[];
        setTrades(fetchedTrades);
      },
      (error) => {
        console.error("Error fetching trades for reports:", error);
        setMessage("Failed to load trades for reports. Please try again.");
        setShowMessageBox(true);
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, db, userId]);

  const convertToCSV = (data: Trade[]) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((trade) =>
      Object.values(trade)
        .map((value) => {
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`; // Enclose strings with commas in quotes
          }
          return value;
        })
        .join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const handleExportTrades = () => {
    const csv = convertToCSV(trades);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "trades.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage("Trades exported successfully as trades.csv!");
    setShowMessageBox(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedData(null); // Reset parsed data on new file selection
      setMessage("");
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row: ${lines[i]}`);
        continue;
      }
      const row: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        let value: any = values[index];
        // Attempt to convert to number if possible
        if (!isNaN(Number(value)) && value.trim() !== "") {
          value = Number(value);
        }
        row[header] = value;
      });
      data.push(row);
    }
    return data;
  };

  const handlePreviewImport = () => {
    if (!file) {
      setMessage("Please select a CSV file to import.");
      setShowMessageBox(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const data = parseCSV(text);
        setParsedData(data);
        setIsConfirmImportModalOpen(true); // Open the confirmation modal
      } catch (error: any) {
        console.error("Error parsing CSV:", error);
        setMessage(`Failed to parse CSV: ${error.message}`);
        setShowMessageBox(true);
      }
    };
    reader.onerror = () => {
      setMessage("Failed to read file.");
      setShowMessageBox(true);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!parsedData) return;

    // Map parsed data to Trade interface, handling potential missing fields
    const validTrades: Omit<Trade, "id" | "pnl" | "status">[] = parsedData.map(
      (row) => ({
        symbol: row.symbol || "UNKNOWN",
        entryPrice: parseFloat(row.entryPrice) || 0,
        exitPrice: row.exitPrice ? parseFloat(row.exitPrice) : null,
        quantity: parseInt(row.quantity) || 0,
        type: row.type === "Buy" ? TradeType.Buy : TradeType.Sell,
        date: row.date || new Date().toISOString().slice(0, 10),
        market: row.market || "FUTURES",
        target: row.target ? parseFloat(row.target) : undefined,
        stopLoss: row.stopLoss ? parseFloat(row.stopLoss) : undefined,
        tags: row.tags
          ? String(row.tags)
              .split(",")
              .map((tag: string) => tag.trim())
          : [],
        notes: row.notes || "",
        confidence: row.confidence ? parseInt(row.confidence) : 5,
        imageUrls: row.imageUrls
          ? String(row.imageUrls)
              .split(",")
              .map((url: string) => url.trim())
          : [],
        // Assuming 'orders' would need more complex parsing if present in CSV
        orders: [], // Initialize orders as empty array for imported trades
      })
    );

    try {
      await onImportTrades(validTrades); // Use the passed-down import function
      setMessage(
        `${validTrades.length} trades processed and imported successfully!`
      );
      setShowMessageBox(true);
      setFile(null);
      setParsedData(null);
      setIsConfirmImportModalOpen(false);
    } catch (error: any) {
      console.error("Error processing imported trades:", error);
      setMessage(`Failed to process imported trades: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
      <h1 className="text-4xl font-extrabold mb-8 text-center">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Export Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Export Trades
          </h2>
          <p className="text-gray-300 mb-6">
            Download all your recorded trades as a CSV file.
          </p>
          <button
            onClick={handleExportTrades}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 text-lg font-semibold shadow-lg"
          >
            Export All Trades (CSV)
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Import Trades
          </h2>
          <p className="text-gray-300 mb-4">
            Upload a CSV file to import trades into your journal.
          </p>
          <div className="mb-4">
            <label
              htmlFor="import-file-upload"
              className="block text-gray-300 text-sm font-bold mb-2"
            >
              Select CSV File
            </label>
            <input
              type="file"
              id="import-file-upload"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-300
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-500 file:text-white
                         hover:file:bg-blue-600"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-400">
                Selected file: {file.name}
              </p>
            )}
          </div>
          <button
            onClick={handlePreviewImport}
            disabled={!file}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview & Import
          </button>
        </div>
      </div>

      {isConfirmImportModalOpen && parsedData && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Confirm Import</h2>
              <button
                onClick={() => setIsConfirmImportModalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <p className="mb-4 text-gray-300">
              Review the parsed data before importing:
            </p>
            <div className="overflow-x-auto mb-6 max-h-64">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    {Object.keys(parsedData[0] || {}).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {parsedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-700">
                      {Object.values(row).map((value, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-4 py-2 whitespace-nowrap text-sm text-gray-300"
                        >
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsConfirmImportModalOpen(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessImport}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Process Import ({parsedData.length} trades)
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Calendar Component ---
interface CalendarProps {
  trades: Trade[]; // Pass trades to the calendar component
}

const Calendar: React.FC<CalendarProps> = ({ trades }) => {
  const [currentDate, setCurrentDate] = useState(new Date()); // State for current month/year
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  // Group trades by date for easy lookup
  const tradesByDate: { [key: string]: { count: number; pnl: number } } = {};
  trades.forEach((trade) => {
    const tradeDate = trade.date; // Assuming trade.date is 'YYYY-MM-DD'
    if (!tradesByDate[tradeDate]) {
      tradesByDate[tradeDate] = { count: 0, pnl: 0 };
    }
    tradesByDate[tradeDate].count++;
    tradesByDate[tradeDate].pnl += trade.pnl;
  });

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // Day of week for the 1st of the month

    const calendarDays: JSX.Element[] = [];

    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div
          key={`empty-${i}`}
          className="p-2 border border-gray-700 bg-gray-800 text-gray-600"
        ></div>
      );
    }

    // Fill days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const dayTrades = tradesByDate[fullDate];
      const hasTrades = !!dayTrades;
      const pnl = hasTrades ? dayTrades.pnl : 0;

      calendarDays.push(
        <div
          key={day}
          className={`p-2 border border-gray-700 flex flex-col items-start justify-start h-28 relative ${
            hasTrades
              ? "bg-gray-700 hover:bg-gray-600 cursor-pointer"
              : "bg-gray-800"
          }`}
        >
          <span className="text-sm font-semibold text-gray-300">{day}</span>
          {hasTrades && (
            <div className="mt-2 text-xs">
              <p className="text-gray-400">
                {dayTrades.count} Trade{dayTrades.count > 1 ? "s" : ""}
              </p>
              <p className={`${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                ₹{pnl.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Fill trailing empty days to complete the last week
    const totalCells = calendarDays.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days = 42 cells total for a full calendar
    for (let i = 0; i < remainingCells; i++) {
      calendarDays.push(
        <div
          key={`empty-trailing-${i}`}
          className="p-2 border border-gray-700 bg-gray-800 text-gray-600"
        ></div>
      );
    }

    return calendarDays;
  };

  const goToPreviousMonth = () => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(
        prevDate.getFullYear(),
        prevDate.getMonth() - 1,
        1
      );
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(
        prevDate.getFullYear(),
        prevDate.getMonth() + 1,
        1
      );
      return newDate;
    });
  };

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100 flex">
      {/* Main Calendar Content */}
      <div className="flex-grow bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>
          <h2 className="text-3xl font-bold text-gray-100">
            {getMonthName(currentDate)}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-px mb-px bg-gray-700 rounded-t-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-semibold text-gray-400 bg-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-700 rounded-b-lg overflow-hidden">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Weekly Summary Sidebar */}
      <div className="w-80 ml-6 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold text-gray-200 mb-4">
          Weekly Summary
        </h3>
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-md">
            <p className="text-gray-400 text-sm">Total PnL (This Week)</p>
            <p className="text-xl font-bold text-green-400">₹1,234.56</p>{" "}
            {/* Placeholder */}
          </div>
          <div className="bg-gray-700 p-4 rounded-md">
            <p className="text-gray-400 text-sm">Trades (This Week)</p>
            <p className="text-xl font-bold text-blue-400">7</p>{" "}
            {/* Placeholder */}
          </div>
          <div className="bg-gray-700 p-4 rounded-md">
            <p className="text-gray-400 text-sm">Win Rate (This Week)</p>
            <p className="text-xl font-bold text-yellow-400">65%</p>{" "}
            {/* Placeholder */}
          </div>
        </div>
      </div>

      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Strategies Component ---
const Strategies: React.FC = () => {
  const { userId, db, isAuthReady } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]); // To pass to StrategyViewModal for linked trades
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isNewStrategyModalOpen, setIsNewStrategyModalOpen] = useState(false);
  const [isStrategyViewModalOpen, setIsStrategyViewModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );

  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const strategiesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/strategies`
    );
    const tradesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/trades`
    );

    const unsubscribeStrategies = onSnapshot(
      strategiesCollectionRef,
      (snapshot) => {
        const fetchedStrategies: Strategy[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Strategy[];
        setStrategies(fetchedStrategies);
      },
      (error) => {
        console.error("Error fetching strategies:", error);
        setMessage("Failed to load strategies. Please try again.");
        setShowMessageBox(true);
      }
    );

    const unsubscribeTrades = onSnapshot(
      tradesCollectionRef,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trade[];
        setTrades(fetchedTrades);
      },
      (error) => {
        console.error("Error fetching trades for strategies:", error);
      }
    );

    return () => {
      unsubscribeStrategies();
      unsubscribeTrades();
    };
  }, [isAuthReady, db, userId]);

  const handleSaveNewStrategy = async (
    newStrategyData: Omit<Strategy, "id">
  ) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const strategiesCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/strategies`
      );
      await addDoc(strategiesCollectionRef, newStrategyData);
      setMessage("New strategy added successfully!");
      setShowMessageBox(true);
      setIsNewStrategyModalOpen(false);
    } catch (error: any) {
      console.error("Error adding new strategy:", error);
      setMessage(`Failed to add new strategy: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const handleUpdateStrategy = async (
    strategyId: string,
    updatedData: Partial<Strategy>
  ) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const strategyDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/strategies`,
        strategyId
      );
      await updateDoc(strategyDocRef, updatedData);
      setMessage("Strategy updated successfully!");
      setShowMessageBox(true);
      setIsStrategyViewModalOpen(false); // Close modal after update
    } catch (error: any) {
      console.error("Error updating strategy:", error);
      setMessage(`Failed to update strategy: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const strategyDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/strategies`,
        strategyId
      );
      await deleteDoc(strategyDocRef);

      // Also, unlink this strategy from any trades
      const tradesToUpdate = trades.filter(
        (trade) => trade.strategyId === strategyId
      );
      for (const trade of tradesToUpdate) {
        const tradeDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/trades`,
          trade.id
        );
        await updateDoc(tradeDocRef, { strategyId: null });
      }

      setMessage("Strategy deleted successfully!");
      setShowMessageBox(true);
      setIsStrategyViewModalOpen(false); // Close modal after delete
    } catch (error: any) {
      console.error("Error deleting strategy:", error);
      setMessage(`Failed to delete strategy: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const openStrategyViewModal = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setIsStrategyViewModalOpen(true);
  };

  return (
    <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
      <h1 className="text-4xl font-extrabold mb-8 text-center">Strategies</h1>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-bold text-gray-200 mb-4">
          Your Trading Strategies
        </h2>
        <p className="text-gray-300 mb-4">
          This section is where you can define, track, and analyze your various
          trading strategies. Document your entry and exit criteria, risk
          management rules, and performance metrics for each strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy) => {
          const linkedTradesCount = trades.filter(
            (trade) => trade.strategyId === strategy.id
          ).length;
          const strategyPnl = trades
            .filter((trade) => trade.strategyId === strategy.id)
            .reduce((sum, trade) => sum + trade.pnl, 0);

          return (
            <div
              key={strategy.id}
              className="bg-gray-700 p-6 rounded-lg shadow-md hover:bg-gray-600 transition duration-200 cursor-pointer flex flex-col justify-between"
              onClick={() => openStrategyViewModal(strategy)}
            >
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">
                  {strategy.name}
                </h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  {strategy.description || "No description provided."}
                </p>
              </div>
              <div className="text-gray-400 text-sm">
                <p>
                  <strong>Trades:</strong> {linkedTradesCount}
                </p>
                <p>
                  <strong>Total PnL:</strong>{" "}
                  <span
                    className={`${
                      strategyPnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ₹{strategyPnl.toFixed(2)}
                  </span>
                </p>
                {/* Add more summary stats here if available */}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openStrategyViewModal(strategy);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-sm self-start"
              >
                View Details
              </button>
            </div>
          );
        })}

        {/* Add New Strategy Card */}
        <div
          className="bg-gray-700 p-6 rounded-lg shadow-md flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-600 cursor-pointer hover:bg-gray-600 transition duration-200"
          onClick={() => setIsNewStrategyModalOpen(true)}
        >
          <button className="text-blue-400 hover:text-blue-300 transition duration-200">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
          </button>
          <p className="text-gray-300 text-lg font-semibold">
            Add New Strategy
          </p>
        </div>
      </div>

      {isNewStrategyModalOpen && (
        <NewStrategyModal
          isOpen={isNewStrategyModalOpen}
          onClose={() => setIsNewStrategyModalOpen(false)}
          onSave={handleSaveNewStrategy}
        />
      )}

      {isStrategyViewModalOpen && selectedStrategy && (
        <StrategyViewModal
          isOpen={isStrategyViewModalOpen}
          onClose={() => setIsStrategyViewModalOpen(false)}
          strategy={selectedStrategy}
          trades={trades}
          onUpdateStrategy={handleUpdateStrategy}
          onDeleteStrategy={handleDeleteStrategy}
        />
      )}

      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Sidebar Component ---
interface SidebarProps {
  onNavigate: (page: string) => void;
  onNewTrade: () => void;
  onNewSetup: () => void;
  onNewNote: () => void;
  onSignOut: () => void;
  currentPage: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  onNewTrade,
  onNewSetup,
  onNewNote,
  onSignOut,
  currentPage,
}) => {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col p-4 shadow-lg min-h-screen">
      <div className="flex items-center mb-6">
        <img
          src="logo.jpg"
          alt="Quant Vedas Logo"
          className="h-10 w-10 mr-2 rounded-full"
          onError={(e) =>
            (e.currentTarget.src =
              "https://placehold.co/40x40/FF0000/FFFFFF?text=Error")
          }
        />
        <span className="text-2xl font-bold">Stonk Journal</span>
      </div>

      {/* Account Info - Similar to dashboard header */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md">
        <p className="text-sm text-gray-400">Default Account</p>
        <p className="text-xl font-bold text-green-500">₹-5,815.00</p>{" "}
        {/* Placeholder value */}
        <p className="text-xs text-gray-400">Cash: ₹2,40,015.00</p>{" "}
        {/* Placeholder value */}
        <p className="text-xs text-gray-400">Active: ₹2,34,200.00</p>{" "}
        {/* Placeholder value */}
      </div>

      {/* Main Navigation */}
      <nav className="flex-grow">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => onNavigate("dashboard")}
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "dashboard"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2 2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                ></path>
              </svg>
              Dashboard
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate("stats")}
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "stats"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z"
                ></path>
              </svg>
              Stats
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate("reports")} // New Reports button
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "reports"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              Reports
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate("calendar")}
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "calendar"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              Calendar
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate("strategies")} // New Strategies button
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "strategies"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                ></path>
              </svg>
              Strategies
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate("settings")}
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "settings"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.827-3.31 2.37-2.37.568.356 1.153.535 1.724.535z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
              Settings
            </button>
          </li>
          <li>
            <button
              onClick={() => onNavigate("help")}
              className={`flex items-center w-full px-4 py-2 rounded-md transition duration-200 ${
                currentPage === "help"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.228 9.228a4.5 4.5 0 117.542 0M15 14H9m6 6h-6"
                ></path>
              </svg>
              Help
            </button>
          </li>
        </ul>
      </nav>

      {/* Action Buttons */}
      <div className="mt-auto space-y-3 pt-6 border-t border-gray-700">
        <button
          onClick={onNewTrade}
          className="flex items-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 font-semibold"
        >
          <svg
            className="w-5 h-5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
          New Trade
        </button>
        <button
          onClick={onNewSetup}
          className="flex items-center w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 font-semibold"
        >
          <svg
            className="w-5 h-5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.827-3.31 2.37-2.37.568.356 1.153.535 1.724.535z"
            ></path>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
          New Setup
        </button>
        <button
          onClick={onNewNote}
          className="flex items-center w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition duration-200 font-semibold"
        >
          <svg
            className="w-5 h-5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.232z"
            ></path>
          </svg>
          New Note
        </button>
        <button
          onClick={onSignOut}
          className="flex items-center w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 font-semibold"
        >
          <svg
            className="w-5 h-5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            ></path>
          </svg>
          Sign Out
        </button>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        <p>
          Support this free platform with a{" "}
          <a href="#" className="text-blue-400 hover:underline">
            donation
          </a>{" "}
          or{" "}
          <a href="#" className="text-blue-400 hover:underline">
            membership
          </a>
          .
        </p>
        <div className="mt-2">
          {/* Placeholder for small icon/logo */}
          <svg
            className="w-6 h-6 mx-auto text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535A4 4 0 0010 13a4 4 0 00-3.536 2.465l-.723-.723A5 5 0 0110 12c1.49 0 2.84.653 3.757 1.772l-.721.721z"
              clipRule="evenodd"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
};

// --- UserProfile Interface and Profile Component (as provided by user) ---
interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  // Add other profile fields as needed
}

const Profile: React.FC = () => {
  const { currentUser, userId, db, isAuthReady } = useAuth();
  const [activeSection, setActiveSection] = useState("personalInfo");
  const [profile, setProfile] = useState<UserProfile>({
    displayName: currentUser?.displayName || "",
    email: currentUser?.email || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const userDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/profile/data`
    );

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // If no profile exists, create a basic one
          setDoc(userDocRef, {
            displayName: currentUser?.displayName || "New User",
            email: currentUser?.email || "email@example.com",
            phoneNumber: "",
            address: "",
          });
        }
      },
      (error) => {
        console.error("Error fetching profile:", error);
        setMessage("Failed to load profile. Please try again.");
        setShowMessageBox(true);
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, db, userId, currentUser]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const userDocRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/profile/data`
      );
      await setDoc(userDocRef, profile, { merge: true });
      setMessage("Profile updated successfully!");
      setShowMessageBox(true);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setMessage(`Failed to save profile: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "personalInfo":
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={profile.displayName}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    isEditing ? "bg-white" : "bg-gray-100"
                  } focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  readOnly={true} // Email usually not editable directly here
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={profile.phoneNumber || ""}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    isEditing ? "bg-white" : "bg-gray-100"
                  } focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={profile.address || ""}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                  className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                    isEditing ? "bg-white" : "bg-gray-100"
                  } focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        );
      case "accountSettings":
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Account Settings
            </h3>
            <p className="text-gray-600">
              Manage your account preferences and integrations here.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md shadow-sm">
                <span className="text-gray-700">
                  Receive Email Notifications
                </span>
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-blue-600 rounded"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md shadow-sm">
                <span className="text-gray-700">
                  Connect to Brokerage (Placeholder)
                </span>
                <button className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  Connect
                </button>
              </div>
            </div>
          </div>
        );
      case "passwordSecurity":
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Password & Security
            </h3>
            <p className="text-gray-600">
              Update your password and review security settings.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200">
                Change Password
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen rounded-lg shadow-inner">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">
        Profile Settings
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/4 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sections</h2>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveSection("personalInfo")}
                className={`w-full text-left px-4 py-2 rounded-md transition duration-200 ${
                  activeSection === "personalInfo"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Personal Info
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("accountSettings")}
                className={`w-full text-left px-4 py-2 rounded-md transition duration-200 ${
                  activeSection === "accountSettings"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Account Settings
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("passwordSecurity")}
                className={`w-full text-left px-4 py-2 rounded-md transition duration-200 ${
                  activeSection === "passwordSecurity"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Password & Security
              </button>
            </li>
          </ul>
          {currentUser && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md text-sm text-gray-600">
              <p>
                <strong>User ID:</strong>
              </p>
              <p className="break-all">{userId}</p>
            </div>
          )}
        </div>
        <div className="md:w-3/4 bg-white p-6 rounded-lg shadow-md">
          {renderSection()}
        </div>
      </div>
      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// --- Main App Component ---
// Renamed the original App to AppContent to be wrapped by AuthProvider
const AppContent: React.FC = () => {
  const { currentUser, isAuthReady, signOutUser, userId, db } = useAuth(); // Added userId, db
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [message, setMessage] = useState("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isNewTradeModalOpen, setIsNewTradeModalOpen] = useState(false);
  const [isNewSetupModalOpen, setIsNewSetupModalOpen] = useState(false);
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]); // State to hold trades for Calendar and Strategies
  const [strategies, setStrategies] = useState<Strategy[]>([]); // State to hold strategies

  // Fetch trades and strategies for components that need them
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const tradesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/trades`
    );
    const strategiesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/strategies`
    );

    const unsubscribeTrades = onSnapshot(
      tradesCollectionRef,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trade[];
        setTrades(fetchedTrades);
      },
      (error) => {
        console.error("Error fetching trades for AppContent:", error);
        setMessage("Failed to load trades. Please try again.");
        setShowMessageBox(true);
      }
    );

    const unsubscribeStrategies = onSnapshot(
      strategiesCollectionRef,
      (snapshot) => {
        const fetchedStrategies: Strategy[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Strategy[];
        setStrategies(fetchedStrategies);
      },
      (error) => {
        console.error("Error fetching strategies for AppContent:", error);
      }
    );

    return () => {
      unsubscribeTrades();
      unsubscribeStrategies();
    };
  }, [isAuthReady, db, userId]);

  // Initialize currentPage based on URL path
  useEffect(() => {
    const path = window.location.pathname.substring(1); // Remove leading slash
    if (
      path &&
      [
        "dashboard",
        "stats",
        "calendar",
        "settings",
        "help",
        "profile",
        "reports",
        "strategies",
      ].includes(path)
    ) {
      setCurrentPage(path);
    } else {
      setCurrentPage("dashboard");
      window.history.replaceState(null, "", "/dashboard"); // Set default URL
    }
  }, []);

  // Update URL when currentPage changes
  useEffect(() => {
    if (isAuthReady) {
      const newPath = `/${currentPage}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, "", newPath);
      }
    }
  }, [currentPage, isAuthReady]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1);
      if (
        path &&
        [
          "dashboard",
          "stats",
          "calendar",
          "settings",
          "help",
          "profile",
          "reports",
          "strategies",
        ].includes(path)
      ) {
        setCurrentPage(path);
      } else {
        setCurrentPage("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Default to dashboard if authenticated, otherwise auth page
  useEffect(() => {
    if (isAuthReady) {
      if (currentUser) {
        // If already on a valid page from URL, don't override
        if (
          ![
            "dashboard",
            "stats",
            "calendar",
            "settings",
            "help",
            "profile",
            "reports",
            "strategies",
          ].includes(currentPage)
        ) {
          setCurrentPage("dashboard");
        }
      } else {
        setCurrentPage("auth");
      }
    }
  }, [isAuthReady, currentUser]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setMessage("You have been signed out.");
      setShowMessageBox(true);
      setCurrentPage("auth"); // Redirect to auth page after sign out
      window.history.pushState(null, "", "/auth"); // Update URL
    } catch (error: any) {
      setMessage(`Error signing out: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const navigateToPage = (page: string) => {
    setCurrentPage(page);
  };

  // Handle importing trades from CSV/Excel - Moved to AppContent
  const handleImportTrades = async (importedTrades: Partial<Trade>[]) => {
    if (!db || !userId) {
      setMessage("User not authenticated or database not ready.");
      setShowMessageBox(true);
      return;
    }
    try {
      const tradesCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/trades`
      );
      for (const tradeData of importedTrades) {
        // Assign default pnl and status for imported trades if not present
        const pnl = tradeData.pnl !== undefined ? tradeData.pnl : 0;
        const status = tradeData.status || "Open"; // Assuming imported trades are open unless specified

        await addDoc(tradesCollectionRef, { ...tradeData, pnl, status });
      }
      setMessage(`${importedTrades.length} trades imported successfully!`);
      setShowMessageBox(true);
    } catch (error: any) {
      console.error("Error importing trades:", error);
      setMessage(`Failed to import trades: ${error.message}`);
      setShowMessageBox(true);
    }
  };

  const renderPage = () => {
    if (!isAuthReady) {
      return <LoadingSpinner />;
    }

    if (!currentUser && currentPage !== "auth") {
      // If not authenticated, always show auth page unless explicitly navigating there
      return <AuthPage onAuthSuccess={() => navigateToPage("dashboard")} />;
    }

    switch (currentPage) {
      case "auth":
        return <AuthPage onAuthSuccess={() => navigateToPage("dashboard")} />;
      case "dashboard":
        return <Dashboard />;
      case "stats":
        return <Stats />; // Render the new Stats component
      case "reports":
        return <Reports onImportTrades={handleImportTrades} />; // Pass the actual import function
      case "calendar":
        return <Calendar trades={trades} />; // Pass fetched trades to Calendar
      case "strategies":
        return <Strategies />; // Render the new Strategies component
      case "settings":
      case "profile": // Both settings and profile will render the Profile component
        return <Profile />;
      case "help":
        return (
          <div className="flex-grow p-6 bg-gray-900 text-white">
            {" "}
            <h1 className="text-4xl font-extrabold mb-8">
              Help Page (Under Construction)
            </h1>{" "}
            <p>Find help and support here.</p>{" "}
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans antialiased">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        `}
      </style>
      <script src="https://cdn.tailwindcss.com"></script>

      {currentUser ? (
        <div className="flex">
          <Sidebar
            onNavigate={navigateToPage}
            onNewTrade={() => setIsNewTradeModalOpen(true)}
            onNewSetup={() => setIsNewSetupModalOpen(true)}
            onNewNote={() => setIsNewNoteModalOpen(true)}
            onSignOut={handleSignOut}
            currentPage={currentPage}
          />
          <main className="flex-grow">{renderPage()}</main>
        </div>
      ) : (
        <main>{renderPage()}</main>
      )}

      {isNewTradeModalOpen && (
        <NewTradeModal
          isOpen={isNewTradeModalOpen}
          onClose={() => setIsNewTradeModalOpen(false)}
          onSave={async (tradeData, orders, additionalData) => {
            // This function is passed down from Dashboard, so it needs to be defined there.
            // For now, it's a placeholder. The actual saving happens in Dashboard.
            console.log(
              "New trade to save:",
              tradeData,
              orders,
              additionalData
            );
            // This will be handled by the onSave prop in Dashboard
          }}
          strategies={strategies} // Pass strategies to NewTradeModal
        />
      )}

      {isNewSetupModalOpen && (
        <NewSetupModal
          isOpen={isNewSetupModalOpen}
          onClose={() => setIsNewSetupModalOpen(false)}
          onImportTrades={handleImportTrades} // Pass the actual import function
        />
      )}

      {isNewNoteModalOpen && (
        <NewNoteModal
          isOpen={isNewNoteModalOpen}
          onClose={() => setIsNewNoteModalOpen(false)}
        />
      )}

      {showMessageBox && (
        <MessageBox
          message={message}
          onClose={() => setShowMessageBox(false)}
          type="alert"
        />
      )}
    </div>
  );
};

// The actual App component that is exported, now wrapping AppContent with AuthProvider
const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
