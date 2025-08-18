import { useContext } from "react";
import { AuthContext } from "@/lib/auth";
import MaintenanceManage from "./maintenance-manage";

export default function Maintenance() {
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the maintenance management system.</p>
          <a href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return <MaintenanceManage />;
}
